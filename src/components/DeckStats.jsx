import { useState, useEffect, useMemo, useCallback } from 'react'
import { useCardData } from './CardPreview'

// The charts of a decklist besides its mana curve (see ManaCurve): the colors
// of its cards, its card types, and a sample hand. Cards are [{ name, qty }].

const TITLE = 'text-base text-gray-500 mb-2'

// ---- colors --------------------------------------------------------------

const COLORS = [
  // the colors of the mana symbols, as on the archetype map; text: the labels' color on them
  { key: 'W', name: 'White', fill: '#f8e7b9', text: '#1f1a1a' },
  { key: 'U', name: 'Blue', fill: '#0e68ab', text: '#fff' },
  { key: 'B', name: 'Black', fill: '#000000', text: '#fff' },
  { key: 'R', name: 'Red', fill: '#d3202a', text: '#fff' },
  { key: 'G', name: 'Green', fill: '#00733e', text: '#fff' },
  { key: 'C', name: 'Colorless', fill: '#cbc2bf', text: '#1f1a1a' },
]
// slices smaller than this share of the pie get no label
const MIN_LABEL_SHARE = 0.07

// fetched once for the page
let colorsPromise = null
function useCardColors() {
  const [colors, setColors] = useState(null)
  useEffect(() => {
    if (!colorsPromise) {
      colorsPromise = fetch('/data/card-colors.json').then(r => r.json()).catch(() => { colorsPromise = null; return null })
    }
    let cancelled = false
    colorsPromise.then(c => { if (!cancelled) setColors(c) })
    return () => { cancelled = true }
  }, [])
  return colors
}

// How many nonland cards of each color the deck plays; a multicolor card
// counts for each of its colors.
function colorCounts(cards, colorOf, typesOf) {
  const counts = Object.fromEntries(COLORS.map(c => [c.key, 0]))
  for (const { name, qty } of cards) {
    const colors = colorOf[name]
    if (!colors || (typesOf[name] || []).includes('Land')) continue
    if (!colors.length) counts.C += qty
    for (const c of colors) if (c in counts) counts[c] += qty
  }
  return COLORS.map(c => ({ ...c, value: counts[c.key] })).filter(c => c.value > 0)
}

const percent = (value, total) => Math.round((100 * value) / total)

export function ColorsPie({ cards, cardTypes }) {
  const colorOf = useCardColors()
  if (!colorOf) return null
  const slices = colorCounts(cards, colorOf, cardTypes)
  const total = slices.reduce((n, s) => n + s.value, 0)
  if (!total) return null
  const R = 48, C = 55
  let angle = -Math.PI / 2
  const point = a => [C + R * Math.cos(a), C + R * Math.sin(a)]
  return (
    <div className="flex flex-col items-center">
      <h3 className={TITLE}>Colors</h3>
      <svg viewBox="0 0 110 110" className="w-40 h-40" role="img"
        aria-label={`Colors: ${slices.map(s => `${s.value} ${s.name}`).join(', ')}`}>
        {slices.length === 1 ? (
          <circle cx={C} cy={C} r={R} fill={slices[0].fill}><title>{slices[0].name}: {slices[0].value}</title></circle>
        ) : slices.map(s => {
          const sweep = (s.value / total) * 2 * Math.PI
          const [x1, y1] = point(angle)
          const [x2, y2] = point(angle + sweep)
          const d = `M${C},${C}L${x1},${y1}A${R},${R},0,${sweep > Math.PI ? 1 : 0},1,${x2},${y2}Z`
          const mid = angle + sweep / 2
          angle += sweep
          return (
            <g key={s.key}>
              <path d={d} fill={s.fill} stroke="#1f1a1a" strokeWidth="1">
                <title>{s.name}: {s.value} ({percent(s.value, total)}%)</title>
              </path>
              {s.value / total >= MIN_LABEL_SHARE && (
                <text x={C + 0.65 * R * Math.cos(mid)} y={C + 0.65 * R * Math.sin(mid)} textAnchor="middle"
                  dominantBaseline="middle" fontSize="9" fontWeight="600" fill={s.text} pointerEvents="none">
                  {percent(s.value, total)}%
                </text>
              )}
            </g>
          )
        })}
        {slices.length === 1 && (
          <text x={C} y={C} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="600"
            fill={slices[0].text} pointerEvents="none">100%</text>
        )}
        {/* a thin outline, for the black slices to stand out from the page */}
        <circle cx={C} cy={C} r={R + 0.5} fill="none" stroke="#6b5f60" strokeWidth="1" />
      </svg>
      <ul className="mt-2 space-y-0.5 text-xs text-gray-400">
        {slices.map(s => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm border border-gray-600" style={{ background: s.fill }} />
            {s.name}{' '}
            <span className="tabular-nums text-gray-500">{s.value} ({percent(s.value, total)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---- card types ----------------------------------------------------------

const RADAR_TYPES = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact']

export function CardTypesRadar({ cards, cardTypes }) {
  const counts = Object.fromEntries(RADAR_TYPES.map(t => [t, 0]))
  for (const { name, qty } of cards) {
    const types = cardTypes[name] || []
    if (types.includes('Land')) continue
    const type = RADAR_TYPES.find(t => types.includes(t))
    if (type) counts[type] += qty
  }
  const max = Math.max(...Object.values(counts))
  if (!max) return null
  // the outer ring: the highest count, rounded up to a multiple of 4
  const top = Math.ceil(max / 4) * 4
  const C = 100, R = 62
  const at = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / RADAR_TYPES.length
    return [C + r * Math.cos(a), C + r * Math.sin(a)]
  }
  const polygon = r => RADAR_TYPES.map((_, i) => at(i, r).join(',')).join(' ')
  const shape = RADAR_TYPES.map((t, i) => at(i, (counts[t] / top) * R).join(',')).join(' ')
  return (
    <div className="flex flex-col items-center">
      <h3 className={TITLE}>Types</h3>
      <svg viewBox="-40 14 280 160" className="w-64 lg:w-80 max-w-full" role="img"
        aria-label={`Card types: ${RADAR_TYPES.map(t => `${counts[t]} ${t}`).join(', ')}`}>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <polygon key={f} points={polygon(R * f)} fill="none" stroke="#4b4344" strokeWidth="1" />
        ))}
        {RADAR_TYPES.map((_, i) => (
          <line key={i} x1={C} y1={C} x2={at(i, R)[0]} y2={at(i, R)[1]} stroke="#4b4344" strokeWidth="1" />
        ))}
        <polygon points={shape} fill="#fbbf24" fillOpacity="0.35" stroke="#fbbf24" strokeWidth="1.5" />
        {RADAR_TYPES.map((t, i) => {
          // labels on the sides start or end at their spoke, so they stay clear of the chart
          const [x, y] = at(i, R + 8)
          const side = x - C
          const anchor = side > 4 ? 'start' : side < -4 ? 'end' : 'middle'
          return (
            <text key={t} x={x + Math.sign(side) * (Math.abs(side) > 4 ? 4 : 0)} y={y + (Math.abs(side) > 4 ? 0 : -4)}
              textAnchor={anchor} dominantBaseline="middle" className="fill-gray-400" fontSize="11">
              {t} <tspan className="fill-gray-500">{counts[t]}</tspan>
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ---- sample hand ---------------------------------------------------------

const HAND_SIZE = 7

function shuffled(names) {
  const a = [...names]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function HandCard({ name, images }) {
  // double-faced cards are listed by their front face only: ask their data
  const data = useCardData(images[name] ? null : name)
  const src = images[name] || (data && data.images[0])
  return src
    ? <img src={src} alt={name} title={name} className="w-[calc((100%-1rem)/3)] sm:w-36 lg:w-48 rounded-xl shadow-lg border border-gray-700" loading="lazy" />
    : <div className="w-[calc((100%-1rem)/3)] sm:w-36 lg:w-48 aspect-[63/88] rounded-xl border border-gray-700 p-2 text-xs text-gray-500">{name}</div>
}

// The deck shuffled; the first `drawn` cards are in hand.
export function SampleHand({ cards, images }) {
  const names = useMemo(() => cards.flatMap(c => Array(c.qty).fill(c.name)), [cards])
  const [state, setState] = useState(() => ({ library: shuffled(names), drawn: HAND_SIZE }))
  const newHand = useCallback(() => setState({ library: shuffled(names), drawn: HAND_SIZE }), [names])
  useEffect(() => { newHand() }, [newHand])
  if (!names.length) return null
  const hand = state.library.slice(0, state.drawn)
  const button = 'px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-40 disabled:hover:border-gray-600 disabled:hover:text-gray-400'
  return (
    <div>
      <h3 className={TITLE}>Sample hand</h3>
      <div className="flex gap-2 mb-3">
        <button className={button} onClick={newHand}>New hand</button>
        <button className={button} onClick={() => setState(s => ({ ...s, drawn: s.drawn + 1 }))}
          disabled={state.drawn >= state.library.length}>Draw</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {hand.map((name, i) => <HandCard key={`${i}-${name}`} name={name} images={images} />)}
      </div>
    </div>
  )
}
