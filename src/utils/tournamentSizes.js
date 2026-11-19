import { useState, useEffect } from 'react'

// The players of each tournament, by its name and date (as the decklists name
// it, without the stray spaces): from tournaments.json, fetched once. A name
// two tournaments of a day share is left out, being ambiguous.
let loading = null
export function useTournamentSizes() {
  const [sizes, setSizes] = useState(null)
  useEffect(() => {
    if (!loading) {
      loading = fetch('/data/tournaments.json').then(r => r.json()).then(rows => {
        const map = new Map()
        for (const [, date, name, players] of rows) {
          const key = `${(name || '').trim()}|${date}`
          map.set(key, map.has(key) ? null : players)
        }
        return map
      }).catch(() => { loading = null; return new Map() })
    }
    let alive = true
    loading.then(m => { if (alive) setSizes(m) })
    return () => { alive = false }
  }, [])
  return sizes
}

// The players of a deck's tournament, if known.
export function playersOf(sizes, deck) {
  return sizes?.get(`${(deck.tournament_name || '').trim()}|${deck.tournament_date}`) || undefined
}
