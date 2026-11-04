import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { nameToSlug } from '../utils/slugs'

// A map of the archetypes: each one a point, similar typical lists close to
// each other. Positions are built by scripts/archetype-map.mjs.
const W = 1000
const H = 560
const PAD = 70
const CORNER_LABELS = {
  Aggro: { x: 0, y: 0, anchor: 'start' },
  Tempo: { x: 1, y: 0, anchor: 'end' },
  Control: { x: 1, y: 1, anchor: 'end' },
  Midrange: { x: 0, y: 1, anchor: 'start' },
}
const LABELED = 14 // how many archetypes are named at most, times the zoom squared
const LABEL_SIZE = 12
const MAX_ZOOM = 8

// Each archetype is colored by its mana and shaped by its game type
const MANA_COLORS = { W: '#f8e7b9', U: '#0e68ab', B: '#000000', R: '#d3202a', G: '#00733e', C: '#cbc2bf' } // the colors of the mana symbols
const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
const MANY_COLORS = '#d4af37' // four colors or more
const SHAPES = { Aggro: 'triangle', Midrange: 'diamond', Control: 'square', Tempo: 'hourglass', Combo: 'circle', Several: 'star' }

const isCombo = a => a.game_type.includes('Combo')
const shapeOf = a => SHAPES[isCombo(a) ? 'Combo' : a.game_type.length === 1 ? a.game_type[0] : 'Several'] || 'circle'
const manaOf = a => {
  const colors = MANA_ORDER.filter(m => (a.dominant_mana || []).includes(m))
  return colors.length ? colors : ['C']
}
// the id of the fill of a color combination: a solid color, or hard stripes of each color
const manaKey = a => (manaOf(a).length > 3 ? 'many' : manaOf(a).join(''))

// The outline of each shape (about the same area for each kind), for a radius of 1
const ngon = (n, radius, offset = -Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => [radius * Math.cos(offset + 2 * Math.PI * i / n), radius * Math.sin(offset + 2 * Math.PI * i / n)])
const OUTLINES = {
  triangle: ngon(3, 1.35).map(([x, y]) => [x, y + 0.2]),
  square: [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]],
  hourglass: [[-0.8, -0.95], [0.8, -0.95], [0.1, 0], [0.8, 0.95], [-0.8, 0.95], [-0.1, 0]],
  diamond: ngon(4, 1.3, 0),
  star: Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 ? 0.6 : 1.4, angle = -Math.PI / 2 + Math.PI * i / 5
    return [radius * Math.cos(angle), radius * Math.sin(angle)]
  }),
  circle: ngon(64, 1),
}

function inside(pt, poly) {
  let isIn = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) isIn = !isIn
  }
  return isIn
}

// Where to cut a shape into n stripes of the same area, along the diagonal of its
// bounding box (the gradient's axis): offsets 0..1. Equal widths would not do:
// the middle stripe of a circle holds far more than the ones at its ends.
const cutsCache = {}
function stripeOffsets(kind, n) {
  const key = `${kind}${n}`
  if (cutsCache[key]) return cutsCache[key]
  const poly = OUTLINES[kind]
  const xs = poly.map(p => p[0]), ys = poly.map(p => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const ts = []
  const steps = 120
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const x = x0 + (x1 - x0) * (i + 0.5) / steps, y = y0 + (y1 - y0) * (j + 0.5) / steps
      if (inside([x, y], poly)) ts.push(((x - x0) / (x1 - x0) + (y - y0) / (y1 - y0)) / 2)
    }
  }
  ts.sort((p, q) => p - q)
  return (cutsCache[key] = [0, ...Array.from({ length: n - 1 }, (_, k) => ts[Math.floor(ts.length * (k + 1) / n)]), 1])
}

function Shape({ kind, cx, cy, r, ...props }) {
  if (kind === 'circle' || !OUTLINES[kind]) return <circle cx={cx} cy={cy} r={r} {...props} />
  if (kind === 'square') return <rect x={cx - 0.9 * r} y={cy - 0.9 * r} width={1.8 * r} height={1.8 * r} {...props} />
  return <polygon points={OUTLINES[kind].map(([x, y]) => `${cx + x * r},${cy + y * r}`).join(' ')} {...props} />
}

// Names the most played archetypes first, each beside its point (above, below, to
// the right or to the left): where it covers no other name nor point, or else
// where it covers no other name. The ones that would not fit are left out.
// order: the points to name; all: every point drawn. [{ a, x, y, anchor }]
function placeLabels(order, all, cap, width, height) {
  const placed = []
  const taken = []
  const clash = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0
  for (const { a, px, py, r } of order) {
    if (placed.length >= cap) break
    if (px < 0 || px > width || py < 0 || py > height) continue
    const w = a.name.length * LABEL_SIZE * 0.56 + 8, h = LABEL_SIZE + 4
    const gap = 5
    const options = [
      { x: px, y: py - r - gap, anchor: 'middle', x0: px - w / 2, y0: py - r - gap - LABEL_SIZE },
      { x: px, y: py + r + gap + LABEL_SIZE - 2, anchor: 'middle', x0: px - w / 2, y0: py + r + gap - 2 },
      { x: px + r + gap, y: py + 4, anchor: 'start', x0: px + r + gap, y0: py + 4 - LABEL_SIZE },
      { x: px - r - gap, y: py + 4, anchor: 'end', x0: px - r - gap - w, y0: py + 4 - LABEL_SIZE },
    ].map(o => ({ ...o, box: { x0: o.x0, y0: o.y0, x1: o.x0 + w, y1: o.y0 + h } }))
      .filter(o => o.box.x0 >= 0 && o.box.x1 <= width && o.box.y0 >= 0 && o.box.y1 <= height && !taken.some(t => clash(o.box, t)))
    const coversPoint = o => all.some(q => q.a !== a && clash(o.box, { x0: q.px - q.r, y0: q.py - q.r, x1: q.px + q.r, y1: q.py + q.r }))
    const best = options.find(o => !coversPoint(o)) || options[0]
    if (!best) continue
    taken.push(best.box)
    placed.push({ a, x: best.x, y: best.y, anchor: best.anchor })
  }
  return placed
}

// Keeps the zoomed map from leaving the frame
function clampView(v) {
  const maxX = (v.k - 1) * W / 2, maxY = (v.k - 1) * H / 2
  return { k: v.k, x: Math.max(-maxX, Math.min(maxX, v.x)), y: Math.max(-maxY, Math.min(maxY, v.y)) }
}

export default function ArchetypeMap({ archetypes, visible, metaMap, filtering }) {
  const navigate = useNavigate()
  const [map, setMap] = useState(null)
  const [layout, setLayout] = useState('free')
  // only the archetypes whose typical list has no banned card, the map drawn again without the others
  const [legalOnly, setLegalOnly] = useState(false)
  const [hovered, setHovered] = useState(null)
  const drag = useRef(null)
  const justDragged = useRef(false)
  // zoom: k times closer, around the centre, then moved by (x, y). The wheel zooms
  // and, once zoomed, a drag moves the map.
  const [view, setView] = useState({ k: 1, x: 0, y: 0 })
  const svgRef = useRef(null)

  useEffect(() => { setView({ k: 1, x: 0, y: 0 }) }, [layout])

  // the wheel needs a listener that can stop the page from scrolling
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = e => {
      e.preventDefault()
      const box = svg.getBoundingClientRect()
      const sx = (e.clientX - box.left) / box.width * W, sy = (e.clientY - box.top) / box.height * H
      setView(v => {
        const k = Math.min(MAX_ZOOM, Math.max(1, v.k * Math.exp(-e.deltaY * 0.0015)))
        if (k === v.k) return v
        // keep the point under the cursor where it is
        const ratio = k / v.k
        return clampView({ k, x: sx - W / 2 - (sx - W / 2 - v.x) * ratio, y: sy - H / 2 - (sy - H / 2 - v.y) * ratio })
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [map])

  useEffect(() => {
    fetch('/data/archetype-map.json').then(r => r.json()).then(setMap).catch(() => setMap(false))
  }, [])

  const points = useMemo(() => {
    if (!map) return []
    return archetypes
      .map(a => ({ a, p: map.points[nameToSlug(a.name)] }))
      .filter(x => x.p && (!legalOnly || x.p.legal))
      .map(({ a, p }) => {
        const r = 4 + Math.sqrt(metaMap[a.name] || 0) * 3.2
        const [x, y] = (legalOnly ? p.legal : p)[layout]
        return {
          a,
          px: (PAD + x * (W - 2 * PAD) - W / 2) * view.k + W / 2 + view.x,
          py: (PAD + y * (H - 2 * PAD) - H / 2) * view.k + H / 2 + view.y,
          r: r * Math.sqrt(view.k), // the points grow less than the map, so they space out
        }
      })
  }, [map, archetypes, layout, metaMap, view, legalOnly])

  // the fills of the color combinations in use: stripes of each color (hard stops)
  const manaFills = useMemo(() => {
    const combos = new Map()
    for (const { a } of points) combos.set(`${shapeOf(a)}-${manaKey(a)}`, [shapeOf(a), manaOf(a)])
    return [...combos].filter(([, [, colors]]) => colors.length > 1 && colors.length <= 3)
  }, [points])

  // the most played first: the ones to name
  const byPlay = useMemo(
    () => [...points].sort((p, q) => (metaMap[q.a.name] || 0) - (metaMap[p.a.name] || 0)).map(p => p.a.name),
    [points, metaMap])
  // the names shown: the most played first, those that fit; the filtered ones only
  // when filtering (the search names its matches)
  const labels = useMemo(() => {
    const byName = new Map(points.map(p => [p.a.name, p]))
    const order = byPlay.map(n => byName.get(n)).filter(p => p && (!filtering || visible.has(p.a.name)))
    return placeLabels(order, points, Math.round(LABELED * view.k * view.k) * (filtering ? 3 : 1), W, H)
  }, [points, byPlay, filtering, visible, view.k])

  if (map === false) return null
  if (!map) return <div className="h-64 bg-gray-800 border border-gray-700 rounded-xl" />

  // drawn in this order: dimmed first
  const ordered = [...points].sort((p, q) => (visible.has(p.a.name) ? 1 : 0) - (visible.has(q.a.name) ? 1 : 0))

  function startDrag(e) {
    if (view.k === 1) return
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  function moveDrag(e) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 4) return
    d.moved = true
    d.x = e.clientX; d.y = e.clientY
    const unit = W / svgRef.current.getBoundingClientRect().width // pixels on screen to map units
    setView(v => clampView({ ...v, x: v.x + dx * unit, y: v.y + dy * unit }))
  }
  function endDrag() {
    // the click that ends a drag must not open an archetype
    if (drag.current?.moved) {
      justDragged.current = true
      setTimeout(() => { justDragged.current = false }, 0)
    }
    drag.current = null
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Archetype map</h2>
          <p className="text-xs text-gray-500">
            {layout === 'corners'
              ? 'The closer to a corner, the more the list looks like that type. '
              : 'Archetypes with similar typical lists are close. '}
            Scroll to zoom{view.k > 1 ? ', drag to move' : ''}.
            Bigger means more played. Click a point to open it.
          </p>
        </div>
        <div className="flex items-center gap-2">
        {view.k > 1 && (
          <button onClick={() => setView({ k: 1, x: 0, y: 0 })}
            className="px-3 py-1 rounded-lg border border-gray-600 text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors">
            Reset zoom
          </button>
        )}
        <button onClick={() => setLegalOnly(v => !v)} aria-pressed={legalOnly}
          title="Hide the archetypes that play banned cards, and draw the map again without them"
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
            legalOnly
              ? 'bg-amber-400 text-gray-900 border-amber-400'
              : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400 hover:text-gray-200'
          }`}>
          Legal only
        </button>
        <div className="inline-flex rounded-lg border border-gray-600 overflow-hidden text-xs font-semibold shrink-0">
          {[['free', 'Similarity'], ['corners', 'Game types']].map(([id, label], i) => (
            <button key={id} onClick={() => setLayout(id)}
              className={`px-3 py-1 transition-colors ${i ? 'border-l border-gray-600' : ''} ${layout === id ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
        </div>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-gray-900 rounded-lg select-none" role="img" aria-label="Map of the archetypes"
        style={view.k > 1 ? { touchAction: 'none', cursor: 'grab' } : undefined}
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={endDrag}>
        <defs>
            {manaFills.map(([key, [kind, colors]]) => (
              <linearGradient key={key} id={`mana-${key}`} x1="0" y1="0" x2="1" y2="1">
                {colors.flatMap((m, i) => {
                  const cuts = stripeOffsets(kind, colors.length)
                  return [
                    <stop key={`${m}a`} offset={cuts[i]} stopColor={MANA_COLORS[m]} />,
                    <stop key={`${m}b`} offset={cuts[i + 1]} stopColor={MANA_COLORS[m]} />,
                  ]
                })}
              </linearGradient>
            ))}
          </defs>
        {layout === 'corners' && (
          <>
            <line x1={W / 2 + view.x} y1={PAD / 2} x2={W / 2 + view.x} y2={H - PAD / 2} className="stroke-amber-400" strokeOpacity="0.45" strokeDasharray="4 6" />
            <line x1={PAD / 2} y1={H / 2 + view.y} x2={W - PAD / 2} y2={H / 2 + view.y} className="stroke-amber-400" strokeOpacity="0.45" strokeDasharray="4 6" />
            {Object.entries(CORNER_LABELS).map(([t, c]) => (
              <text key={t} x={c.x ? W - 14 : 14} y={c.y ? H - 14 : 28} textAnchor={c.anchor}
                className="fill-amber-400" fontSize="22" fontWeight="700">{t}</text>
            ))}
          </>
        )}
        {ordered.map(({ a, px, py, r }) => {
          const on = !filtering || visible.has(a.name)
          const key = manaKey(a)
          const fill = key === 'many' ? MANY_COLORS : key.length > 1 ? `url(#mana-${shapeOf(a)}-${key})` : MANA_COLORS[key]
          const common = {
            fill, fillOpacity: on ? 0.9 : 0.1,
            stroke: hovered === a.name ? '#fff' : '#dcc8bd', // the theme's gray-200
            strokeOpacity: on ? (hovered !== a.name ? 0.55 : 1) : 0.15, strokeWidth: hovered === a.name ? 2 : 1,
            style: { cursor: 'pointer' },
            onMouseEnter: () => setHovered(a.name), onMouseLeave: () => setHovered(null),
            onClick: () => { if (!justDragged.current) navigate(`/archetypes/${nameToSlug(a.name)}`) },
          }
          return <Shape key={a.name} kind={shapeOf(a)} cx={px} cy={py} r={r} {...common} />
        })}
        {(hovered ? points.filter(p => p.a.name === hovered).map(({ a, px, py, r }) => ({ a, x: px, y: py - r - 5, anchor: 'middle' })) : labels)
          .map(({ a, x, y, anchor }) => (
            <text key={a.name} x={x} y={y} textAnchor={anchor} fontSize={hovered === a.name ? 15 : LABEL_SIZE}
              fontWeight={hovered === a.name ? 700 : 400} className="fill-gray-100 stroke-gray-900" strokeWidth="3" paintOrder="stroke"
              pointerEvents="none">{a.name}</text>
          ))}
      </svg>

      <div className="space-y-1.5 text-xs text-gray-400">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="text-gray-500">Type:</span>
          {Object.entries(SHAPES).map(([type, kind]) => (
            <span key={type} className="inline-flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="-7 -7 14 14" className="overflow-visible">
                <Shape kind={kind} cx={0} cy={0} r={5} fill="#c4a999" fillOpacity="0.9" />
              </svg>
              {type === 'Several' ? 'Several types' : type}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
