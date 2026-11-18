import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSettings } from '../utils/settings'
import { registerPreviewCard } from '../utils/videoPreviews'

// Who of the creators is live on Twitch right now, as tiles. Everything comes
// from DecAPI (https://docs.decapi.me/twitch), which needs no key and allows
// calls from the browser:
//   uptime       whether a channel is live, and for how long
//   title, game, viewercount   the stream's details, asked for the live ones
//   avatar, followcount        the channel's profile picture and followers
//   multi        one page to watch several streams side by side (multistre.am,
//                which DecAPI's /multi points to)
// The thumbnails are Twitch's own live previews. The live status is checked
// again every minute while the page is open; the rest is fetched once and kept
// for an hour (DecAPI allows 100 calls a minute).

const REFRESH_MS = 60_000
const DETAILS_TTL_MS = 60 * 60_000
const DECAPI = 'https://decapi.me/twitch'

const text = url => fetch(url).then(r => (r.ok ? r.text() : null)).then(t => (t == null ? null : t.trim())).catch(() => null)

// DecAPI answers a problem with a sentence ("<channel> is offline", "User not found"…)
const isProblem = t => !t || /offline|not found|error|invalid|unable|does not exist|\[DecAPI/i.test(t)

// The channel's name from its URL: https://www.twitch.tv/Sprat3k -> sprat3k
function channelOf(url) {
  const match = typeof url === 'string' && url.match(/twitch\.tv\/([A-Za-z0-9_]+)/)
  return match ? match[1].toLowerCase() : null
}

// The channel's profile picture and followers: they hardly
// change, so they are kept in the session for an hour
const detailsMemory = new Map()
async function channelDetails(login) {
  const key = `twitch-details:${login}`
  const kept = detailsMemory.get(key) || (() => {
    try { return JSON.parse(sessionStorage.getItem(key)) } catch { return null }
  })()
  if (kept && Date.now() - kept.at < DETAILS_TTL_MS) return kept.value
  const [avatar, followers] = await Promise.all([
    text(`${DECAPI}/avatar/${login}`),
    text(`${DECAPI}/followcount/${login}`),
  ])
  const value = {
    avatar: avatar && avatar.startsWith('https://') ? avatar : null,
    followers: followers && /^\d+$/.test(followers) ? Number(followers) : null,
  }
  detailsMemory.set(key, { at: Date.now(), value })
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), value })) } catch { /* no storage: just fetched again */ }
  return value
}

// One channel's stream: null when it is offline, undefined when it can't be told
async function checkChannel(channel) {
  const uptime = await text(`${DECAPI}/uptime/${channel.login}`)
  if (uptime === null) return undefined
  if (isProblem(uptime)) return null
  const [title, game, viewers] = await Promise.all([
    text(`${DECAPI}/title/${channel.login}`),
    text(`${DECAPI}/game/${channel.login}`),
    text(`${DECAPI}/viewercount/${channel.login}`),
  ])
  const count = Number(viewers)
  return {
    uptime,
    title: isProblem(title) ? null : title,
    game: isProblem(game) ? null : game,
    viewers: Number.isFinite(count) ? count : null,
  }
}

// The preview of a stream, as the videos' (components/VideoCard.jsx): Twitch's
// player, muted, over the thumbnail, after the mouse rests on the tile (desktop)
// or for the tile in the middle of the screen (touch, utils/videoPreviews.js).
// Only with the visitor's Autoplay setting on, and not with reduced motion or
// Save-Data. Twitch's player needs a minimum size and the site's hostname.
const PREVIEW_HOVER_MS = 200
const PREVIEW_MAX_MS = 30_000
// Twitch plays a player only when it is rendered at a real size of about 400 px
// or more: one scaled down with CSS never starts. So the player is as wide as the
// tile, or MIN_PLAYER_WIDTH when the tile is narrower, then cropped to the tile
// around its centre.
const MIN_PLAYER_WIDTH = 420

// Twitch's embed API, loaded once. The player's own autoplay is held back when
// it is small (below about 400x300 on the screen), which the tiles are: it is
// started with play() once it is ready, which works at any size when muted.
let embedApi = null
function loadEmbedApi() {
  if (window.Twitch && window.Twitch.Player) return Promise.resolve(window.Twitch)
  if (!embedApi) {
    embedApi = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://player.twitch.tv/js/embed/v1.js'
      script.onload = () => resolve(window.Twitch)
      script.onerror = () => { embedApi = null; reject(new Error('Twitch player not loaded')) }
      document.head.appendChild(script)
    })
  }
  return embedApi
}

function previewMode() {
  if (!getSettings().videos.previews) return null
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
  if (navigator.connection && navigator.connection.saveData) return null
  return window.matchMedia('(hover: none)').matches ? 'touch' : 'hover'
}

const compact = n => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n))

function Avatar({ src, name, className }) {
  const [failed, setFailed] = useState(null)
  return src && failed !== src
    ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(src)}
        className={`${className} rounded-full object-cover bg-gray-900`} />
    : <span aria-hidden="true" className={`${className} flex items-center justify-center rounded-full bg-gray-700 text-gray-300 font-bold`}>{name.slice(0, 1).toUpperCase()}</span>
}

export function LiveTile({ channel, stream, details, minute }) {
  const thumbRef = useRef(null)
  const hoverTimer = useRef(null)
  const [mode] = useState(previewMode)
  const [previewing, setPreviewing] = useState(false)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  // the player's size and position in the tile
  const [box, setBox] = useState({ width: MIN_PLAYER_WIDTH, height: 236, left: 0, top: 0 })
  const playerRef = useRef(null)

  const start = () => {
    if (thumbRef.current) {
      const tileWidth = thumbRef.current.clientWidth
      const tileHeight = thumbRef.current.clientHeight
      const width = Math.max(tileWidth, MIN_PLAYER_WIDTH)
      const height = Math.round(width * 9 / 16)
      setBox({ width, height, left: -Math.round((width - tileWidth) / 2), top: -Math.round((height - tileHeight) / 2) })
    }
    setPreviewing(true)
  }

  useEffect(() => {
    if (mode !== 'touch') return
    return registerPreviewCard(thumbRef.current, on => (on ? start() : setPreviewing(false)))
  }, [mode])

  // the player, started once ready; a preview doesn't go on for ever
  useEffect(() => {
    if (!previewing) { setReady(false); setPlaying(false); return }
    let alive = true
    let retry = null
    const host = playerRef.current
    loadEmbedApi().then(Twitch => {
      if (!alive || !host) return
      const player = new Twitch.Player(host, {
        channel: channel.login, parent: [window.location.hostname], muted: true, autoplay: true,
        width: box.width, height: box.height,
      })
      // play() straight on ready is sometimes ignored: ask again until it plays
      const tryPlay = (left = 20) => {
        if (!alive || left === 0) return
        player.setMuted(true)
        if (player.isPaused()) {
          player.play()
          retry = setTimeout(() => tryPlay(left - 1), 500)
        }
      }
      player.addEventListener(Twitch.Player.READY, () => {
        if (!alive) return
        tryPlay()
        setReady(true)
      })
      player.addEventListener(Twitch.Player.PLAYBACK_BLOCKED, () => tryPlay())
      // playing: the clicks go to the tile again
      player.addEventListener(Twitch.Player.PLAYING, () => { if (alive) setPlaying(true) })
    }).catch(() => {})
    const t = setTimeout(() => setPreviewing(false), PREVIEW_MAX_MS)
    return () => { alive = false; clearTimeout(t); clearTimeout(retry); if (host) host.innerHTML = "" }
  }, [previewing, channel.login])

  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  const onEnter = () => { if (mode === 'hover') hoverTimer.current = setTimeout(start, PREVIEW_HOVER_MS) }
  const onLeave = () => { clearTimeout(hoverTimer.current); if (mode === 'hover') setPreviewing(false) }

  return (
    <a href={channel.url} target="_blank" rel="noreferrer"
      className="group block overflow-hidden rounded-xl border border-gray-700 bg-gray-800 hover:border-amber-400/50 transition-colors">
      <div ref={thumbRef} onMouseEnter={onEnter} onMouseLeave={onLeave} className="relative aspect-video overflow-hidden bg-gray-900">
        <img src={`https://static-cdn.jtvnw.net/previews-ttv/live_user_${channel.login}-440x248.jpg?t=${minute}`}
          alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {/* The player, on top of the thumbnail and clickable until it plays. Twitch holds
            the autoplay back for a player that is hidden (opacity), covered by other
            elements (so the badges below are hidden meanwhile) or not the element at its position. */}
        {previewing && (
          <div ref={playerRef} aria-hidden="true"
            style={{ width: box.width, height: box.height, left: box.left, top: box.top }}
            className={`absolute ${playing ? 'pointer-events-none' : ''}`} />
        )}
        <div className={previewing ? 'invisible' : ''}>
          <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">Live</span>
          {stream.viewers != null && (
            <span className="absolute right-2 top-2 rounded bg-gray-900/85 px-1.5 py-0.5 text-xs text-gray-100">
              <span className="text-red-400">●</span> {stream.viewers}
            </span>
          )}
          <span className="absolute bottom-2 right-2 rounded bg-gray-900/85 px-1.5 py-0.5 text-xs text-gray-300">{stream.uptime}</span>
        </div>
      </div>
      <div className="flex gap-3 p-3">
        <Avatar src={details && details.avatar} name={channel.name} className="h-10 w-10 shrink-0" />
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-white group-hover:text-amber-400 transition-colors">{channel.name}</div>
          {stream.title && <div className="mt-0.5 line-clamp-2 text-sm text-gray-300">{stream.title}</div>}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
            {stream.game && <span className="truncate">{stream.game}</span>}
            {details && details.followers != null && <span>{compact(details.followers)} followers</span>}
          </div>
        </div>
      </div>
    </a>
  )
}

// Who is live, checked every minute while the page is open. hidden: Set of the
// creators' names to leave out (the visitor's hidden creators). withDetails:
// also fetch the live channels' pictures and followers (for the tiles).
// streams is null until the first check is done.
export function useLiveStreams(hidden, withDetails = true) {
  const [channels, setChannels] = useState(null)
  // by channel: the stream when live, null when not
  const [streams, setStreams] = useState(null)
  const [details, setDetails] = useState({})
  const [minute, setMinute] = useState(() => Math.floor(Date.now() / 60_000))

  useEffect(() => {
    fetch('/data/creators.json').then(r => r.json()).then(creators => {
      const seen = new Set()
      const list = []
      for (const c of creators) {
        const login = channelOf(c.twitch_channel_url)
        if (!login || seen.has(login) || (hidden && hidden.has(c.name))) continue
        seen.add(login)
        list.push({ login, name: c.name, url: c.twitch_channel_url })
      }
      setChannels(list)
    }).catch(() => setChannels([]))
  }, [hidden])

  // who is live, every minute
  useEffect(() => {
    if (!channels) return
    let alive = true
    const check = async () => {
      const found = await Promise.all(channels.map(async c => [c.login, await checkChannel(c)]))
      if (!alive) return
      // the channels that couldn't be checked keep their last status
      setStreams(prev => Object.fromEntries(found.map(([login, stream]) => [login, stream === undefined ? (prev && prev[login]) || null : stream])))
      setMinute(Math.floor(Date.now() / 60_000))
    }
    check()
    const timer = setInterval(() => { if (!document.hidden) check() }, REFRESH_MS)
    return () => { alive = false; clearInterval(timer) }
  }, [channels])

  // the pictures and followers of the channels that are live, once each
  const liveLogins = streams ? Object.keys(streams).filter(login => streams[login]).join(',') : ''
  useEffect(() => {
    if (!withDetails || !liveLogins) return
    let alive = true
    liveLogins.split(',').forEach(login => channelDetails(login).then(d => {
      if (alive) setDetails(prev => ({ ...prev, [login]: d }))
    }))
    return () => { alive = false }
  }, [liveLogins, withDetails])

  const liveCount = streams ? Object.values(streams).filter(Boolean).length : 0
  return { channels, streams, details, minute, liveCount }
}

// hidden: Set of the creators' names to leave out (the visitor's hidden creators)
export default function LiveStreams({ hidden }) {
  const { channels, streams, details, minute } = useLiveStreams(hidden)
  if (!streams) return <p className="text-gray-400 text-sm py-8 text-center">Checking who is live…</p>

  const live = channels.filter(c => streams[c.login]).sort((a, b) => (streams[b.login].viewers ?? 0) - (streams[a.login].viewers ?? 0))

  return (
    <div>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            {live.length === 0 ? 'Nobody is live' : `${live.length} live`} of {channels.length} Twitch channels, checked every minute.
          </p>
          {live.length > 1 && (
            <a href={`https://multistre.am/${live.map(c => c.login).join('/')}/`} target="_blank" rel="noreferrer"
              className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-xs text-gray-300 hover:border-amber-400/50 hover:text-amber-400 transition-colors">
              Watch all {live.length} together ↗
            </a>
          )}
        </div>
        {live.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">
            Nobody is streaming right now. The channels are also on the <Link to="/creators" className="text-amber-400 hover:underline">Creators page</Link>.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {live.map(c => <LiveTile key={c.login} channel={c} stream={streams[c.login]} details={details[c.login]} minute={minute} />)}
          </div>
        )}
      </section>

    </div>
  )
}
