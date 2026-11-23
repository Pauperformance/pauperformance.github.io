// The profile pictures of the creators' YouTube and Twitch channels, for the
// Creators page, fetched at build time. YouTube has no light API for them
// without a key, but each channel page names its picture in its og:image tag;
// Twitch pictures come from DecAPI (https://docs.decapi.me/twitch, no key),
// and X ones, the last resort, from unavatar.io.
//
// The pictures are kept in scripts/creator-avatars.json (committed): a channel
// is fetched again only when its entry is missing or older than MAX_AGE_DAYS,
// and one that can't be fetched keeps its last known picture, so a YouTube
// hiccup during a deploy never costs an avatar. Run `node scripts/creator-avatars.mjs`
// to refresh the file by hand (and commit it).

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'

const CACHE_FILE = fileURLToPath(new URL('./creator-avatars.json', import.meta.url))
const MAX_AGE_DAYS = 7
const TIMEOUT_MS = 10_000
const SIZE = 96

function readCache() {
  try { return existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {} } catch { return {} }
}

// The channel's picture, a square of SIZE px, or null
async function fetchAvatar(channelUrl) {
  try {
    const res = await fetch(channelUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(/<meta property="og:image" content="([^"]+)"/)
    if (!match || !/^https:\/\/yt3\.(ggpht|googleusercontent)\.com\//.test(match[1])) return null
    // the page names the 900 px picture: a small one is enough
    return match[1].replace(/=s\d+(-|$)/, `=s${SIZE}$1`)
  } catch {
    return null
  }
}

// The Twitch channel's picture, from DecAPI, or null
async function fetchTwitchAvatar(channelUrl) {
  const match = channelUrl.match(/twitch\.tv\/([A-Za-z0-9_]+)/)
  if (!match) return null
  try {
    const res = await fetch(`https://decapi.me/twitch/avatar/${match[1].toLowerCase()}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return null
    const url = (await res.text()).trim()
    return url.startsWith('https://') ? url : null
  } catch {
    return null
  }
}

// The X account's picture, from unavatar.io, or null. For an account it can't
// read, it answers with a generic favicon instead: only X's own pictures count.
async function fetchXAvatar(profileUrl) {
  const match = profileUrl.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]+)/)
  if (!match) return null
  try {
    const res = await fetch(`https://unavatar.io/x/${match[1]}?json`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return null
    const { url } = await res.json()
    return /^https:\/\/pbs\.twimg\.com\//.test(url) ? url : null
  } catch {
    return null
  }
}

export const youtubeAvatars = (channelUrls, opts) => avatars(channelUrls, fetchAvatar, 'YouTube', opts)
export const twitchAvatars = (channelUrls, opts) => avatars(channelUrls, fetchTwitchAvatar, 'Twitch', opts)
export const xAvatars = (profileUrls, opts) => avatars(profileUrls, fetchXAvatar, 'X', opts)

// channelUrls: the channel URLs; returns { url: pictureUrl } for those with a picture
async function avatars(channelUrls, fetchOne, label, { force = false } = {}) {
  const cache = readCache()
  const now = Date.now()
  const stale = channelUrls.filter(u => {
    const entry = cache[u]
    return force || !entry || !entry.avatar || now - entry.at > MAX_AGE_DAYS * 86_400_000
  })
  let fetched = 0
  let failed = 0
  await Promise.all(stale.map(async url => {
    const avatar = await fetchOne(url)
    if (avatar) { cache[url] = { avatar, at: now }; fetched++ } else failed++
  }))
  if (fetched > 0) writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n')
  if (stale.length > 0) console.log(`${label} avatars: ${fetched} fetched, ${failed} failed (kept the last known), ${channelUrls.length - stale.length} up to date.`)
  return Object.fromEntries(channelUrls.filter(u => cache[u] && cache[u].avatar).map(u => [u, cache[u].avatar]))
}

// run by hand: refreshes the creators' channels whatever their age
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const creatorDir = 'assets/data/creator'
  const { readdirSync } = await import('fs')
  const creators = readdirSync(creatorDir).filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(`${creatorDir}/${f}`, 'utf8')))
  console.log(await youtubeAvatars(creators.filter(c => c.youtube_channel_url && !c.twitch_channel_url).map(c => c.youtube_channel_url), { force: true }))
  console.log(await twitchAvatars(creators.filter(c => c.twitch_channel_url).map(c => c.twitch_channel_url), { force: true }))
  console.log(await xAvatars(creators.filter(c => c.x_url).map(c => c.x_url), { force: true }))
}
