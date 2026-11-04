// Positions of the archetypes on the archetypes index map, from their latest
// typical lists (see archetype-lists.json in build-data.mjs). Two layouts, both
// in [0, 1] x [0, 1]:
//  - free: archetypes with similar lists are close and unrelated ones are
//    apart (a force layout: similar archetypes attract, all repel);
//  - corners: the four game types sit in the corners (Aggro and Control on one
//    diagonal, Tempo and Midrange on the other) and each archetype lies between
//    them according to how much its list looks like the typical list of each.

// Aggro top-left, Tempo top-right, Control bottom-right, Midrange bottom-left
export const CORNERS = { Aggro: [0, 0], Tempo: [1, 0], Control: [1, 1], Midrange: [0, 1] }
const TYPES = Object.keys(CORNERS)

// How much the colors count in the similarity of two archetypes, against their cards
const COLOR_WEIGHT = 0.3
// Each archetype is pulled to its closest ones, if at least this similar
const NEIGHBOURS = 5
const MIN_PULL = 0.15
// In the game types layout, every type counts a little for every archetype: a list
// that shares cards with the Aggro lists only would otherwise sit exactly in the
// Aggro corner, on top of every other such list
const TYPE_FLOOR = 0.05

function vectorOf(entry) {
  // nonland cards only: the colors come from the archetype's dominant mana
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

// Similarity of two archetypes: their cards, and their colors so that a red
// deck and a green-white one are never alike just for having no card in common.
function similarities(entries, vectors) {
  const colors = entries.map(e => new Map((e.dominant_mana || []).map(m => [m, 1])))
  return vectors.map((v, i) => vectors.map((w, j) =>
    i === j ? 1 : (1 - COLOR_WEIGHT) * cosine(v, w) + COLOR_WEIGHT * cosine(colors[i], colors[j])))
}

// Fruchterman-Reingold on the graph of each archetype's closest ones: they pull
// each other, weighted by their similarity, and every pair pushes apart.
function freeLayout(sim) {
  const dims = 2
  const n = sim.length
  const edges = new Map()
  for (let i = 0; i < n; i++) {
    const closest = sim[i].map((s, j) => [s, j]).filter(([, j]) => j !== i).sort((a, b) => b[0] - a[0]).slice(0, NEIGHBOURS)
    for (const [s, j] of closest) {
      if (s < MIN_PULL) continue
      edges.set(Math.min(i, j) * n + Math.max(i, j), s)
    }
  }
  const pulls = [...edges].map(([key, s]) => [Math.floor(key / n), key % n, s])
  // a fixed spiral to start from, so that the layout is the same at each build
  let X = Array.from({ length: n }, (_, i) => {
    const angle = i * 2.39996, radius = Math.sqrt((i + 0.5) / n)
    return [0.5 + 0.45 * radius * Math.cos(angle), 0.5 + 0.45 * radius * Math.sin(angle)]
  })
  const k = Math.sqrt(1 / n) // ideal distance between two points
  const iterations = 600
  const diff = (a, b) => a.map((x, d) => x - b[d])
  for (let it = 0; it < iterations; it++) {
    const heat = 0.1 * (1 - it / iterations) + 0.002
    const F = X.map(() => new Array(dims).fill(0))
    const push = (i, j, f, dv) => dv.forEach((x, d) => { F[i][d] += x * f; F[j][d] -= x * f })
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dv = diff(X[i], X[j])
        const dist = Math.hypot(...dv) || 1e-6
        push(i, j, (k * k) / dist / dist, dv) // push of k^2 / dist, over dist for the unit vector
      }
    }
    for (const [i, j, s] of pulls) {
      const dv = diff(X[i], X[j])
      const dist = Math.hypot(...dv) || 1e-6
      push(i, j, -(s * s * dist) / k, dv) // pull of s^2 * dist^2 / k, over dist for the unit vector
    }
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dims; d++) F[i][d] -= (X[i][d] - 0.5) * 0.15 // weak gravity: the unconnected ones stay in view
      const len = Math.hypot(...F[i]) || 1e-9
      const step = Math.min(len, heat)
      for (let d = 0; d < dims; d++) X[i][d] += F[i][d] / len * step
    }
  }
  return Array.from({ length: dims }, (_, d) => stretch(X.map(p => p[d])))
}

// Weight of each type around an archetype: how close its list is to the
// average list of the archetypes that are only that type (without itself).
function cornerLayout(entries, vectors) {
  const pure = Object.fromEntries(TYPES.map(t => [t, []]))
  entries.forEach((e, i) => { if (e.game_type.length === 1 && pure[e.game_type[0]]) pure[e.game_type[0]].push(i) })
  const centroids = Object.fromEntries(TYPES.map(t => {
    const sum = new Map()
    for (const i of pure[t]) for (const [c, n] of vectors[i]) sum.set(c, (sum.get(c) || 0) + n / norm(vectors[i]))
    return [t, sum]
  }))
  const weights = vectors.map((v, i) => {
    const w = TYPES.map(t => {
      const c = new Map(centroids[t])
      if (pure[t].includes(i)) for (const [card, n] of v) c.set(card, c.get(card) - n / norm(v))
      return Math.max(cosine(v, c), 0) + TYPE_FLOOR
    })
    const total = w.reduce((a, b) => a + b, 0) || 1
    return w.map(x => x / total)
  })
  const raw = weights.map(w => TYPES.reduce((p, t, k) => [p[0] + w[k] * CORNERS[t][0], p[1] + w[k] * CORNERS[t][1]], [0, 0]))
  return {
    xy: [stretch(raw.map(p => p[0])), stretch(raw.map(p => p[1]))],
    weights,
  }
}

// The layouts of some archetypes: { slug: { free, corners, weights } }
function layoutsOf(lists, slugs) {
  const entries = slugs.map(s => lists[s])
  const vectors = entries.map(vectorOf)
  const [fx, fy] = freeLayout(similarities(entries, vectors))
  const { xy: [cx, cy], weights } = cornerLayout(entries, vectors)
  const r = x => Math.round(x * 1000) / 1000
  return Object.fromEntries(slugs.map((s, i) => [s, {
    free: [r(fx[i]), r(fy[i])], corners: [r(cx[i]), r(cy[i])], weights: weights[i].map(r),
  }]))
}

// lists: the archetype-lists.json object ({ slug: { name, main, lands, banned, game_type... } }).
// Each point has its place among all the archetypes and, unless its list has
// banned cards, its place among the legal ones alone (the map drawn again without
// the others, so that it fills the frame and the types' reference lists are legal).
export function buildArchetypeMap(lists) {
  // brews are left out: they are catch-alls ("Brew Boros"...), not a deck to place
  const slugs = Object.keys(lists).filter(s => !/^Brew( |$)/.test(lists[s].name))
  const all = layoutsOf(lists, slugs)
  const legal = layoutsOf(lists, slugs.filter(s => !lists[s].banned.length))
  const points = {}
  for (const s of slugs) {
    points[s] = { ...all[s], legal: legal[s] ? { free: legal[s].free, corners: legal[s].corners } : null }
  }
  return { types: TYPES, corners: CORNERS, points }
}
