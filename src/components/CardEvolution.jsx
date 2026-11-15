import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Timeline, MoverTile, MoverRow, useHeaderHeight, useViewportHeight, metagameTitle, STEP_PX } from './MetagameFlow'
import { formatDate } from '../utils/dates'
import { metagameSlug, nameToSlug } from '../utils/slugs'
import { scrollGently } from '../utils/scroll'
import { useCardPages } from '../utils/cardPages'
import { useMediaQuery } from '../utils/useMediaQuery'

// How the archetype's cards changed over the metagames: the page scrolls
// through them, newest first, while the timeline stays on screen, and each
// metagame shows the cards that gained and lost the most presence in the
// archetype's decks since the previous one (as the Metagames page does for all
// the archetypes), the main deck's and the sideboard's apart. Cards printed
// since, and cards banned or unbanned since, are marked.
//
// Counts come from Myr (archetype-typical/<slug>.json): for each metagame and
// board, the decks playing at least 1, 2... copies of each card. A card's
// presence is the share of the archetype's decks playing it.

// metagames with fewer decks of the archetype than this say too little to compare
const MIN_DECKS = 5
// movers shown for each direction (and the most played, with no previous metagame to compare with)
const SHOWN = 5
const TOP_SHOWN = 10
// the most marked cards (new, banned...) that may take the place of bigger movers
const MAX_MARKED = 4
const BOARDS = [['main', 'Main deck'], ['side', 'Sideboard']]

// Basic lands are left out, as on the Metagames page (scripts/build-data.mjs,
// cardMovers): their counts follow the mana bases.
const BASIC_LAND = /^(Snow-Covered )?(Plains|Island|Swamp|Mountain|Forest|Wastes)$/

// The board of a metagame: card -> % of the decks playing it.
function boardOf(counts, decks) {
  const board = new Map()
  for (const [card, perK] of Object.entries(counts || {})) {
    if (perK[0] > 0 && !BASIC_LAND.test(card)) board.set(card, (perK[0] / decks) * 100)
  }
  return board
}

// The cards gaining and losing the most presence between two boards, or (with
// no previous one) the most played. Marked cards (new, banned or unbanned)
// are kept even when they moved less than the others.
function moversOf(board, previous, marksOf) {
  if (!previous) {
    const top = [...board].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, TOP_SHOWN)
      .map(([name, share]) => ({ name, share }))
    return { top }
  }
  const changes = []
  for (const name of new Set([...board.keys(), ...previous.keys()])) {
    const share = board.get(name) || 0
    const before = previous.get(name) || 0
    if (share !== before) changes.push({ name, share, previous_share: before, change: share - before })
  }
  const pick = (list, marked) => {
    const top = list.slice(0, SHOWN)
    const kept = new Set(top.map(c => c.name))
    const extra = list.filter(c => !kept.has(c.name) && marked(c)).slice(0, MAX_MARKED)
    return [...top.slice(0, SHOWN - extra.length), ...extra].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
  }
  const up = changes.filter(c => c.change > 0).sort((a, b) => b.change - a.change)
  const down = changes.filter(c => c.change < 0).sort((a, b) => a.change - b.change)
  return {
    up: pick(up, c => marksOf(c.name).some(m => m.tone === 'new' || m.tone === 'unbanned')),
    down: pick(down, c => marksOf(c.name).some(m => m.tone === 'banned')),
  }
}

// One board of one metagame: its top movers, rising and falling side by side.
function Board({ title, movers, marksOf, info, bindPreview, tiles }) {
  const cardPages = useCardPages()
  const withImage = c => ({ ...c, image: info[c.name]?.preview })
  const groups = movers.top
    ? [['Most played', movers.top]]
    : [['Top Movers · Rising', movers.up], ['Top Movers · Falling', movers.down]]
  return (
    <div className="min-w-0 min-h-0 flex-1 flex flex-col bg-gray-800 border border-gray-700 rounded-xl px-3 pt-2 pb-3 gap-1.5 overflow-y-auto no-scrollbar">
      <p className="text-xs uppercase tracking-widest text-gray-300 shrink-0">{title}</p>
      {/* with the artwork, rising above falling: each a row of 5 tiles filling the height; as lines of text, side by side */}
      <div className={`flex-1 min-h-0 ${tiles ? 'flex flex-col gap-2' : `grid gap-x-5 ${movers.top ? 'grid-cols-1' : 'grid-cols-2'}`}`}>
        {groups.map(([group, cards]) => (
          <div key={group} className={`min-w-0 min-h-0 flex flex-col ${tiles ? 'flex-1' : ''}`}>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1 shrink-0">{group}</p>
            {cards.length === 0 ? <p className="text-sm text-gray-500 py-2">None.</p> : (
              <div className={tiles
                ? `flex-1 min-h-0 grid gap-2 grid-cols-5 ${movers.top ? 'grid-rows-2' : 'grid-rows-1'}`
                : 'grid grid-cols-1 gap-y-0.5 content-start'}>
                {cards.map(c => tiles
                  ? <MoverTile key={c.name} card={withImage(c)} cardPages={cardPages} bindPreview={bindPreview} badges={marksOf(c.name)} large />
                  : <MoverRow key={c.name} card={withImage(c)} cardPages={cardPages} bindPreview={bindPreview} badges={marksOf(c.name)} />)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// name: the archetype; series: its popularity ([[slug, decks, rank]...]).
export default function CardEvolution({ name, series, bindPreview }) {
  const rootRef = useRef(null)
  const [near, setNear] = useState(false)
  const [counts, setCounts] = useState(null)
  const [index, setIndex] = useState(null)
  const [error, setError] = useState(false)

  // the metagame index is large: only fetched once the section is close
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true) }, { rootMargin: '800px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!near) return
    let alive = true
    Promise.all([
      fetch(`/data/archetype-typical/${nameToSlug(name)}.json`).then(r => r.json()),
      fetch('/data/metagame_index.json').then(r => r.json()),
    ]).then(([c, i]) => { if (alive) { setCounts(c); setIndex(i) } }).catch(() => alive && setError(true))
    return () => { alive = false }
  }, [near, name])

  // the metagames with enough decks, newest first: their boards, and what the
  // metagames since the previous one of them brought
  const steps = useMemo(() => {
    if (!counts || !index) return []
    const decksOf = new Map(series.map(([slug, decks]) => [slug, decks]))
    const withData = index.filter(m => {
      const c = counts.by_metagame[m.metagame || m.p13m]
      return c && (decksOf.get(metagameSlug(m)) || 0) >= MIN_DECKS
    })
    return withData.map((m, i) => {
      const prev = withData[i - 1]
      // the oldest has no previous metagame to be new since: only its own sets and B&Rs count
      const since = prev ? index.filter(x => x.date <= m.date && x.date > prev.date) : [m]
      const c = counts.by_metagame[m.metagame || m.p13m]
      const decks = decksOf.get(metagameSlug(m))
      return {
        m, slug: metagameSlug(m), decks, data: true,
        boards: { main: boardOf(c.main, decks), side: boardOf(c.side, decks) },
        newCards: new Set(since.flatMap(x => x.sets.flatMap(s => s.cards.map(k => k.name)))),
        banned: new Set(since.flatMap(x => x.bans.flatMap(b => b.banned))),
        unbanned: new Set(since.flatMap(x => x.bans.flatMap(b => b.unbanned))),
        newSets: since.flatMap(x => x.sets),
      }
    }).reverse().map((s, i) => ({ ...s, start: i, weight: 1 }))
  }, [counts, index, series])

  const headerHeight = useHeaderHeight()
  const viewportHeight = useViewportHeight()
  const stageHeight = Math.max(460, viewportHeight - headerHeight)
  const sectionRef = useRef(null)
  const [u, setU] = useState(0)
  useEffect(() => {
    if (!steps.length) return
    let frame = 0
    const update = () => {
      frame = 0
      const el = sectionRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top - headerHeight
      setU(Math.min(Math.max(-top / STEP_PX, 0), steps.length - 1))
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
  }, [steps, headerHeight])

  // animated: an eased scroll through the metagames in between; otherwise a jump
  const scrollToStep = useCallback((i, animated = true) => {
    const el = sectionRef.current
    if (!el) return
    const top = window.scrollY + el.getBoundingClientRect().top - headerHeight + i * STEP_PX + 1
    if (animated) scrollGently(top)
    else window.scrollTo(0, top)
  }, [headerHeight])

  // the arrow keys step through the metagames, a dot at a time, while the section fills the screen
  const currentRef = useRef(0)
  currentRef.current = Math.round(u)
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

  // phones show one board at a time; below 1024px the movers are lines of text, without the artwork
  const wide = useMediaQuery('(min-width: 768px)')
  const tiles = useMediaQuery('(min-width: 1024px)')
  const [phoneBoard, setPhoneBoard] = useState('main')

  const current = Math.round(u)
  const step = steps[current]
  const older = steps[current + 1]
  // the marks of the cards: printed since the previous metagame, banned or unbanned since
  const marksOf = useMemo(() => cardName => {
    if (!step) return []
    return [
      step.newCards.has(cardName) && { tone: 'new', label: 'New', title: 'Printed since the previous metagame with decks' },
      step.banned.has(cardName) && { tone: 'banned', label: 'Banned', title: 'Banned since the previous metagame with decks' },
      step.unbanned.has(cardName) && { tone: 'unbanned', label: 'Unbanned', title: 'Unbanned since the previous metagame with decks' },
    ].filter(Boolean)
  }, [step])
  const movers = useMemo(() => step && Object.fromEntries(BOARDS.map(([k]) =>
    [k, moversOf(step.boards[k], older ? older.boards[k] : null, marksOf)])), [step, older, marksOf])

  let body
  if (error) body = <p className="text-gray-400 text-sm py-8 text-center">The evolution could not be loaded.</p>
  else if (!near || !counts || !index) body = <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
  else if (steps.length < 2) body = <p className="text-gray-500 text-sm py-8 text-center">Not enough metagames with {MIN_DECKS}+ decks of this archetype to compare.</p>
  else {
    const m = step.m
    const boards = wide ? BOARDS : BOARDS.filter(([k]) => k === phoneBoard)
    body = (
      <div ref={sectionRef} className="relative" style={{ height: (steps.length - 1) * STEP_PX + stageHeight }}>
        <div className="sticky flex gap-3 lg:gap-6 py-2" style={{ top: headerHeight, height: stageHeight }}>
          <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-hidden">
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 shrink-0 space-y-0.5">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="min-w-[10rem] flex-1">
                  <p className="text-amber-400 font-semibold">{formatDate(m.date)} <span className="text-gray-500 font-normal text-sm">· {step.decks} decks</span></p>
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
              {(step.newSets.length > 0 || step.banned.size > 0 || step.unbanned.size > 0) && (
                <p className="text-xs text-gray-400 line-clamp-2">
                  {step.newSets.length > 0 && <span><span className="text-gray-500 uppercase tracking-wide mr-1">New</span>{step.newSets.map(s => s.name).join(', ')}. </span>}
                  {step.banned.size > 0 && <span><span className="text-red-400/80 mr-1">Banned</span>{[...step.banned].join(', ')}. </span>}
                  {step.unbanned.size > 0 && <span><span className="text-green-400/80 mr-1">Unbanned</span>{[...step.unbanned].join(', ')}.</span>}
                </p>
              )}
              {!wide && (
                <div className="inline-flex rounded-lg border border-gray-600 overflow-hidden text-xs font-semibold mt-1">
                  {BOARDS.map(([k, label]) => (
                    <button key={k} onClick={() => setPhoneBoard(k)}
                      className={`px-3 py-1 ${phoneBoard === k ? 'bg-amber-400 text-gray-900' : 'text-gray-400'}`}>{label}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              {boards.map(([k, label]) => (
                <Board key={k} title={label} movers={movers[k]} marksOf={marksOf} info={counts.cards} bindPreview={bindPreview} tiles={tiles} />
              ))}
            </div>
          </div>
          <div className="w-24 sm:w-32 lg:w-44 shrink-0">
            <Timeline steps={steps} position={u} current={current} onPick={scrollToStep} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef}>
      <p className="text-sm text-gray-400 mb-3">
        Scroll through the metagames to see the cards the archetype adopted and dropped: the ones gaining and losing the most
        presence in its decks since the previous metagame. Metagames with fewer than {MIN_DECKS} decks are skipped.
      </p>
      {body}
    </div>
  )
}
