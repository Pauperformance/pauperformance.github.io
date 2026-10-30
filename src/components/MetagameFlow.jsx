import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CardLink from './PoolCardLink'
import ShareChange from './ShareChange'
import { formatDate, formatShortDate } from '../utils/dates'
import { metagameSlug, nameToSlug } from '../utils/slugs'
import { scrollGently } from '../utils/scroll'

// The metagames as time flowing: the page scrolls through them, newest first,
// back in time, while the timeline and the widgets stay on screen. Each
// metagame holds still for HOLD of its step, then its shares blend into the
// previous one's. Metagames without decks (before the first ones recorded)
// take a short step, showing only their sets and B&Rs.

const STEP_PX = 120        // scroll per metagame with decks
const EMPTY_WEIGHT = 0.25  // the step of a metagame without decks, in steps
const TIMELINE_PX = 84     // timeline per step
const HOLD = 0.6
const ROW_PX = 30          // a row of the bars

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
// [hue, saturation, lightness] of each mana, readable on the dark background
const MANA_HSL = {
  W: [45, 45, 80], U: [207, 60, 55], B: [285, 12, 52],
  R: [12, 72, 54], G: [140, 42, 44], C: [30, 10, 64],
}
const BREW_COLOR = '#7a5e58'
const OTHER_COLOR = '#3d2a2b'

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// The archetype's colours, one per mana: shaded by its name, so that two
// archetypes of the same mana tell apart.
function archetypeColors(name, mana) {
  if (!mana.length) return [BREW_COLOR]
  const shift = (hash(name) % 5 - 2) * 5
  return MANA_ORDER.filter(c => mana.includes(c)).map(c => {
    const [h, s, l] = MANA_HSL[c]
    return `hsl(${h} ${s}% ${l + shift}%)`
  })
}

// Slices keep their place from one metagame to the next: mono-coloured first
// (white to green, then colourless), then by number of colours, Brew last.
function sliceOrder(name, mana) {
  if (!mana.length) return 'z'
  const colors = mana.map(c => MANA_ORDER.indexOf(c)).sort().join('')
  return `${mana.length}-${colors}-${name}`
}

function cssFill(colors) {
  return colors.length === 1 ? colors[0] : `linear-gradient(to right, ${colors.join(', ')})`
}

function smooth(x) {
  return x * x * (3 - 2 * x)
}

// The step at u (in steps from the first metagame).
function stepAt(steps, u) {
  let lo = 0, hi = steps.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (steps[mid].start <= u) lo = mid
    else hi = mid - 1
  }
  return lo
}

// The metagame's set giving its label, or the B&R starting it.
function shortName(m) {
  const set = m.sets.find(s => s.scryfall_code === m.label) || m.sets[0]
  return set ? set.name : (m.bans[0] ? m.bans[0].subtitle : m.label)
}

// The same, shorter, for the timeline.
function timelineName(m) {
  return shortName(m).replace('Banned & Restricted', 'B&R')
}

function metagameTitle(m) {
  return [...m.sets.map(s => s.name), ...m.bans.map(b => b.subtitle)].join(' + ')
}

// What the metagame's events hold, e.g. "1 new set · 2 banned": the toggle of
// the events on phones.
function eventsSummary(m) {
  const banned = m.bans.reduce((sum, b) => sum + b.banned.length, 0)
  const unbanned = m.bans.reduce((sum, b) => sum + b.unbanned.length, 0)
  return [
    m.sets.length > 0 && `${m.sets.length} new set${m.sets.length === 1 ? '' : 's'}`,
    banned > 0 && `${banned} banned`,
    unbanned > 0 && `${unbanned} unbanned`,
    // a B&R changing which cards are legal without banning or unbanning any
    m.bans.length > 0 && !banned && !unbanned && 'B&R',
  ].filter(Boolean).join(' · ')
}

function useHeaderHeight() {
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const measure = () => setHeight(header.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])
  return height
}

function useViewportHeight() {
  const [height, setHeight] = useState(() => window.innerHeight)
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return height
}

function Donut({ slices, other, center, hovered, onHover }) {
  const SIZE = 220, cx = 110, cy = 110, innerR = 62, outerR = 102
  const all = [...slices, ...(other > 0.05 ? [{ name: 'Other', value: other, colors: [OTHER_COLOR] }] : [])]
  const total = all.reduce((s, d) => s + d.value, 0)
  const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]

  let cum = -Math.PI / 2
  const paths = all.map(d => {
    const sweep = Math.min((d.value / total) * 2 * Math.PI, 2 * Math.PI - 0.001)
    const start = cum, end = cum + sweep
    cum += sweep
    const [ox1, oy1] = pt(outerR, start)
    const [ox2, oy2] = pt(outerR, end)
    const [ix2, iy2] = pt(innerR, end)
    const [ix1, iy1] = pt(innerR, start)
    const lg = sweep > Math.PI ? 1 : 0
    return { ...d, d: `M${ox1},${oy1}A${outerR},${outerR},0,${lg},1,${ox2},${oy2}L${ix2},${iy2}A${innerR},${innerR},0,${lg},0,${ix1},${iy1}Z` }
  })
  const active = hovered && all.find(d => d.name === hovered)

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full" role="img"
      aria-label={all.map(d => `${d.name} ${d.value.toFixed(1)}%`).join(', ')}>
      <defs>
        {paths.filter(p => p.colors.length > 1).map(p => (
          <linearGradient key={p.name} id={`flow-${hash(p.name)}`} x1="0" y1="0" x2="1" y2="1">
            {p.colors.map((c, i) => <stop key={i} offset={i / (p.colors.length - 1)} stopColor={c} />)}
          </linearGradient>
        ))}
      </defs>
      {paths.map(p => (
        <path key={p.name} d={p.d}
          fill={p.colors.length > 1 ? `url(#flow-${hash(p.name)})` : p.colors[0]}
          stroke="var(--color-gray-800)" strokeWidth="1.5"
          opacity={hovered && hovered !== p.name ? 0.35 : 1}
          onMouseEnter={() => onHover(p.name)} onMouseLeave={() => onHover(null)} />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-white text-[15px] font-semibold">
        {active ? `${active.value.toFixed(1)}%` : center.value}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-gray-400 text-[10px]">
        {active ? (active.name.length > 18 ? active.name.slice(0, 17) + '…' : active.name) : center.label}
      </text>
    </svg>
  )
}

// The archetypes over the threshold, most played first (Other last): rows
// slide to their new rank as the shares change.
// changes: the metagame's archetypes, by name, with their share and their
// share in the previous metagame; shown, with the new archetypes, as each
// metagame starts (slug).
function Bars({ rows, scale, changes, slug, hovered, onHover }) {
  const ranked = [...rows].sort((a, b) => (a.name === 'Other') - (b.name === 'Other') || b.value - a.value)
  const rank = new Map(ranked.map((r, i) => [r.name, i]))
  return (
    <div className="relative" style={{ height: rows.length * ROW_PX }}>
      {rows.map(r => {
        const change = changes.get(r.name)
        const entered = change && change.previous === 0
        return (
          <div key={r.name}
            className="absolute inset-x-0 flex items-center gap-2 transition-[top] duration-300 ease-out motion-reduce:transition-none"
            style={{ top: rank.get(r.name) * ROW_PX, height: ROW_PX, opacity: hovered && hovered !== r.name ? 0.4 : 1 }}
            onMouseEnter={() => onHover(r.name)} onMouseLeave={() => onHover(null)}>
            {r.name === 'Other' ? (
              <span className="flex-1 min-w-0 sm:flex-none sm:w-48 shrink-0 truncate text-sm text-gray-500">Other (under 2%)</span>
            ) : (
              <Link to={`/archetypes/${nameToSlug(r.name)}`}
                className={`flex-1 min-w-0 sm:flex-none sm:w-48 shrink-0 truncate text-sm hover:text-amber-400 transition-colors ${entered ? 'text-amber-200' : 'text-gray-300'}`}>
                {r.name}
              </Link>
            )}
            {/* a line under the row on narrow screens, where it has no room beside the name */}
            <div className="absolute inset-x-0 bottom-0 h-1 sm:static sm:flex-1 sm:h-2.5 bg-gray-900 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (r.value / scale) * 100)}%`, background: cssFill(r.colors) }} />
            </div>
            <span className="ml-auto sm:ml-0 w-11 shrink-0 text-right text-xs text-gray-400 font-mono">{r.value.toFixed(1)}%</span>
            <span className="w-16 shrink-0 text-right">
              {change && (
                <span key={slug} className="flow-event-in inline-block">
                  {entered ? (
                    <span className="px-1.5 py-px rounded-full border border-amber-300/60 bg-amber-300/10 text-[11px] font-medium text-amber-300"
                      title="Not played in the previous metagame">
                      New
                    </span>
                  ) : <ShareChange share={change.share} previous={change.previous} />}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// The metagame's sets and B&Rs, appearing when it starts.
function Events({ metagame, poolUrls, bindPreview }) {
  return (
    <div key={metagameSlug(metagame)} className="space-y-2">
      {metagame.sets.map(s => (
        <div key={s.scryfall_code} className="flow-event-in text-sm text-gray-300">
          <span className="text-xs uppercase tracking-wide text-gray-500 mr-2">New set</span>
          {s.name} <span className="text-gray-500">· {s.cards.length} new card{s.cards.length === 1 ? '' : 's'}</span>
        </div>
      ))}
      {metagame.bans.map((b, i) => (
        <div key={b.announced} className="flow-event-in space-y-1.5" style={{ animationDelay: `${(metagame.sets.length + i) * 80}ms` }}>
          {/* the header already names a lone B&R */}
          {metagame.sets.length + metagame.bans.length > 1 && (
            <p className="text-sm text-gray-300">
              <span className="text-xs uppercase tracking-wide text-gray-500 mr-2">B&amp;R</span>{b.subtitle}
            </p>
          )}
          {b.banned.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-red-400/80 w-16">Banned</span>
              {b.banned.map(n => <CardLink key={n} card={{ name: n, url: poolUrls.get(n) }} tone="banned" bindPreview={bindPreview} />)}
            </div>
          )}
          {b.unbanned.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-green-400/80 w-16">Unbanned</span>
              {b.unbanned.map(n => <CardLink key={n} card={{ name: n, url: poolUrls.get(n) }} tone="unbanned" bindPreview={bindPreview} />)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// The rail: newer metagames above the marker, older ones below it, filled.
// Scrolling down moves the dots up through the marker, back in time.
// position: where the marker is, in steps.
function Timeline({ steps, position, current, onPick }) {
  return (
    <div className="relative h-full overflow-hidden select-none">
      <div className="absolute left-3 top-0 h-1/2 w-0.5 -translate-x-1/2 bg-gray-700" />
      <div className="absolute left-3 top-1/2 bottom-0 w-0.5 -translate-x-1/2 bg-gradient-to-b from-amber-400 to-amber-400/20" />
      <div className="absolute top-1/2 left-0 right-0" style={{ transform: `translateY(${-position * TIMELINE_PX}px)` }}>
        {steps.map((s, i) => {
          const past = i > current, now = i === current
          // the name needs the room of a full step above
          const named = s.data && (i === 0 || steps[i - 1].data)
          return (
            <button key={s.slug} onClick={() => onPick(i)} title={`${s.slug} · ${metagameTitle(s.m)}`}
              className="absolute left-0 right-0 flex items-end gap-2 text-left group"
              // the dot on the point, with the label's last line: the name
              // goes above, towards the newer metagames (the older ones
              // without decks are packed below)
              style={{ top: s.start * TIMELINE_PX, transform: 'translateY(calc(-100% + 10px))' }}>
              <span className="w-6 h-5 flex items-center justify-center shrink-0">
                <span className={`rounded-full border-2 transition-all ${
                  now ? 'w-4 h-4 bg-amber-300 border-amber-300'
                    : s.data ? `w-2.5 h-2.5 ${past ? 'bg-amber-400 border-amber-400' : 'bg-gray-900 border-gray-500'}`
                      : `w-1.5 h-1.5 ${past ? 'bg-amber-400/60 border-amber-400/60' : 'bg-gray-700 border-gray-700'}`
                }`} />
              </span>
              {named ? (
                <span className="min-w-0 leading-snug">
                  <span className={`hidden lg:block text-sm line-clamp-2 ${now ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                    {timelineName(s.m)}
                  </span>
                  <span className="flex items-center h-5 whitespace-nowrap">
                    <span className={`font-mono text-sm ${now ? 'text-amber-300 font-semibold' : 'text-amber-400 group-hover:text-amber-300'}`}>{s.slug}</span>
                    <span className={`hidden lg:inline ml-2 text-xs ${now ? 'text-gray-300' : 'text-gray-500'}`}>{formatShortDate(s.m.date)}</span>
                  </span>
                </span>
              ) : (
                // one line: packed close to the metagames without decks
                <span className="flex items-center h-5 whitespace-nowrap">
                  <span className={`font-mono ${now ? 'text-sm text-amber-300 font-semibold'
                    : s.data ? 'text-sm text-amber-400 group-hover:text-amber-300'
                      : 'text-xs text-gray-500 group-hover:text-gray-300'}`}>{s.slug}</span>
                  {now && <span className="hidden lg:inline ml-2 text-xs text-gray-300">{formatShortDate(s.m.date)}</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// index: the metagame index, oldest first. poolUrls: the Scryfall page of
// each card, for the banned and unbanned ones.
export default function MetagameFlow({ index, poolUrls, bindPreview }) {
  const [flow, setFlow] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    fetch('/data/metagame_flow.json')
      .then(r => r.json())
      .then(setFlow)
      .catch(() => setError(true))
  }, [])

  const steps = useMemo(() => {
    if (!flow) return []
    let at = 0
    return [...index].reverse().map(m => {
      const data = flow.metagames[metagameSlug(m)] || null
      const step = { m, slug: metagameSlug(m), data, start: at, weight: data ? 1 : EMPTY_WEIGHT }
      at += step.weight
      return step
    })
  }, [index, flow])
  const total = steps.length ? steps[steps.length - 1].start + steps[steps.length - 1].weight : 0
  // the oldest metagame with decks
  const firstData = steps.findLastIndex(s => s.data)

  // every archetype's colours and place in the donut
  const archetypes = useMemo(() => {
    const byName = new Map()
    if (!flow) return byName
    const names = Object.keys(flow.mana).sort((a, b) =>
      sliceOrder(a, flow.mana[a]).localeCompare(sliceOrder(b, flow.mana[b])))
    names.forEach((name, i) => byName.set(name, { order: i, colors: archetypeColors(name, flow.mana[name]) }))
    return byName
  }, [flow])
  // the bars share one scale through time: the largest share of an archetype
  const scale = useMemo(() => Math.max(1, ...steps.filter(s => s.data).flatMap(s =>
    s.data.shares.map(([, v]) => v))), [steps])

  const headerHeight = useHeaderHeight()
  const viewportHeight = useViewportHeight()
  const stageHeight = Math.max(420, viewportHeight - headerHeight)

  const sectionRef = useRef(null)
  const [u, setU] = useState(0)
  const [inside, setInside] = useState(false)
  useEffect(() => {
    if (!total) return
    let frame = 0
    const update = () => {
      frame = 0
      const el = sectionRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top - headerHeight
      setU(Math.min(Math.max(-top / STEP_PX, 0), total - 1e-6))
      setInside(top <= 1)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [total, headerHeight])

  // animated: an eased scroll through the metagames in between; otherwise a jump
  const scrollToStep = useCallback((i, animated = true) => {
    const el = sectionRef.current
    if (!el || !steps[i]) return
    const top = window.scrollY + el.getBoundingClientRect().top - headerHeight + steps[i].start * STEP_PX + 1
    if (animated) scrollGently(top)
    else window.scrollTo(0, top)
  }, [steps, headerHeight])

  // Each step holds its metagame for HOLD of it, then moves on to the next one
  // (moving, from 0 to 1): the timeline slides to the next dot while the shares
  // blend. The current metagame changes when a dot reaches the marker, so,
  // while moving, it's the one left behind, whichever way the page scrolls.
  const at = steps.length ? stepAt(steps, u) : 0
  const base = steps[at]
  const following = steps[at + 1]
  const f = base ? (u - base.start) / base.weight : 0
  const moving = following && f > HOLD ? smooth((f - HOLD) / (1 - HOLD)) : 0
  const lastCurrent = useRef(0)
  const current = !moving ? at
    : lastCurrent.current === at || lastCurrent.current === at + 1 ? lastCurrent.current
      : moving < 0.5 ? at : at + 1
  lastCurrent.current = current
  const step = steps[current]
  // where the timeline is, in steps
  const position = base ? base.start + moving * base.weight : 0

  // ?at=<metagame>: where to start (the latest one, at the top, without it),
  // kept up to date while scrolling
  const [params, setParams] = useSearchParams()
  const started = useRef(false)
  useLayoutEffect(() => {
    if (started.current || !steps.length || !headerHeight) return
    started.current = true
    const at = steps.findIndex(s => s.slug === params.get('at'))
    if (at > 0) scrollToStep(at, false)
  }, [steps, headerHeight, params, scrollToStep])
  useEffect(() => {
    if (!started.current || !step || !inside || params.get('at') === step.slug) return
    const timer = setTimeout(() => setParams(p => {
      const next = new URLSearchParams(p)
      next.set('at', step.slug)
      return next
    }, { replace: true }), 400)
    return () => clearTimeout(timer)
  }, [step, inside, params, setParams])

  // the arrow keys step through the metagames
  const currentRef = useRef(current)
  currentRef.current = current
  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.top > headerHeight + 1 || rect.bottom < window.innerHeight) return
      e.preventDefault()
      const to = currentRef.current + (e.key === 'ArrowDown' ? 1 : -1)
      if (to >= 0 && to < steps.length) scrollToStep(to, false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [steps, headerHeight, scrollToStep])

  const [hovered, setHovered] = useState(null)
  // phones only: the events take the room of the bars, so they open on demand
  // (and stay open while scrolling)
  const [eventsOpen, setEventsOpen] = useState(false)

  if (error) return <p className="text-gray-400 text-sm py-8 text-center">The metagame flow could not be loaded.</p>
  if (!flow) return <p className="text-gray-400 text-sm py-8 text-center">Loading...</p>
  if (!step) return null

  // the shares on screen: the step's metagame, blending into the next one's
  // (the current one's, when the step's has no decks)
  const shown = base.data || step.data
  const g = base.data && following && following.data ? moving : 0
  let rows = [], other = 0
  if (shown) {
    const values = new Map(shown.shares.map(([n, v]) => [n, (1 - g) * v]))
    if (g) for (const [n, v] of following.data.shares) values.set(n, (values.get(n) || 0) + g * v)
    other = (1 - g) * shown.other + (g ? g * following.data.other : 0)
    rows = [...values].filter(([, v]) => v > 0.05)
      .map(([name, value]) => ({ name, value, ...archetypes.get(name) }))
      .sort((a, b) => a.order - b.order)
  }
  const barRows = other > 0.05 ? [...rows, { name: 'Other', value: other, colors: [OTHER_COLOR] }] : rows
  // the metagame's own changes, held while it blends into the next one
  const changes = new Map(step.data ? step.data.shares.map(([n, share, previous]) => [n, { share, previous }]) : [])
  const m = step.m

  return (
    <div ref={sectionRef} className="relative" style={{ height: total * STEP_PX + stageHeight }}>
      <div className="sticky flex gap-4 lg:gap-6 py-4" style={{ top: headerHeight, height: stageHeight }}>
        <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
          {/* one height for every metagame, so that the pie and the bars stay in place: long B&Rs scroll inside
              (on phones, with the events closed, the header alone, the same for all) */}
          <div className={`bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 shrink-0 flex flex-col sm:h-52 ${eventsOpen ? 'h-84' : ''}`}>
            <div className="flex items-start gap-3 flex-wrap">
              <div className="min-w-[12rem] flex-1">
                <p className="text-amber-400 font-semibold">{formatDate(m.date)}</p>
                <p className="text-white font-medium truncate" title={metagameTitle(m)}>{metagameTitle(m)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {current > 0 && (
                  <button onClick={() => scrollToStep(0)}
                    className="px-2.5 py-1 rounded-md border border-gray-700 bg-gray-900 text-xs text-gray-300 hover:border-amber-400/50 hover:text-amber-400 transition-colors">
                    Today ↑
                  </button>
                )}
                <Link to={`/metagames/${step.slug}`}
                  className="px-2.5 py-1 rounded-md border border-gray-700 bg-gray-900 text-xs text-gray-300 hover:border-amber-400/50 hover:text-amber-400 transition-colors">
                  Metagame →
                </Link>
              </div>
            </div>
            <button onClick={() => setEventsOpen(o => !o)} aria-expanded={eventsOpen}
              className="sm:hidden mt-3 pt-3 border-t border-gray-700 flex items-center justify-between gap-2 text-left text-xs uppercase tracking-widest text-gray-400">
              <span className="truncate">{eventsSummary(m)}</span>
              <span className="text-gray-600">{eventsOpen ? '▲' : '▼'}</span>
            </button>
            <div className={`${eventsOpen ? 'block mt-3' : 'hidden'} sm:block sm:mt-3 sm:pt-3 sm:border-t border-gray-700 pb-2 flex-1 min-h-0 overflow-y-auto`}>
              <Events metagame={m} poolUrls={poolUrls} bindPreview={bindPreview} />
            </div>
          </div>

          {step.data ? (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-6">
              {/* no room for it on phones: the bars tell the same */}
              <div className="hidden sm:block shrink-0 sm:w-56 sm:h-56 lg:w-72 lg:h-72 xl:w-80 xl:h-80 mx-auto lg:mx-0">
                <Donut slices={rows} other={other} hovered={hovered} onHover={setHovered}
                  center={{ value: step.data.decks.toLocaleString(), label: 'decks' }} />
              </div>
              <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                <Bars rows={barRows} scale={scale} changes={changes} slug={step.slug} hovered={hovered} onHover={setHovered} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-sm text-gray-500 px-4">
              <p>No decks recorded in this metagame.</p>
              {current > firstData && (
                <p>The decks start with{' '}
                  <button onClick={() => scrollToStep(firstData)}
                    className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">
                    {shortName(steps[firstData].m)}
                  </button>,{' '}
                  {formatDate(steps[firstData].m.date)}.</p>
              )}
            </div>
          )}
        </div>

        <div className="w-24 sm:w-32 lg:w-72 xl:w-80 shrink-0">
          <Timeline steps={steps} position={position} current={current} onPick={i => scrollToStep(i)} />
        </div>
      </div>
    </div>
  )
}
