// A place as the pages show it: a plain number (MTGTop8's way) as an ordinal,
// like the other sources write them; ranges and win-loss records as they are.
export function displayPlace(place) {
  if (!place) return null
  if (!/^\d+$/.test(place)) return place
  const n = parseInt(place)
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')
  return n + suffix
}
