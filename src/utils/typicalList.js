// The typical list of an archetype over any run of metagames: a port of the
// aggregation in Myr's silver/typical_list.py (as Frank Karsten's aggregate
// decklist). For each card and each k, count the decks playing at least k
// copies, then keep the most common (card, k) pairs: 60 for the maindeck and
// 15 for the sideboard.
//
// Myr exports those counts for each metagame; they add up across metagames,
// so any run of them is aggregated here.

export const MAINDECK_SLOTS = 60
export const SIDEBOARD_SLOTS = 15
// cards played by fewer decks (and not in the aggregate list) are left out
const MIN_PLAY_RATE = 0.05
const MAX_COPIES_BREAKDOWN = 4

// Rounds as Python does, halves to the even one (3.25 -> 3.2), as Myr does
function round(x, digits) {
  const scaled = x * 10 ** digits
  const floor = Math.floor(scaled)
  const n = scaled - floor === 0.5 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(scaled)
  return n / 10 ** digits
}

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

// Adds the counts of metagames: [{ card: [n1, n2...] }] -> Map card -> [n1, n2...]
export function sumCounts(boards) {
  const total = new Map()
  for (const board of boards) {
    for (const [card, perK] of Object.entries(board)) {
      const mine = total.get(card) || []
      perK.forEach((n, k) => { mine[k] = (mine[k] || 0) + n })
      total.set(card, mine)
    }
  }
  return total
}

// How the decks play each card in a board, most played first. counts: Map card
// -> [decks playing at least 1, 2... copies]; info: the cards' link, preview,
// type_line and banned, by name; cards with none (not found in Scryfall) are
// left out, as Myr does.
export function aggregate(counts, decks, slots, info) {
  if (!decks) return []
  const pairs = []
  for (const [card, perK] of counts) {
    perK.forEach((n, i) => { if (n > 0) pairs.push([n, i + 1, card]) })
  }
  pairs.sort((a, b) => b[0] - a[0] || a[1] - b[1] || compare(a[2], b[2]))
  const typical = new Map()
  for (const [, , card] of pairs.slice(0, slots)) typical.set(card, (typical.get(card) || 0) + 1)
  const usages = []
  for (const [card, perK] of counts) {
    if (!info[card]) continue
    const inList = typical.get(card) || 0
    if (!inList && perK[0] / decks < MIN_PLAY_RATE) continue
    const copies = perK.reduce((a, b) => a + b, 0)
    usages.push({
      name: card,
      ...info[card],
      typical: inList,
      at_least: Array.from({ length: MAX_COPIES_BREAKDOWN }, (_, k) => round((perK[k] || 0) / decks, 3)),
      average: round(copies / perK[0], 1),
    })
  }
  return usages.sort((a, b) => b.typical - a.typical || b.at_least[0] - a.at_least[0] || compare(a.name, b.name))
}

// The typical list of the metagames timeline[from..to] (indexes, inclusive).
// timeline: the archetype's metagames, oldest first, each with the archetype's
// decks in it; counts: { by_metagame: { code: { main, side } }, cards }.
export function computeTypicalList(timeline, counts, from, to) {
  const run = timeline.slice(from, to + 1)
  const decks = run.reduce((n, m) => n + (m.decks || 0), 0)
  const boards = board => sumCounts(run.map(m => counts.by_metagame[m.metagame]?.[board] || {}))
  return {
    decks,
    main: aggregate(boards('main'), decks, MAINDECK_SLOTS, counts.cards),
    side: aggregate(boards('side'), decks, SIDEBOARD_SLOTS, counts.cards),
  }
}

// The bans of cards the archetype played that start a metagame inside the
// run, after its first one (the decks before it are not in the run):
// [{ metagame, cards }]. bans: { code: [cards] }.
export function bansCrossed(timeline, bans, from, to) {
  return timeline.slice(from + 1, to + 1)
    .filter(m => bans[m.metagame])
    .map(m => ({ metagame: m, cards: bans[m.metagame] }))
}
