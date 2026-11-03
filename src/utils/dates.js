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

// iso: a UTC timestamp such as 2026-11-03T10:13:31+00:00 (it carries its
// offset, so new Date() parses it right). Shown in the viewer's time zone, with
// its name: "Nov 3, 2026, 11:13 AM GMT+1". Anything else is returned unchanged.
export function formatDateTime(iso) {
  const date = typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(iso) ? new Date(iso) : null
  if (!date || Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
}
