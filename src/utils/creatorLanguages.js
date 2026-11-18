import { LANG_CANONICAL } from './languages'

// The language each content creator speaks, by name: the one most of their videos are in
// (the creators' data has no language of its own). Asked once, kept for the session.
let kept = null
export function creatorLanguages() {
  if (!kept) {
    kept = fetch('/data/videos.json').then(r => r.json()).then(videos => {
      const counts = {}
      for (const v of videos) {
        const lang = LANG_CANONICAL[v.language] ?? v.language
        if (!v.creator_name || !lang) continue
        const c = (counts[v.creator_name] ||= {})
        c[lang] = (c[lang] || 0) + 1
      }
      return Object.fromEntries(Object.entries(counts).map(([name, c]) => [name, Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]]))
    }).catch(() => { kept = null; return {} })
  }
  return kept
}
