// The profile pictures of the creators' YouTube channels, for the Creators
// page. YouTube has no light API for them without a key, but each channel page
// names its picture in its og:image tag, which is read here at build time.
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

// channelUrls: the YouTube channel URLs; returns { url: pictureUrl } for those with a picture
export async function youtubeAvatars(channelUrls, { force = false } = {}) {
  const cache = readCache()
  const now = Date.now()
  const stale = channelUrls.filter(u => {
    const entry = cache[u]
    return force || !entry || !entry.avatar || now - entry.at > MAX_AGE_DAYS * 86_400_000
  })
  let fetched = 0
  let failed = 0
  await Promise.all(stale.map(async url => {
    const avatar = await fetchAvatar(url)
    if (avatar) { cache[url] = { avatar, at: now }; fetched++ } else failed++
  }))
  if (fetched > 0) writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n')
  if (stale.length > 0) console.log(`YouTube avatars: ${fetched} fetched, ${failed} failed (kept the last known), ${channelUrls.length - stale.length} up to date.`)
  return Object.fromEntries(channelUrls.filter(u => cache[u] && cache[u].avatar).map(u => [u, cache[u].avatar]))
}

// run by hand: refreshes the creators' channels whatever their age
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const creatorDir = 'assets/data/creator'
  const { readdirSync } = await import('fs')
  const urls = readdirSync(creatorDir).filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(`${creatorDir}/${f}`, 'utf8')))
    .filter(c => c.youtube_channel_url && !c.twitch_channel_url)
    .map(c => c.youtube_channel_url)
  console.log(await youtubeAvatars(urls, { force: true }))
}
