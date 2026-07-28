// Fetches decklists from supported platforms. Both platforms block cross-origin
// browser requests (CORS), so requests are routed through a public CORS proxy.
//
// Moxfield's API is additionally behind Cloudflare bot protection that only allows
// requests carrying a specific registered User-Agent header — and browsers hard-block
// scripts from setting that header on fetch(), so it can't be supplied client-side.
// There's currently no client-only way around this; it would need a small server-side
// proxy that attaches the header itself. Moxfield links are detected and given a clear
// error rather than silently failing.
import { parseDecklistText } from './deckParse'

// corsproxy.io's free tier rejects any request whose Origin isn't localhost, so it
// only works in local dev, not once this is deployed. proxy.cors.sh works from a
// deployed origin without an API key (tested against mtggoldfish.com directly).
const CORS_PROXY = 'https://proxy.cors.sh/'

function viaProxy(url) {
  return CORS_PROXY + url
}

// fetch()'s Response.text() always decodes as UTF-8 regardless of the response's
// declared charset — it silently corrupts non-UTF-8 pages (e.g. mtgtop8 serves
// ISO-8859-1, so "û" becomes a replacement character). Decode manually using the
// charset from the Content-Type header instead.
async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) return { ok: false, res }
  const contentType = res.headers.get('content-type') || ''
  const charset = (contentType.match(/charset=([\w-]+)/i) || [])[1] || 'utf-8'
  const buffer = await res.arrayBuffer()
  return { ok: true, text: new TextDecoder(charset).decode(buffer) }
}

function detectHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function detectSource(input) {
  const trimmed = input.trim()
  if (!/^https?:\/\//i.test(trimmed)) return 'text'
  const host = detectHost(trimmed)
  if (host === 'moxfield.com') return 'moxfield'
  if (host === 'mtggoldfish.com') return 'mtggoldfish'
  if (host === 'topdeck.gg') return 'topdeck'
  if (host === 'mtgtop8.com') return 'mtgtop8'
  if (host === 'archidekt.com') return 'archidekt'
  return 'unsupported'
}

function extractMoxfieldBoard(board) {
  if (!board) return []
  const cards = board.cards || board
  return Object.values(cards)
    .filter(c => c && (c.card || c.name))
    .map(c => ({ name: (c.card && c.card.name) || c.name, qty: c.quantity || c.qty || 1 }))
}

async function fetchMoxfieldDeck(url) {
  const m = url.match(/decks\/([A-Za-z0-9_-]+)/)
  if (!m) throw new Error('Could not find a deck ID in that Moxfield link.')
  const apiUrl = `https://api.moxfield.com/v2/decks/all/${m[1]}`

  let data
  try {
    const res = await fetch(apiUrl)
    if (!res.ok) throw new Error(`status ${res.status}`)
    data = await res.json()
  } catch {
    const res = await fetch(viaProxy(apiUrl))
    if (!res.ok) throw new Error('Moxfield links are not supported yet — paste the decklist as text, or use an MTGGoldfish link instead.')
    data = await res.json()
  }

  const boards = data.boards || data
  return {
    main: extractMoxfieldBoard(boards.mainboard),
    side: extractMoxfieldBoard(boards.sideboard),
  }
}

async function fetchMtgGoldfishDeck(url) {
  const m = url.match(/deck\/(\d+)/)
  if (!m) throw new Error('Could not find a deck ID in that MTGGoldfish link.')
  // /deck/download/<id> is behind Cloudflare; the "create proxies" page isn't,
  // and comes pre-filled with the decklist in a plain-text <textarea>.
  const proxiesUrl = `https://www.mtggoldfish.com/proxies/new?id=${m[1]}`

  const { ok, text: html } = await fetchText(viaProxy(proxiesUrl))
  if (!ok) throw new Error('Failed to fetch the MTGGoldfish deck.')

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const textarea = doc.querySelector('#deck')
  if (!textarea || !textarea.textContent.trim()) throw new Error('Could not find that MTGGoldfish deck.')

  return parseDecklistText(textarea.textContent)
}

// TopDeck.gg deck pages render both an image grid and a plain text list of the
// same cards; the text list uses "<span>qty</span><span>name</span>" pairs inside
// .card-name-text elements, grouped under "Mainboard"/"Sideboard" .section-header's.
function extractTopDeckSections(doc) {
  const nodes = doc.querySelectorAll('.section-header, .card-name-text')
  const sections = { main: [], side: [] }
  let current = 'main'

  nodes.forEach(node => {
    if (node.classList.contains('section-header')) {
      const text = node.textContent.toLowerCase()
      if (text.includes('sideboard')) current = 'side'
      else if (text.includes('mainboard') || text.includes('maindeck')) current = 'main'
      return
    }
    const spans = node.querySelectorAll('span')
    if (spans.length < 2) return
    const qty = parseInt(spans[0].textContent, 10)
    const name = spans[1].textContent.trim()
    if (!qty || !name) return
    sections[current].push({ name, qty })
  })

  return sections
}

async function fetchTopDeckDeck(url) {
  const { ok, text: html } = await fetchText(viaProxy(url))
  if (!ok) throw new Error('Failed to fetch the TopDeck deck.')

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const sections = extractTopDeckSections(doc)
  if (!sections.main.length && !sections.side.length) throw new Error('Could not find that TopDeck deck.')

  return sections
}

// mtgtop8 deck pages render each card as a div whose id is prefixed "md" (mainboard)
// or "sb" (sideboard) followed by the card's set+collector code, e.g. id="mdwwk132" /
// id="sbbng065", with the raw text "<qty> <span class=L14><name></span>".
async function fetchMtgTop8Deck(url) {
  const { ok, text: html } = await fetchText(viaProxy(url))
  if (!ok) throw new Error('Failed to fetch the mtgtop8 deck.')

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const sections = { main: [], side: [] }

  doc.querySelectorAll('div.deck_line[id]').forEach(div => {
    const m = div.textContent.trim().match(/^(\d+)\s+(.+)$/)
    if (!m) return
    const card = { qty: parseInt(m[1], 10), name: m[2].trim() }
    if (div.id.startsWith('md')) sections.main.push(card)
    else if (div.id.startsWith('sb')) sections.side.push(card)
  })

  if (!sections.main.length && !sections.side.length) throw new Error('Could not find that mtgtop8 deck.')
  return sections
}

// Archidekt server-renders the full deck as JSON inside a <script id="__NEXT_DATA__">
// tag (props.pageProps.redux.deck). Cards are tagged with arbitrary user-defined
// categories (deck.categories), and each card's board membership is its FIRST
// category: "Sideboard" means sideboard; otherwise mainboard, unless that category
// itself is excluded from the deck (deck.categories[cat].includedInDeck === false,
// e.g. "Maybeboard" or "Tokens & Extras") in which case the card isn't part of the
// deck at all. Verified against the rendered page's own "Size: N" card count.
async function fetchArchidektDeck(url) {
  const { ok, text: html } = await fetchText(viaProxy(url))
  if (!ok) throw new Error('Failed to fetch the Archidekt deck.')

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const script = doc.querySelector('#__NEXT_DATA__')
  if (!script) throw new Error('Could not find that Archidekt deck.')

  let deck
  try {
    deck = JSON.parse(script.textContent).props.pageProps.redux.deck
  } catch {
    throw new Error('Could not read that Archidekt deck.')
  }

  const categories = deck.categories || {}
  const sections = { main: [], side: [] }

  Object.values(deck.cardMap || {}).forEach(card => {
    const primary = card.categories && card.categories[0]
    if (primary === 'Sideboard') {
      sections.side.push({ name: card.name, qty: card.qty })
    } else if (!primary || (categories[primary] ? categories[primary].includedInDeck : true)) {
      sections.main.push({ name: card.name, qty: card.qty })
    }
  })

  if (!sections.main.length && !sections.side.length) throw new Error('Could not find that Archidekt deck.')
  return sections
}

// Resolves a textarea's raw input into { main: [...], side: [...] },
// fetching remote decklists when the input is a supported platform link.
export async function resolveDecklist(input) {
  const source = detectSource(input)
  if (source === 'text') return parseDecklistText(input)
  if (source === 'moxfield') return fetchMoxfieldDeck(input.trim())
  if (source === 'mtggoldfish') return fetchMtgGoldfishDeck(input.trim())
  if (source === 'topdeck') return fetchTopDeckDeck(input.trim())
  if (source === 'mtgtop8') return fetchMtgTop8Deck(input.trim())
  if (source === 'archidekt') return fetchArchidektDeck(input.trim())
  throw new Error('Unsupported link. Paste a decklist, or a Moxfield / MTGGoldfish / TopDeck / mtgtop8 / Archidekt deck link.')
}
