// Whether a YouTube live stream is on the air right now, found by pretending to play it.
// There is no key-free API for that, but the embedded player tells its parent page, through
// the IFrame API's postMessage events (enablejsapi=1), what it is doing: a stream that is on
// the air goes from unstarted (-1) to buffering (3) and playing (1) within a couple of
// seconds, while an ended one (the player says "Live stream offline") stays unstarted.
// So the probe is a hidden, muted player: 'live' once it buffers or plays, 'offline' if it
// is still unstarted after a few seconds, 'unknown' when it can't be told (the browser
// blocks autoplay, embedding is off, the video is private...).
// It doesn't depend on the visitor's preview/autoplay settings: nothing shows or sounds.

const TIMEOUT_MS = 8000
const CONCURRENCY = 3
const KEEP_MS = 5 * 60_000
// a live stream older than this is not probed: it ended long ago (or never ends: unknown)
export const PROBE_MAX_AGE_DAYS = 7

const memory = new Map() // video_id -> { status, at }
const pending = new Map() // video_id -> Promise
const queue = []
let running = 0

const read = id => {
  const hit = memory.get(id)
  if (hit && Date.now() - hit.at < KEEP_MS) return hit.status
  try {
    const kept = JSON.parse(sessionStorage.getItem(`live-probe:${id}`))
    if (kept && Date.now() - kept.at < KEEP_MS) { memory.set(id, kept); return kept.status }
  } catch { /* no storage */ }
  return null
}

const keep = (id, status) => {
  const entry = { status, at: Date.now() }
  memory.set(id, entry)
  try { sessionStorage.setItem(`live-probe:${id}`, JSON.stringify(entry)) } catch { /* no storage */ }
}

// browsers that tell whether a muted video may start on its own: when not, a stream
// that stays unstarted proves nothing
const autoplayBlocked = () => {
  try { return navigator.getAutoplayPolicy?.('mediaelement') === 'disallowed' } catch { return false }
}

function probe(id) {
  return new Promise(resolve => {
    const frame = document.createElement('iframe')
    let done = false
    const finish = status => {
      if (done) return
      done = true
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      frame.remove()
      resolve(status)
    }
    const onMessage = e => {
      if (e.source !== frame.contentWindow) return
      let data
      try { data = JSON.parse(e.data) } catch { return }
      if (data.event === 'onError') return finish('unknown')
      // not initialDelivery: its state is a placeholder (3) before the video is even loaded
      if (data.event !== 'infoDelivery' && data.event !== 'onStateChange') return
      const state = data.event === 'onStateChange' ? data.info : data.info && data.info.playerState
      if (state === 3 || state === 1) finish('live')
    }
    const timer = setTimeout(() => finish(autoplayBlocked() ? 'unknown' : 'offline'), TIMEOUT_MS)
    window.addEventListener('message', onMessage)
    frame.title = ''
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.allow = 'autoplay; encrypted-media'
    frame.style.cssText = 'position:fixed;left:0;top:0;width:320px;height:180px;opacity:0.01;pointer-events:none;border:0'
    frame.onload = () => frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id, channel: 'widget' }), '*')
    const params = new URLSearchParams({
      enablejsapi: '1', autoplay: '1', mute: '1', controls: '0', playsinline: '1', origin: location.origin,
    })
    frame.src = `https://www.youtube.com/embed/${id}?${params}`
    document.body.appendChild(frame)
  })
}

function pump() {
  while (running < CONCURRENCY && queue.length) {
    const id = queue.shift()
    running++
    probe(id).then(status => {
      if (status !== 'unknown') keep(id, status)
      pending.get(id)?.resolve(status)
    }).finally(() => { running--; pending.delete(id); pump() })
  }
}

// 'live' | 'offline' | 'unknown'; a few at a time, kept for a few minutes
export function probeLive(id) {
  const kept = read(id)
  if (kept) return Promise.resolve(kept)
  if (pending.has(id)) return pending.get(id).promise
  let resolve
  const promise = new Promise(r => { resolve = r })
  pending.set(id, { promise, resolve })
  queue.push(id)
  pump()
  return promise
}

// what is known without probing: the kept answer, or null
export const knownLive = read

// whether a video is a live stream worth probing: flagged live and recent
export const isProbeable = v =>
  v.is_live === true && !!v.video_id && (Date.now() - Date.parse(v.date)) / 86_400_000 <= PROBE_MAX_AGE_DAYS
