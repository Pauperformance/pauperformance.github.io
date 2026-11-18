// What the Watch page shows: any of videos, live streams, shorts and podcasts, together.
// types: the Set (or array) of the ones picked, from 'videos', 'live', 'shorts', 'podcasts'.
// None picked means the videos and the shorts, as for the other filters of the page.

export const WATCH_TYPES = [['videos', 'Videos'], ['live', 'Live'], ['shorts', 'Shorts'], ['podcasts', 'Podcasts']]

const has = (types, t) => (types instanceof Set ? types.has(t) : types.includes(t))

// whether the live streams are shown
export const showsLive = types => has(types, 'live')

// whether videos (or shorts) are shown: not with Live alone
export const showsVideos = types => has(types, 'videos') || has(types, 'shorts') || has(types, 'podcasts') || !has(types, 'live')

// whether a video is shown: a short only with Shorts, a video (podcasts included)
// with Videos, a podcast also with Podcasts alone (no restriction when none of
// the three is picked)
export function typeAllows(types, video) {
  const wantVideos = has(types, 'videos')
  const wantShorts = has(types, 'shorts')
  const wantPodcasts = has(types, 'podcasts')
  if (!wantVideos && !wantShorts && !wantPodcasts) return true
  if (video.is_short === true) return wantShorts
  return wantVideos || (wantPodcasts && video.is_podcast === true)
}
