// What the Watch page shows: any of videos, live streams and shorts, together.
// types: the Set (or array) of the ones picked, from 'videos', 'live', 'shorts'.
// None picked means the videos and the shorts, as for the other filters of the page.

export const WATCH_TYPES = [['videos', 'Videos'], ['live', 'Live'], ['shorts', 'Shorts']]

const has = (types, t) => (types instanceof Set ? types.has(t) : types.includes(t))

// whether the live streams are shown
export const showsLive = types => has(types, 'live')

// whether videos (or shorts) are shown: not with Live alone
export const showsVideos = types => has(types, 'videos') || has(types, 'shorts') || !has(types, 'live')

// whether a video is shown: a short only with Shorts, a video only with Videos
// (no restriction when neither is picked)
export function typeAllows(types, video) {
  const wantVideos = has(types, 'videos')
  const wantShorts = has(types, 'shorts')
  if (!wantVideos && !wantShorts) return true
  return video.is_short === true ? wantShorts : wantVideos
}
