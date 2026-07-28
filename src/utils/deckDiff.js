// Computes card-count differences between two parsed decklists.
// A positive delta means deck B has more copies than deck A.

function toMap(cards) {
  const map = new Map()
  cards.forEach(({ name, qty }) => map.set(name, (map.get(name) || 0) + qty))
  return map
}

function mergeCards(...lists) {
  return lists.flat()
}

function diffCardLists(cardsA, cardsB) {
  const mapA = toMap(cardsA)
  const mapB = toMap(cardsB)
  const names = new Set([...mapA.keys(), ...mapB.keys()])

  return Array.from(names)
    .map(name => ({ name, delta: (mapB.get(name) || 0) - (mapA.get(name) || 0) }))
    .filter(({ delta }) => delta !== 0)
    .sort((a, b) => (b.delta > 0) - (a.delta > 0) || a.name.localeCompare(b.name))
}

// mode: 'split' diffs mainboard and sideboard independently;
// 'unified' treats each deck's 75 cards as one pool.
export function diffDecks(deckA, deckB, mode) {
  if (mode === 'unified') {
    return {
      unified: diffCardLists(mergeCards(deckA.main, deckA.side), mergeCards(deckB.main, deckB.side)),
    }
  }
  return {
    main: diffCardLists(deckA.main, deckB.main),
    side: diffCardLists(deckA.side, deckB.side),
  }
}
