// The date chips of the filters: "Last week" and so on, each the first day to show (today
// included), computed when picked. The Watch page has shorter ones, the others longer.
const LAST = {
  'Last day': d => d.setDate(d.getDate() - 1),
  'Last 2 days': d => d.setDate(d.getDate() - 2),
  'Last week': d => d.setDate(d.getDate() - 7),
  'Last month': d => d.setMonth(d.getMonth() - 1),
  'Last 3 months': d => d.setMonth(d.getMonth() - 3),
  'Last year': d => d.setFullYear(d.getFullYear() - 1),
}

// the chips of the lists of decks, tournaments and videos of an archetype, family, card or player
export const LONG_RANGES = ['Last 2 days', 'Last week', 'Last month', 'Last 3 months', 'Last year']
// the chips of the Watch page
export const WATCH_RANGES = ['Last day', 'Last 2 days', 'Last week', 'Last month']

// YYYY-MM-DD of a Date in the visitor's own time zone (toISOString would be UTC)
export function localIso(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// the first day of the chip picked (its label), '' for none
export function rangeStart(label) {
  if (!LAST[label]) return ''
  const d = new Date()
  LAST[label](d)
  return localIso(d)
}
