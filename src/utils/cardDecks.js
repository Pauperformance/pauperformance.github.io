// The /data/card-decks/<slug>.json files list every decklist playing a card:
// millions of rows that repeat the same archetype, pilot and tournament
// strings, so a row would weigh ~190 bytes as an object. The file stores each
// distinct string once and a deck as the numbers pointing at them:
//   { archetypes: [name, ...], pilots: [name, ...], places: [place, ...],
//     tournaments: [[name, date], ...],
//     decks: [[id, archetype, pilot, place, tournament], ...] }
// (an index into the table, or null; an id that is not a canonical integer is
// kept as a string). The decks keep their order. encodeCardDecks is used by
// scripts/build-data.mjs, decodeCardDecks by the app and scripts/check-links.mjs.

export function encodeCardDecks(decks) {
  const tables = { archetypes: new Map(), pilots: new Map(), places: new Map(), tournaments: new Map() }
  const index = (table, key, value) => {
    if (key === null || key === undefined) return null
    let i = table.get(key)
    if (i === undefined) { i = table.size; table.set(key, i) }
    return i
  }
  const rows = decks.map(d => [
    String(Number(d.id)) === d.id ? Number(d.id) : d.id,
    index(tables.archetypes, d.archetype),
    index(tables.pilots, d.pilot),
    index(tables.places, d.place),
    index(tables.tournaments, JSON.stringify([d.tournament_name, d.tournament_date])),
  ])
  return {
    archetypes: [...tables.archetypes.keys()],
    pilots: [...tables.pilots.keys()],
    places: [...tables.places.keys()],
    tournaments: [...tables.tournaments.keys()].map(k => JSON.parse(k)),
    decks: rows,
  }
}

export function decodeCardDecks(data) {
  const { archetypes, pilots, places, tournaments, decks } = data
  const at = (table, i) => i === null ? null : table[i]
  return decks.map(([id, a, p, pl, t]) => ({
    id: String(id),
    archetype: at(archetypes, a),
    pilot: at(pilots, p),
    place: at(places, pl),
    tournament_name: tournaments[t][0],
    tournament_date: tournaments[t][1],
  }))
}
