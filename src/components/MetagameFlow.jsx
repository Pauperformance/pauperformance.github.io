import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CardLink from './PoolCardLink'
import ShareChange from './ShareChange'
import { CHART_COLORS } from './MetaPie'
import { formatDate, formatShortDate, daysBetween, formatDays } from '../utils/dates'
import { metagameSlug, nameToSlug } from '../utils/slugs'
import { scrollGently } from '../utils/scroll'
import { useCardPages, cardLinkSlug } from '../utils/cardPages'

// The metagames as time flowing: the page scrolls through them, newest first,
// back in time, while the timeline and the widgets stay on screen. Each
// metagame holds still for HOLD of its step, then its shares blend into the
// previous one's. Metagames without decks (before the first ones recorded)
// take a short step, showing only their sets and B&Rs.

const STEP_PX = 120        // scroll per metagame with decks
const EMPTY_WEIGHT = 0.25  // the step of a metagame without decks, in steps
const TIMELINE_PX = 84     // timeline per step
const HOLD = 0.6
const ROW_PX = 26          // a row of the bars
const MAX_PHONE_ROW_PX = 40 // ... and as tall as it gets on phones, where the rows fill the screen
const MIN_ROW_PX = 20      // ... as short as it gets, to leave room for the movers
const MAX_LISTED = 16      // archetypes listed by the bars (the rest are in Other) (the pie too)
const MOVERS_MIN_PX = 176  // the least height of the movers

// Bake into a Pie's colours, by rank: the most played archetype takes the
// first, and so on, up to the 16 the bars list; the archetypes the bars leave
// to Other take Other's colour in the pie too
const FLOW_COLORS = CHART_COLORS
// (an alternative, with other hues: '#f5d08a', '#b5442e', '#d9b8a0', '#c9a24a',
// '#e8806a', '#8c5a3c', '#ffcf99', '#9c4a52', '#d97a3f' after Bake into a Pie's 9)
const OTHER_COLOR = '#3d2a2b'

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
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

// slices: the archetypes (all those over the threshold, listed or not); other:
// the rest, otherTotal: the rest and the archetypes not listed (what the bars
// call Other, so hovering Other lights them all); extra: those not listed.
function Donut({ slices, other, otherTotal, extra, center, hovered, onHover }) {
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
  const activeValue = active && (active.name === 'Other' ? otherTotal : active.value)
  const lit = hovered === 'Other' ? new Set(['Other', ...extra]) : hovered ? new Set([hovered]) : null

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
          opacity={lit && !lit.has(p.name) ? 0.35 : 1}
          onMouseEnter={() => onHover(p.name)} onMouseLeave={() => onHover(null)} />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-white text-[15px] font-semibold">
        {active ? `${activeValue.toFixed(1)}%` : center.value}
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
function Bars({ rows, rowPx, otherLabel, scale, changes, slug, hovered, onHover }) {
  const ranked = [...rows].sort((a, b) => (a.name === 'Other') - (b.name === 'Other') || b.value - a.value)
  const rank = new Map(ranked.map((r, i) => [r.name, i]))
  return (
    <div className="relative" style={{ height: (MAX_LISTED + 1) * rowPx }}>
      {rows.map(r => {
        const change = changes.get(r.name)
        const entered = change && change.previous === 0
        const debut = entered && change.debut
        return (
          <div key={r.name}
            className="absolute inset-x-0 flex items-center gap-2 transition-[top] duration-300 ease-out motion-reduce:transition-none"
            style={{ top: rank.get(r.name) * rowPx, height: rowPx, opacity: hovered && hovered !== r.name ? 0.4 : 1 }}
            onMouseEnter={() => onHover(r.name)} onMouseLeave={() => onHover(null)}>
            {r.name === 'Other' ? (
              <span className="flex-1 min-w-0 sm:flex-none sm:w-48 shrink-0 truncate text-sm max-sm:text-base text-gray-500">{otherLabel}</span>
            ) : (
              <Link to={`/archetypes/${nameToSlug(r.name)}`}
                className={`flex-1 min-w-0 sm:flex-none sm:w-48 shrink-0 truncate text-sm max-sm:text-base hover:text-amber-400 transition-colors ${entered ? 'text-amber-200' : 'text-gray-300'}`}>
                {r.name}
              </Link>
            )}
            {/* a line under the row on narrow screens, where it has no room beside the name */}
            <div className="absolute inset-x-0 bottom-0 h-1 sm:static sm:flex-1 sm:h-2.5 bg-gray-900 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (r.value / scale) * 100)}%`, background: cssFill(r.colors) }} />
            </div>
            <span className="ml-auto sm:ml-0 w-11 max-sm:w-12 shrink-0 text-right text-xs max-sm:text-sm text-gray-400 font-mono">{r.value.toFixed(1)}%</span>
            <span className="w-20 max-sm:w-16 shrink-0 whitespace-nowrap text-right max-sm:[&_.tabular-nums]:!text-sm">
              {change && (
                <span key={slug} className="flow-event-in inline-block">
                  {entered ? (
                    <span className={`px-1.5 max-sm:px-1 py-px rounded-full border text-[11px] font-medium ${debut
                        ? 'border-amber-300/60 bg-amber-300/10 text-amber-300'
                        : 'border-sky-300/60 bg-sky-300/10 text-sky-300'}`}
                      title={debut ? 'Played for the first time' : 'Not played in the previous metagame, but in earlier ones'}>
                      {debut ? 'New' : 'Comeback'}
                    </span>
                  ) : <ShareChange share={change.share} previous={change.previous} debut={change.debut} />}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Whether the viewport matches a media query.
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}

// The metagames' cards on the move (card_movers of each metagame's page data),
// fetched as the timeline reaches them: undefined while loading, null if the
// metagame has none (or `enabled` is off).
const moversCache = new Map()
function useCardMovers(slug, enabled) {
  const [loaded, setLoaded] = useState({ slug: null, movers: undefined })
  useEffect(() => {
    if (!enabled || !slug) return
    let alive = true
    if (!moversCache.has(slug)) {
      moversCache.set(slug, fetch(`/data/metagames/${slug}.json`)
        .then(r => r.ok ? r.json() : null)
        .then(d => (d && d.card_movers) || null)
        .catch(() => { moversCache.delete(slug); return null }))
    }
    moversCache.get(slug).then(movers => { if (alive) setLoaded({ slug, movers }) })
    return () => { alive = false }
  }, [slug, enabled])
  return enabled && loaded.slug === slug ? loaded.movers : undefined
}

// A card of the movers, as a tile filling its cell of the grid: its artwork, as
// on the metagame's page, with how it moved (or, with no previous metagame to
// compare with, how much it is played), and its name.
function MoverTile({ card, cardPages, bindPreview }) {
  const slug = cardLinkSlug(cardPages, card.name)
  const image = card.image
    || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=normal`
  const handlers = bindPreview(card.name, { slug: slug || undefined, image })
  const compared = card.previous_share !== undefined
  const change = compared ? card.share - card.previous_share : 0
  const title = compared
    ? `${card.name}: in ${card.share.toFixed(1)}% of the decks, ${card.previous_share.toFixed(1)}% in the previous metagame`
    : `${card.name}: in ${card.share.toFixed(1)}% of the decks`
  const src = image.replace('/normal/', '/art_crop/').replace('version=normal', 'version=art_crop')
  const content = (
    <>
      <span className="relative block flex-1 min-h-[2.5rem] overflow-hidden bg-gray-900">
        <img src={src} alt={card.name} loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
        <span className={`absolute top-1 right-1 rounded bg-gray-900/85 px-1.5 py-px text-xs font-bold tabular-nums ${!compared ? 'text-amber-400' : change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {compared ? `${change > 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%` : `${card.share.toFixed(1)}%`}
        </span>
      </span>
      <span className="block truncate px-2 py-1 text-xs text-gray-300 group-hover:text-amber-400 transition-colors">{card.name}</span>
    </>
  )
  const className = 'group flex flex-col min-w-0 min-h-0 rounded-lg overflow-hidden bg-gray-800 border border-gray-700 hover:border-amber-400/50 transition-colors'
  return slug
    ? <Link to={`/cards/${slug}`} {...handlers} title={title} className={className}>{content}</Link>
    : <span {...handlers} title={title} className={className}>{content}</span>
}

// The same card as a line of text, for the screens too narrow for the artwork:
// its name and how it moved (or how much it is played).
function MoverRow({ card, cardPages, bindPreview }) {
  const slug = cardLinkSlug(cardPages, card.name)
  const image = card.image
    || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=normal`
  const handlers = bindPreview(card.name, { slug: slug || undefined, image })
  const compared = card.previous_share !== undefined
  const change = compared ? card.share - card.previous_share : 0
  const title = compared
    ? `${card.name}: in ${card.share.toFixed(1)}% of the decks, ${card.previous_share.toFixed(1)}% in the previous metagame`
    : `${card.name}: in ${card.share.toFixed(1)}% of the decks`
  const content = (
    <>
      <span className="truncate min-w-0 flex-1 text-gray-300 group-hover:text-amber-400 transition-colors">{card.name}</span>
      <span className={`shrink-0 font-mono tabular-nums ${!compared ? 'text-amber-400' : change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {compared ? `${change > 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%` : `${card.share.toFixed(1)}%`}
      </span>
    </>
  )
  const className = 'group flex items-baseline gap-2 min-w-0 text-[13px] leading-5'
  return slug
    ? <Link to={`/cards/${slug}`} {...handlers} title={title} className={className}>{content}</Link>
    : <span {...handlers} title={title} className={className}>{content}</span>
}

// The metagame's top movers (or, without a previous metagame with decks, its
// top cards): the cards that gained and lost the most presence in the decks,
// the rising and the falling side by side, filling the room they have: the
// tiles grow with it.
function Movers({ movers, bindPreview, compact }) {
  const cardPages = useCardPages()
  const groups = movers.top
    ? [['Top Cards', movers.top]]
    : [['Top Movers · Rising', movers.up], ['Top Movers · Falling', movers.down]]
  return (
    <div className={`flex-1 min-h-[11rem] grid gap-x-6 ${movers.top ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {groups.filter(([, cards]) => cards.length > 0).map(([title, cards]) => (
        <div key={title} className="min-w-0 min-h-0 flex flex-col">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-1.5">{title}</p>
          <div className={compact
            ? 'grid grid-cols-2 grid-rows-5 grid-flow-col gap-x-4 gap-y-0.5 content-start'
            : `flex-1 min-h-0 grid gap-2 ${movers.top ? 'grid-cols-10 grid-rows-1' : 'grid-cols-5 grid-rows-2'}`}>
            {cards.map(c => compact
              ? <MoverRow key={c.name} card={c} cardPages={cardPages} bindPreview={bindPreview} />
              : <MoverTile key={c.name} card={c} cardPages={cardPages} bindPreview={bindPreview} />)}
          </div>
        </div>
      ))}
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
  // phones: the height left for the pie and the bars (the bars) under the metagame's card
  // (the rows take it all: see rowPx)
  const phone = !useMediaQuery('(min-width: 640px)')
  const [fitEl, setFitEl] = useState(null)
  const [fitHeight, setFitHeight] = useState(0)
  useEffect(() => {
    if (!fitEl) return
    const measure = () => setFitHeight(fitEl.clientHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(fitEl)
    return () => observer.disconnect()
  }, [fitEl])
  // desktops only: smaller screens have room for the pie or the bars alone;
  // below 1280px the movers are lines of text, without the artwork
  const desktop = useMediaQuery('(min-width: 1024px)')
  const wide = useMediaQuery('(min-width: 1280px)')
  const movers = useCardMovers(step ? step.slug : null, desktop && !!(step && step.data))
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
      .map(([name, value]) => ({ name, value }))
  }
  // the bars and the pie share the MAX_LISTED most played archetypes, and
  // their Other has the rest (hovering one the bars don't list lights Other)
  const mostPlayed = [...rows].sort((a, b) => b.value - a.value)
    .map((r, i) => ({ ...r, colors: [FLOW_COLORS[i % FLOW_COLORS.length]] }))
  const listed = mostPlayed.slice(0, MAX_LISTED)
  const extra = mostPlayed.slice(MAX_LISTED)
  const extraNames = new Set(extra.map(r => r.name))
  const otherTotal = other + extra.reduce((sum, r) => sum + r.value, 0)
  const barRows = otherTotal > 0.05 ? [...listed, { name: 'Other', value: otherTotal, colors: [OTHER_COLOR] }] : listed
  const barHovered = hovered && extraNames.has(hovered) ? 'Other' : hovered
  // the bars take the same height in every metagame, so that what is under them
  // stays in place: with the movers, as short as needs be to leave them room
  // (the stage less its padding, the metagame's card (sm:h-48) and the gaps)
  const rowPx = desktop
    ? Math.max(MIN_ROW_PX, Math.min(ROW_PX, Math.floor((stageHeight - 32 - 192 - 32 - MOVERS_MIN_PX) / (MAX_LISTED + 1))))
    : phone && fitHeight
      // the rows fill the screen: MAX_LISTED archetypes and Other
      ? Math.max(ROW_PX, Math.min(MAX_PHONE_ROW_PX, Math.floor(fitHeight / (MAX_LISTED + 1))))
      : ROW_PX
  // the metagame's own changes, held while it blends into the next one
  const changes = new Map(step.data ? step.data.shares.map(([n, share, previous, debut]) => [n, { share, previous, debut }]) : [])
  const m = step.m

  return (
    <div ref={sectionRef} className="relative" style={{ height: total * STEP_PX + stageHeight }}>
      <div className="sticky flex gap-4 lg:gap-6 py-4" style={{ top: headerHeight, height: stageHeight }}>
        <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
          {/* one height for every metagame, so that the pie and the bars stay in place: long B&Rs scroll inside
              (on phones, with the events closed, the header alone, the same for all) */}
          <div className={`bg-gray-800 border border-gray-700 rounded-xl p-4 shrink-0 flex flex-col sm:h-48 ${eventsOpen ? 'h-84' : ''}`}>
            <div className="flex items-start gap-3 flex-wrap">
              <div className="min-w-[12rem] flex-1">
                <p className="text-amber-400 font-semibold">
                  {formatDate(m.date)}
                  {/* how long it lasted, until the next metagame began: not on phones */}
                  {current > 0 && <span className="hidden sm:inline"> ({formatDays(daysBetween(m.date, steps[current - 1].m.date))})</span>}
                </p>
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
            <div className={`${eventsOpen ? 'block mt-3' : 'hidden'} sm:block sm:mt-2 sm:pt-2 sm:border-t border-gray-700 pb-2 flex-1 min-h-0 overflow-y-auto`}>
              <Events metagame={m} poolUrls={poolUrls} bindPreview={bindPreview} />
            </div>
          </div>

          {step.data ? (
            <div className="flex-1 min-h-0 flex flex-col gap-4 lg:gap-6">
              <div ref={setFitEl} className={`${movers ? 'shrink-0' : 'flex-1'} min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-6`}>
                {/* no room for it on phones: the bars tell the same */}
                <div className="hidden sm:block shrink-0 sm:w-56 sm:h-56 lg:w-72 lg:h-72 xl:w-80 xl:h-80 mx-auto lg:mx-0">
                  <Donut slices={listed} other={otherTotal} otherTotal={otherTotal} extra={extraNames} hovered={hovered} onHover={setHovered}
                    center={{ value: step.data.decks.toLocaleString(), label: 'decks' }} />
                </div>
                <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                  <Bars rows={barRows} rowPx={rowPx} otherLabel={extra.length ? 'Other' : 'Other (under 2%)'} scale={scale}
                    changes={changes} slug={step.slug} hovered={barHovered} onHover={setHovered} />
                </div>
              </div>
              {/* desktops: in the room under the pie and the bars */}
              {movers && (
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                  <Movers movers={movers} bindPreview={bindPreview} compact={!wide} />
                </div>
              )}
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

        <div className="w-24 sm:w-32 lg:w-52 shrink-0">
          <Timeline steps={steps} position={position} current={current} onPick={i => scrollToStep(i)} />
        </div>
      </div>
    </div>
  )
}
