import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatShortDate } from '../utils/dates'

// A card's popularity across metagames: the share of each metagame's
// tournament decks playing it, from the metagame it became Pauper legal in to
// the current one, with its rank there on hover.

const HEIGHT = 220
const MARGIN = { top: 12, right: 12, bottom: 28, left: 40 }

// The metagames the series refer to (see card-popularity-metagames.json in
// scripts/build-data.mjs), fetched once for every card page.
const metagamesPromises = {}
export function useMetagames(url) {
  const [metagames, setMetagames] = useState(null)
  useEffect(() => {
    if (!metagamesPromises[url]) {
      metagamesPromises[url] = fetch(url)
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
    }
    let cancelled = false
    metagamesPromises[url].then(m => { if (!cancelled) setMetagames(m) })
    return () => { cancelled = true }
  }, [url])
  return metagames
}

// the element's width, measured once it's rendered (ready)
function useWidth(ref, ready) {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return
    const measure = () => setWidth(ref.current.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, ready])
  return width
}

// The top of the y axis and its step: a round number over the highest share.
function yScale(max) {
  const steps = [0.5, 1, 2, 5, 10, 20, 25]
  const step = steps.find(s => s * 4 >= max) || 25
  return { top: Math.min(100, step * Math.max(1, Math.ceil(max / step))), step }
}

function formatShare(share) {
  return share >= 10 || share === 0 ? `${share.toFixed(0)}%` : `${share.toFixed(1)}%`
}

// How the share of tournament decks playing the card moved since the previous
// metagame, as ShareChange shows an archetype's, but with no "New" (a card not
// played there may have been before): nothing if it wasn't legal there
// (previous null), or played in neither.
export function PopularityTrend({ share, previous }) {
  if (share == null || previous == null || (!share && !previous)) return null
  const change = share - previous
  const title = `${previous.toFixed(1)}% of the decks in the previous metagame`
  if (Math.abs(change) < 0.05) return <span className="text-xs text-gray-500 tabular-nums" title={title}>= 0.0%</span>
  return (
    <span title={title} className={`text-xs tabular-nums ${change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
      {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
    </span>
  )
}

// series: [metagame slug, decks playing the card, rank (null if not played)]
// The archetype pages use it too (with their own metagames and wording).
export default function CardPopularityChart({
  series,
  metagamesUrl = '/data/card-popularity-metagames.json',
  subject = 'card',
  caption = 'Popularity of card in tournaments since it became Pauper legal. Hover a metagame for its rank; click to open it.',
}) {
  const metagames = useMetagames(metagamesUrl)
  const containerRef = useRef(null)
  const [hovered, setHovered] = useState(null)
  const navigate = useNavigate()

  const points = useMemo(() => {
    if (!metagames || !series) return []
    const bySlug = Object.fromEntries(metagames.map(m => [m.slug, m]))
    return series
      .filter(([slug]) => bySlug[slug])
      .map(([slug, decks, rank]) => {
        const m = bySlug[slug]
        // rounded as the card's popularity_share, so that both trends agree
        return { metagame: m, decks, rank, share: +(100 * decks / m.decks).toFixed(2) }
      })
  }, [metagames, series])
  const width = useWidth(containerRef, points.length > 0)
  // another card: nothing hovered
  useEffect(() => { setHovered(null) }, [series])

  if (!metagames) return <p className="text-gray-500 text-sm">Loading popularity…</p>
  if (!points.length) return null

  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom
  const { top, step } = yScale(Math.max(...points.map(p => p.share)))
  const x = i => MARGIN.left + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1))
  const y = share => MARGIN.top + innerH - (share / top) * innerH

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.share)}`).join('')
  const area = `${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`
  const gridlines = []
  for (let v = 0; v <= top + 1e-9; v += step) gridlines.push(v)

  // a label at each year's first metagame, skipping those too close to the
  // last one shown (metagames are evenly spaced, not by date: a year with one
  // metagame leaves the next year's label right beside it)
  const MIN_TICK_GAP = 40
  const yearTicks = []
  points.forEach((p, i) => {
    const year = p.metagame.date.slice(0, 4)
    if (i > 0 && points[i - 1].metagame.date.slice(0, 4) === year) return
    const last = yearTicks[yearTicks.length - 1]
    if (last && x(i) - x(last.i) < MIN_TICK_GAP) return
    yearTicks.push({ year, i })
  })

  function onPointerMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = points.length === 1 ? 0
      : Math.round(((px - MARGIN.left) / Math.max(1, innerW)) * (points.length - 1))
    setHovered(Math.max(0, Math.min(points.length - 1, i)))
  }

  const active = hovered !== null ? points[hovered] : points[points.length - 1]
  const activeIndex = hovered !== null ? hovered : points.length - 1

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      {/* the hovered metagame, or the current one */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        {/* Phones: the name on one line (cut if long) and the date always on
            the next, so the widget keeps its height while a finger scrubs
            across metagames */}
        <span className="text-gray-300 w-full sm:w-auto min-w-0">
          <span className="block sm:inline truncate font-semibold text-gray-100">{active.metagame.name}</span>
          <span className="block sm:inline text-gray-500"><span className="hidden sm:inline"> · </span>{formatShortDate(active.metagame.date)}</span>
        </span>
        <span className="inline-flex items-baseline gap-2 text-gray-400 tabular-nums">
          {activeIndex > 0 && <PopularityTrend share={active.share} previous={points[activeIndex - 1].share} />}
          <span>
          {active.rank
            ? <>
                <span className="text-amber-400 font-semibold">#{active.rank.toLocaleString('en-US')}</span>
                {' · '}{formatShare(active.share)} of decks ({active.decks.toLocaleString('en-US')} of {active.metagame.decks.toLocaleString('en-US')})
              </>
            : <>Not played ({active.metagame.decks.toLocaleString('en-US')} decks)</>}
          </span>
        </span>
      </div>
      <div ref={containerRef} className="w-full">
        {width > 0 && (
          <svg width={width} height={HEIGHT} className="block touch-pan-y cursor-pointer"
            role="img"
            aria-label={`Share of tournament decks playing the ${subject}, by metagame, from ${points[0].metagame.name} to ${points[points.length - 1].metagame.name}`}
            onPointerMove={onPointerMove} onPointerDown={onPointerMove}
            onPointerLeave={() => setHovered(null)}
            onClick={() => navigate(`/metagames/${active.metagame.slug}`)}>
            {gridlines.map(v => (
              <g key={v}>
                <line x1={MARGIN.left} x2={MARGIN.left + innerW} y1={y(v)} y2={y(v)}
                  stroke="var(--color-gray-700)" strokeDasharray={v ? '3 3' : undefined} />
                <text x={MARGIN.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-gray-500 text-[10px] tabular-nums">
                  {v}%
                </text>
              </g>
            ))}
            {yearTicks.map(({ year, i }) => (
              <text key={year} x={x(i)} y={HEIGHT - 8} textAnchor="middle" className="fill-gray-500 text-[10px] tabular-nums">
                {year}
              </text>
            ))}
            <path d={area} fill="var(--color-amber-400)" opacity="0.12" />
            <path d={line} fill="none" stroke="var(--color-amber-400)" strokeWidth="2" strokeLinejoin="round" />
            <line x1={x(activeIndex)} x2={x(activeIndex)} y1={MARGIN.top} y2={MARGIN.top + innerH}
              stroke="var(--color-gray-500)" strokeDasharray="2 3" />
            <circle cx={x(activeIndex)} cy={y(active.share)} r="4"
              fill="var(--color-amber-400)" stroke="var(--color-gray-800)" strokeWidth="2" />
          </svg>
        )}
      </div>
      <p className="text-xs text-gray-500">
        {caption}
      </p>
    </div>
  )
}
