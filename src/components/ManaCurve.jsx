import { useState, useEffect } from 'react'
import { CHART_COLORS } from './MetaPie'

// colors of the metagame pie: its brown (third) and gold (second)
const CREATURES_COLOR = CHART_COLORS[2]
const NON_CREATURES_COLOR = CHART_COLORS[1]

// The mana curve of a board: how many nonland cards of each mana value it
// plays (7 and up together), and their average mana value. Cards are
// [{ name, qty }]; the mana values and types come from the site's card data
// (card-cmc.json and card-types.json, see scripts/build-data.mjs).

const MAX_VALUE = 7
const BAR_HEIGHT = 96

// fetched once for every curve of the page
let dataPromise = null
function loadData() {
  if (!dataPromise) {
    dataPromise = Promise.all([
      fetch('/data/card-cmc.json').then(r => r.json()),
      fetch('/data/card-types.json').then(r => r.json()),
    ]).then(([cmc, types]) => ({ cmc, types })).catch(() => {
      dataPromise = null
      return null
    })
  }
  return dataPromise
}

function useCardData() {
  const [data, setData] = useState(null)
  useEffect(() => {
    let cancelled = false
    loadData().then(d => { if (!cancelled) setData(d) })
    return () => { cancelled = true }
  }, [])
  return data
}

// counts[v]: the copies of mana value v (the last: v and up); null until the
// card data is loaded
export function manaCurve(cards, data) {
  if (!data) return null
  const counts = Array(MAX_VALUE + 1).fill(0)
  const creatures = Array(MAX_VALUE + 1).fill(0)
  let total = 0
  let sum = 0
  for (const { name, qty } of cards) {
    const value = data.cmc[name]
    if (value === undefined) continue
    // lands are not part of the curve (nor are modal cards with a land side)
    const types = data.types[name] || []
    if (types.includes('Land')) continue
    const slot = Math.min(Math.round(value), MAX_VALUE)
    counts[slot] += qty
    if (types.includes('Creature')) creatures[slot] += qty
    total += qty
    sum += value * qty
  }
  return { counts, creatures, total, average: total ? sum / total : 0 }
}

// centered: the title, bars and notes centered in the widget
export default function ManaCurve({ cards, title = 'Mana curve', centered = false }) {
  const data = useCardData()
  const curve = manaCurve(cards || [], data)
  if (!curve || !curve.total) return null
  const max = Math.max(...curve.counts)
  return (
    <div className={`inline-block max-w-full ${centered ? 'text-center' : ''}`}>
      <h3 className="text-base text-gray-500 mb-2">{title}</h3>
      <div className={`flex items-end gap-2 ${centered ? 'justify-center' : ''}`} role="img"
        aria-label={`Mana curve: ${curve.counts.map((n, v) => `${n} at ${v}`).join(', ')}`}>
        {curve.counts.map((n, v) => (
          <div key={v} className="flex flex-col items-center w-8 sm:w-9">
            <span className="text-xs tabular-nums text-gray-400 mb-1 h-4">{n || ''}</span>
            <div className="w-full flex items-end" style={{ height: BAR_HEIGHT }}>
              <div className="w-full flex flex-col" style={{ height: n ? Math.max(3, (n / max) * BAR_HEIGHT) : 0 }}
                title={`${curve.creatures[v]} creatures, ${n - curve.creatures[v]} non-creatures`}>
                <div className="w-full rounded-t" style={{ flex: n - curve.creatures[v], background: NON_CREATURES_COLOR }} />
                <div className={`w-full ${n === curve.creatures[v] ? 'rounded-t' : ''}`} style={{ flex: curve.creatures[v], background: CREATURES_COLOR }} />
              </div>
            </div>
            <span className="mt-1 text-xs tabular-nums text-gray-500 border-t border-gray-700 w-full text-center pt-1">
              {v === MAX_VALUE ? `${v}+` : v}
            </span>
          </div>
        ))}
      </div>
      <p className={`mt-2 flex gap-3 text-xs text-gray-400 ${centered ? 'justify-center' : ''}`}>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: CREATURES_COLOR }} />Creatures</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: NON_CREATURES_COLOR }} />Non-creatures</span>
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Average mana value <span style={{ color: NON_CREATURES_COLOR }}>{curve.average.toFixed(2)}</span> ({curve.total} nonland cards)
      </p>
    </div>
  )
}
