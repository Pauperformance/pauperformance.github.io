// Dates are stored as YYYY-MM-DD (sorted and filtered as strings) and shown
// as "February 4, 2026", or "Feb 4, 2026" where space is short.
//
// The string is split rather than parsed with new Date(), which reads it as
// UTC midnight: west of Greenwich that is still the day before.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// iso: YYYY-MM-DD. short: the month cropped to its first three letters.
// Anything else (missing, already formatted) is returned unchanged.
export function formatDate(iso, { short = false } = {}) {
  const match = typeof iso === 'string' && iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return iso
  const [, year, month, day] = match
  const name = MONTHS[Number(month) - 1]
  if (!name) return iso
  return `${short ? name.slice(0, 3) : name} ${Number(day)}, ${year}`
}

export function formatShortDate(iso) {
  return formatDate(iso, { short: true })
}
