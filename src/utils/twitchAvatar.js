import { useEffect, useState } from 'react'

// The profile picture of a Twitch channel, from DecAPI (https://docs.decapi.me/twitch,
// no key needed). It hardly ever changes: kept in the session for a day, so a
// visit to a page of channels costs one call a channel at most (DecAPI allows
// 100 calls a minute).

const TTL_MS = 24 * 60 * 60_000
const memory = new Map()

// The channel's name from its URL: https://www.twitch.tv/Sprat3k -> sprat3k
export function twitchChannelOf(url) {
  const match = typeof url === 'string' && url.match(/twitch\.tv\/([A-Za-z0-9_]+)/)
  return match ? match[1].toLowerCase() : null
}

function fetchAvatar(login) {
  const key = `twitch-avatar:${login}`
  if (!memory.has(key)) {
    let kept = null
    try { kept = JSON.parse(sessionStorage.getItem(key)) } catch { /* no storage */ }
    memory.set(key, kept && Date.now() - kept.at < TTL_MS
      ? Promise.resolve(kept.url)
      : fetch(`https://decapi.me/twitch/avatar/${login}`)
          .then(r => (r.ok ? r.text() : null))
          .then(t => {
            const url = t && t.trim().startsWith('https://') ? t.trim() : null
            if (url) { try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), url })) } catch { /* fetched again next time */ } }
            else memory.delete(key)
            return url
          })
          .catch(() => { memory.delete(key); return null }))
  }
  return memory.get(key)
}

// The picture's URL for a channel URL; null while loading, or when it has none
export function useTwitchAvatar(channelUrl) {
  const login = twitchChannelOf(channelUrl)
  const [url, setUrl] = useState(null)
  useEffect(() => {
    setUrl(null)
    if (!login) return
    let alive = true
    fetchAvatar(login).then(u => { if (alive) setUrl(u) })
    return () => { alive = false }
  }, [login])
  return url
}
