// The websites tournaments are fetched from, as the data names them. Adding a
// source is adding it here (and to Myr).
export const SOURCE_LABEL = {
  mtggoldfish: 'MTGGoldfish',
  mtgtop8: 'MTGTop8',
  waybackmachine: 'Wayback Machine',
}

export const sourceLabel = source => SOURCE_LABEL[source] || source

// Where a deck's own page is, from its url.
export function sourceOfUrl(url) {
  if (!url) return null
  if (url.startsWith('https://web.archive.org/')) return 'waybackmachine'
  if (url.includes('mtgtop8.com')) return 'mtgtop8'
  return 'mtggoldfish'
}
