// A place as the pages show it: a plain number (MTGTop8's way) as an ordinal,
// like the other sources write them; ranges and win-loss records as they are.
export function displayPlace(place) {
  if (!place) return null
  if (!/^\d+$/.test(place)) return place
  const n = parseInt(place)
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')
  return n + suffix
}

// The results a list of decks can be filtered by, [key, label]
export const RESULTS = [['undefeated', 'Undefeated'], ['winner', 'Winner'], ['top4', 'Top4'], ['top8', 'Top8']]

// Whether a place (as the sources give it) is the result `key` (see RESULTS; '' for any).
// A place is an ordinal or a plain number ("1st", "12"), a bracket ("5-8": places 5 to 8, as
// MTGTop8 writes them), or a win-loss record with spaces ("5 - 0", as MTGGoldfish writes
// them). A bracket or a place is in the Top N when all of it is; a record has no place, so it is
// only Undefeated (no loss, at least 3 wins).
export function resultMatches(place, key) {
  if (!key) return true
  const text = String(place || '').trim()
  let m = text.match(/^(\d+)\s+-\s+(\d+)$/)
  if (m) return key === 'undefeated' && +m[2] === 0 && +m[1] >= 3
  m = text.match(/^(\d+)-(\d+)$/)
  const worst = m ? +m[2] : (text.match(/^(\d+)(?:st|nd|rd|th)?$/) || [])[1]
  if (worst === undefined) return false
  const n = +worst
  if (key === 'winner') return n === 1
  const top = { top4: 4, top8: 8 }[key]
  return top !== undefined && n <= top
}
