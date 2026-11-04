// Positions of the archetypes on the archetypes index map, from their latest
// typical lists (see archetype-lists.json in build-data.mjs), in [0, 1] x [0, 1]:
// the four game types sit in the corners (Aggro and Control on one diagonal,
// Tempo and Midrange on the other) and each archetype lies between them
// according to how much its list looks like the lists of each type.

// Aggro top-left, Tempo top-right, Control bottom-right, Midrange bottom-left
export const CORNERS = { Aggro: [0, 0], Tempo: [1, 0], Control: [1, 1], Midrange: [0, 1] }
const TYPES = Object.keys(CORNERS)

// Every type counts a little for every archetype: a list that shares cards with
// the Aggro lists only would otherwise sit exactly in the Aggro corner, on top of
// every other such list
const TYPE_FLOOR = 0.05
// How many of the closest archetypes of a type stand for it
const NEAREST = 3
// The likeness to a type is raised to this power, so that a close match counts for more
const POWER = 2

function vectorOf(entry) {
  // nonland cards only
  const v = new Map()
  for (const [card, n] of Object.entries(entry.main)) if (!entry.lands.includes(card)) v.set(card, n)
  return v
}

const norm = v => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0))

function cosine(a, b) {
  let dot = 0
  for (const [c, n] of a) dot += n * (b.get(c) || 0)
  const d = norm(a) * norm(b)
  return d ? dot / d : 0
}

// Spreads the values over [0, 1], ignoring the most extreme 2% on each side
function stretch(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const at = q => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))]
  const lo = at(0.02), hi = at(0.98)
  return values.map(x => Math.min(1, Math.max(0, (x - lo) / (hi - lo || 1))))
}

// Weight of each type around an archetype: how close its list is to the lists of
// the closest archetypes that are only that type (leaving itself out).
function cornerLayout(entries, vectors, opts) {
  const pure = Object.fromEntries(TYPES.map(t => [t, []]))
  entries.forEach((e, i) => { if (e.game_type.length === 1 && pure[e.game_type[0]]) pure[e.game_type[0]].push(i) })
  const likeness = (v, i, t) => {
    const sims = pure[t].filter(j => j !== i).map(j => cosine(v, vectors[j])).sort((a, b) => b - a)
    const top = sims.slice(0, opts.nearest)
    return top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0
  }
  const weights = vectors.map((v, i) => {
    const w = TYPES.map(t => Math.max(likeness(v, i, t), 0) ** opts.power + TYPE_FLOOR)
    const total = w.reduce((a, b) => a + b, 0) || 1
    return w.map(x => x / total)
  })
  const raw = weights.map(w => TYPES.reduce((p, t, k) => [p[0] + w[k] * CORNERS[t][0], p[1] + w[k] * CORNERS[t][1]], [0, 0]))
  return {
    xy: [stretch(raw.map(p => p[0])), stretch(raw.map(p => p[1]))],
    weights,
  }
}

// The positions of some archetypes: { slug: { corners, weights } }
function layoutsOf(lists, slugs, opts) {
  const entries = slugs.map(s => lists[s])
  const { xy: [cx, cy], weights } = cornerLayout(entries, entries.map(vectorOf), opts)
  const r = x => Math.round(x * 1000) / 1000
  return Object.fromEntries(slugs.map((s, i) => [s, { corners: [r(cx[i]), r(cy[i])], weights: weights[i].map(r) }]))
}

// lists: the archetype-lists.json object ({ slug: { name, main, lands, banned, game_type... } }).
// Each point has its place among all the archetypes and, unless its list has
// banned cards, its place among the legal ones alone (the map drawn again without
// the others, so that it fills the frame and the types' reference lists are legal).
export function buildArchetypeMap(lists, options = {}) {
  const opts = { nearest: NEAREST, power: POWER, ...options }
  // brews are left out: they are catch-alls ("Brew Boros"...), not a deck to place
  const slugs = Object.keys(lists).filter(s => !/^Brew( |$)/.test(lists[s].name))
  const all = layoutsOf(lists, slugs, opts)
  const legal = layoutsOf(lists, slugs.filter(s => !lists[s].banned.length), opts)
  const points = {}
  for (const s of slugs) {
    points[s] = { ...all[s], legal: legal[s] ? { corners: legal[s].corners } : null }
  }
  return { types: TYPES, corners: CORNERS, points }
}
