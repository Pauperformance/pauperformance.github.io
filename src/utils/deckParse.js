// Parses plain-text decklists (MTGO/Arena/MTGGoldfish/Moxfield export style) into
// { main: [{ name, qty }], side: [{ name, qty }] }.

const SECTION_HEADERS = {
  main: ['deck', 'maindeck', 'mainboard', 'main deck'],
  side: ['sideboard', 'side board'],
}

function stripAnnotations(name) {
  return name
    // trailing set code + collector number, e.g. "(2X2) 141" or "[MH2] 12"
    .replace(/\s*[([{][A-Za-z0-9]{2,6}[)\]}]\s*[\w-]*\s*$/, '')
    // trailing bare collector number, e.g. "Lightning Bolt 141"
    .replace(/\s+#?\d+\s*$/, '')
    .trim()
}

function parseCardLine(line) {
  const m = line.match(/^(\d+)\s*x?\s+(.+)$/i)
  if (!m) return null
  const qty = parseInt(m[1], 10)
  const name = stripAnnotations(m[2].trim())
  if (!name) return null
  return { qty, name }
}

function addCard(map, name, qty) {
  map.set(name, (map.get(name) || 0) + qty)
}

function toList(map) {
  return Array.from(map.entries()).map(([name, qty]) => ({ name, qty }))
}

export function parseDecklistText(text) {
  const mainMap = new Map()
  const sideMap = new Map()
  let section = 'main'

  const rawLines = text.split('\n').map(l => l.trim())
  let blankSeen = false

  for (const line of rawLines) {
    if (!line) {
      blankSeen = true
      continue
    }
    if (line.startsWith('//') || line.startsWith('#')) continue

    // TopDeck format prefixes section headers with "~", e.g. "~Mainboard" / "~Sideboard".
    const headerKey = line.toLowerCase().replace(/^~/, '').replace(/:$/, '').trim()
    if (SECTION_HEADERS.side.includes(headerKey)) { section = 'side'; continue }
    if (SECTION_HEADERS.main.includes(headerKey)) { section = 'main'; continue }

    let effectiveLine = line
    let forcedSection = null
    const sbMatch = line.match(/^SB:?\s+(.+)$/i)
    if (sbMatch) { forcedSection = 'side'; effectiveLine = sbMatch[1] }

    // A blank line after the maindeck (without an explicit header) conventionally
    // starts the sideboard, matching MTGO/MTGGoldfish plain-text exports.
    if (blankSeen && section === 'main' && !forcedSection && mainMap.size > 0) {
      section = 'side'
    }
    blankSeen = false

    const card = parseCardLine(effectiveLine)
    if (!card) continue

    addCard(forcedSection || section === 'side' ? sideMap : mainMap, card.name, card.qty)
  }

  return { main: toList(mainMap), side: toList(sideMap) }
}

export function isUrl(input) {
  return /^https?:\/\//i.test(input.trim())
}
