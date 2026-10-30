import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { nameToSlug } from '../utils/slugs'

const CHART_COLORS = [
  '#ff6a39', '#e6a65d', '#956c58', '#ff9e78', '#c87340',
  '#d4855a', '#ffb899', '#7a4a46', '#b07060',
]
const OTHER_COLOR = '#3d2a2b'
const SHOWN_SLICES = 8

function DonutChart({ data, activeIndex, onSliceEnter, onSliceLeave }) {
  const [tooltip, setTooltip] = useState(null)
  const SIZE = 220, cx = 110, cy = 110, innerR = 55, outerR = 95
  const total = data.reduce((s, d) => s + d.value, 0)

  let cum = -Math.PI / 2
  const slices = data.map((d, i) => {
    const sweep = (d.value / total) * 2 * Math.PI
    const start = cum + 0.02
    const end = cum + sweep - 0.02
    cum += sweep
    return { ...d, start, end, mid: (start + end) / 2 }
  })

  const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const arc = (s) => {
    const [ox1, oy1] = pt(outerR, s.start)
    const [ox2, oy2] = pt(outerR, s.end)
    const [ix2, iy2] = pt(innerR, s.end)
    const [ix1, iy1] = pt(innerR, s.start)
    const lg = s.end - s.start > Math.PI ? 1 : 0
    return `M${ox1},${oy1}A${outerR},${outerR},0,${lg},1,${ox2},${oy2}L${ix2},${iy2}A${innerR},${innerR},0,${lg},0,${ix1},${iy1}Z`
  }

  return (
    <div className="relative w-full h-full">
      <svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {slices.map((s, i) => {
          const active = i === activeIndex
          const tx = active ? Math.cos(s.mid) * 8 : 0
          const ty = active ? Math.sin(s.mid) * 8 : 0
          return (
            <path key={i} d={arc(s)} fill={s.color}
              transform={`translate(${tx},${ty})`}
              style={{ transition: 'transform 0.15s ease', cursor: 'default' }}
              onMouseEnter={(e) => {
                onSliceEnter(i)
                setTooltip({ name: s.name, value: s.value, x: e.clientX, y: e.clientY })
              }}
              onMouseMove={(e) => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
              onMouseLeave={() => { onSliceLeave(); setTooltip(null) }}
            />
          )
        })}
      </svg>
      {tooltip && createPortal(
        <div className="fixed z-50 pointer-events-none rounded-xl px-3 py-2 text-sm shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40, background: '#261819', border: '1px solid #3d2a2b' }}>
          <p className="font-semibold text-amber-400">{tooltip.name}</p>
          <p className="text-gray-300">{tooltip.value}%</p>
        </div>,
        document.body
      )}
    </div>
  )
}

// The donut of the most played archetypes (the rest as Other) beside the list
// of archetypes and their shares. shares: [{ archetype_name, meta_share }],
// most played first. Archetypes under minListedShare (%) are listed as one
// Other row. listClassName: the list's grid, sized to its length.
export default function MetaPie({ shares, minListedShare = 0, listClassName }) {
  const [activeIndex, setActiveIndex] = useState(undefined)

  const top = shares.slice(0, SHOWN_SLICES)
  const otherShare = shares.slice(SHOWN_SLICES).reduce((s, d) => s + d.meta_share, 0)
  const chartData = [
    ...top.map((d, i) => ({ name: d.archetype_name, value: +d.meta_share.toFixed(1), color: CHART_COLORS[i] })),
    ...(otherShare > 0 ? [{ name: 'Other', value: +otherShare.toFixed(1), color: OTHER_COLOR }] : []),
  ]
  const listed = shares.filter(d => d.meta_share >= minListedShare)
  const unlisted = shares.slice(listed.length)
  const maxShare = shares[0].meta_share

  const row = (key, color, label, pct, onEnter) => (
    <div key={key} className="flex items-center gap-2 group min-w-0"
      onMouseEnter={onEnter}
      onMouseLeave={() => setActiveIndex(undefined)}>
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
      <div className="hidden 2xl:flex items-center gap-2 shrink-0">
        <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${(pct / maxShare) * 100}%`, background: color }}
          />
        </div>
        <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
      </div>
      <span className="2xl:hidden text-xs text-gray-400 shrink-0">{pct}%</span>
    </div>
  )

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="w-full sm:w-56 shrink-0 h-56">
          <DonutChart
            data={chartData}
            activeIndex={activeIndex}
            onSliceEnter={(i) => setActiveIndex(i)}
            onSliceLeave={() => setActiveIndex(undefined)}
          />
        </div>

        <div className={`flex-1 min-w-0 ${listClassName}`}>
          {listed.map((entry, i) => row(
            entry.archetype_name,
            i < SHOWN_SLICES ? CHART_COLORS[i] : OTHER_COLOR,
            <Link
              to={`/archetypes/${nameToSlug(entry.archetype_name)}`}
              className="text-sm text-gray-300 hover:text-amber-400 transition-colors flex-1"
            >
              {entry.archetype_name}
            </Link>,
            +entry.meta_share.toFixed(1),
            () => setActiveIndex(i < SHOWN_SLICES ? i : SHOWN_SLICES),
          ))}
          {unlisted.length > 0 && row(
            'other',
            OTHER_COLOR,
            <span className="text-sm text-gray-500 flex-1">
              Other ({unlisted.length} archetype{unlisted.length === 1 ? '' : 's'})
            </span>,
            +unlisted.reduce((s, d) => s + d.meta_share, 0).toFixed(1),
            () => setActiveIndex(SHOWN_SLICES),
          )}
        </div>
      </div>
    </div>
  )
}
