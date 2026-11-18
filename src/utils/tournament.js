import { formatDate } from './dates'
import { sourceLabel } from './sources'

// The archetypes of a tournament's classified decks, most played first. Decks no
// archetype claims (yet) are left out of the shares, and counted apart.
export function metagameShares(t) {
  const counts = new Map()
  let classified = 0
  for (const d of t?.decks || []) {
    if (!d.archetype) continue
    classified++
    counts.set(d.archetype, (counts.get(d.archetype) || 0) + 1)
  }
  const shares = [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([archetype_name, n]) => ({ archetype_name, meta_share: (n / classified) * 100 }))
  return { shares, classified }
}

// The sources that have a tournament, once each: a source that lists the event
// twice (its second listing is marked `duplicate`) is still one source.
export function distinctSources(t) {
  return [...new Set((t?.sources || []).map(s => s.source))]
}

// The listings to link to: the duplicates of the kept one are not linked again.
export function listedSources(t) {
  return (t?.sources || []).filter(s => !s.duplicate)
}

// How the sources of a tournament compare, and what they disagree about, in words
export function sourceComparison(t) {
  if (!t) return { overlap: [], notes: [] }
  const several = distinctSources(t).length > 1
  const overlap = []
  if (several) {
    const multi = t.decks.filter(d => d.copies.length > 1)
    const differ = multi.filter(d => d.match === 'different').length
    if (multi.length) overlap.push(`${multi.length} deck${multi.length !== 1 ? 's are' : ' is'} in more than one source (${multi.length - differ} with the same list${differ ? `, ${differ} with different lists` : ''})`)
    for (const source of distinctSources(t)) {
      const only = t.decks.filter(d => d.copies.length === 1 && d.copies[0].source === source).length
      if (only) overlap.push(`${only} only in ${sourceLabel(source)}`)
    }
  }
  const notes = []
  let placeMismatches = 0
  for (const n of t.discrepancies) {
    if (n.kind === 'date') {
      notes.push(`The sources date this tournament differently (${Object.entries(n.dates).map(([s, d]) => `${sourceLabel(s)}: ${formatDate(d)}`).join(', ')}); the earliest date is shown.`)
    } else if (n.kind === 'several_tournaments') {
      notes.push(`${sourceLabel(n.source)} lists this event as ${n.count} separate tournaments.`)
    } else if (n.kind === 'place_mismatch') {
      placeMismatches++
    } else if (n.kind === 'inconsistent_match') {
      notes.push('Some copies of a deck were matched through another copy rather than directly.')
    } else if (n.kind === 'deck_in_other_tournament') {
      notes.push('A deck of this tournament was also found in another tournament that is not the same event.')
    }
  }
  if (placeMismatches) notes.push(`${placeMismatches} deck${placeMismatches !== 1 ? 's have' : ' has'} places that differ between the sources; the order follows the source that gives the result of the playoff.`)
  const differ = t.decks.filter(d => d.match === 'different').length
  if (differ) notes.push(`${differ} deck${differ !== 1 ? 's are' : ' is'} in several sources with different cards: open the deck to compare them.`)
  if (!t.ranked) notes.push('The decks of this tournament are not ranked (all have the same record, as in a league): they are in the order of the first source.')
  return { overlap, notes }
}
