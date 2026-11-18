// The content creators' pictures, by name: their YouTube picture, else their Twitch one.
// Asked once, kept for the session. Creators with none are left out.
let kept = null
export function creatorAvatars() {
  if (!kept) {
    kept = fetch('/data/creators.json').then(r => r.json()).then(creators => Object.fromEntries(
      creators.map(c => [c.name, c.youtube_avatar_url || c.twitch_avatar_url]).filter(([, url]) => url),
    )).catch(() => { kept = null; return {} })
  }
  return kept
}
