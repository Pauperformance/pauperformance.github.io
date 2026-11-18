// What the Watch page shows: any of videos, live streams, shorts and podcasts, together.
// types: the Set (or array) of the ones picked, from 'videos', 'live', 'shorts', 'podcasts'.
// None picked means the videos and the shorts, as for the other filters of the page.

export const WATCH_TYPES = [['videos', 'Videos'], ['live', 'Live'], ['shorts', 'Shorts'], ['podcasts', 'Podcasts']]

const has = (types, t) => (types instanceof Set ? types.has(t) : types.includes(t))

// whether the live streams are shown
export const showsLive = types => has(types, 'live')

// whether Live alone leaves the plain videos out (the Home page then falls back to
// the default videos); the Watch page shows the past lives with it instead
export const showsVideos = types => has(types, 'videos') || has(types, 'shorts') || has(types, 'podcasts') || !has(types, 'live')

// whether a video is shown: a short only with Shorts, a video (podcasts included)
// with Videos, a podcast also with Podcasts alone, a live stream (past or not) also
// with Live alone (no restriction when none of the four is picked). onAir(video),
// when given, tells whether a live stream is still on the air: with Live alone the
// ones that have ended are left out.
export function typeAllows(types, video, onAir) {
  const wantVideos = has(types, 'videos')
  const wantShorts = has(types, 'shorts')
  const wantPodcasts = has(types, 'podcasts')
  const wantLive = has(types, 'live')
  if (!wantVideos && !wantShorts && !wantPodcasts && !wantLive) return true
  const live = wantLive && video.is_live === true && (!onAir || onAir(video))
  if (video.is_short === true) return wantShorts || live
  return wantVideos || (wantPodcasts && video.is_podcast === true) || live
}
