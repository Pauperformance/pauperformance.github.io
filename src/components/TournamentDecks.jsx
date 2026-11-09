import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { DeckList, VisualList, Toggle, sortCards, NO_VERSUS } from '../pages/DeckPage'
import MtgoButtons from './MtgoButtons'
import { useCardData, useCardPreview, OracleText } from './CardPreview'
import { useCardPages } from '../utils/cardPages'
import { nameToSlug, pilotToSlug } from '../utils/slugs'

// Whether the screen is wide enough for the decklist to sit beside the list of
// decks (Tailwind's lg); below it the decklist opens under the deck tapped.
function useIsDesktop() {
  const query = '(min-width: 1024px)'
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const onChange = () => setMatches(m.matches)
    m.addEventListener('change', onChange)
    return () => m.removeEventListener('change', onChange)
  }, [])
  return matches
}

// The decklist of the selected deck, with who played it and a link to its page.
// deck: the tournament's entry (id, pilot, archetype, place); data: its deck
// details (undefined while loading, false if they could not be loaded).
function DeckPanel({ deck, data, res, view, onView, hoveredCard, onHover, bindPreview, cardPages, showCardImage }) {
  const { visual, groupByType, sort } = view
  const hoveredData = useCardData(hoveredCard)
  const hoveredImage = hoveredCard && res && (res.images[hoveredCard] || (hoveredData && hoveredData.images[0]))
  const list = (cards, label) => {
    if (!res) return null
    const sorted = sortCards(cards, sort, res.cmc)
    return visual ? (
      <VisualList cards={sorted} label={label} cardImages={res.images} cardTypes={res.types}
        groupByType={groupByType} cardPages={cardPages} bindPreview={bindPreview} />
    ) : (
      <DeckList cards={sorted} label={label} onHover={onHover} bindPreview={bindPreview}
        cardImages={res.images} cardTypes={res.types} groupByType={groupByType} cardPages={cardPages}
        versus={NO_VERSUS} manaCosts={res.costs} />
    )
  }
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-lg font-semibold text-white">
          {deck.pilot && deck.archetype
            ? <Link to={`/players/${pilotToSlug(deck.pilot)}`} className="hover:text-amber-400 transition-colors">{deck.pilot}</Link>
            : (deck.pilot || 'Anonymous')}
          {deck.archetype && (
            <>
              <span className="text-gray-500 font-normal"> · </span>
              <Link to={`/archetypes/${nameToSlug(deck.archetype)}`} className="text-amber-400 hover:text-amber-300 font-normal">{deck.archetype}</Link>
            </>
          )}
          {deck.place && <span className="text-gray-500 font-normal text-sm"> · {deck.place}</span>}
        </p>
        <Link to={`/decks/${deck.id}`} className="text-sm text-amber-400 hover:text-amber-300">Deck page →</Link>
      </div>
      {data === undefined || !res ? (
        <p className="text-gray-500 text-sm">Loading decklist…</p>
      ) : !data || !data.decklist ? (
        <p className="text-gray-500 text-sm">Decklist not available.</p>
      ) : (
        <>
        <div className="flex flex-wrap gap-2">
          <Toggle value={visual} onChange={v => onView({ visual: v })} options={[[false, 'Text'], [true, 'Visual']]} />
          <Toggle value={groupByType} onChange={v => onView({ groupByType: v })} options={[[true, 'Grouped'], [false, 'Ungrouped']]} />
          <Toggle value={sort} onChange={v => onView({ sort: v })} options={[['name', 'A–Z'], ['cmc', 'Mana value']]} />
          <MtgoButtons decklist={data.decklist} fileName={`${deck.id}.txt`} />
        </div>
        <div className="flex gap-6 items-start">
          <div className={`flex-1 min-w-0 ${visual ? 'space-y-6' : 'flex flex-col sm:flex-row gap-8'}`}>
            {list(data.decklist.main, 'Maindeck')}
            {list(data.decklist.side, 'Sideboard')}
          </div>
          {showCardImage && !visual && (
            // the image of the card hovered (an empty card-sized box meanwhile, keeping the place)
            <div className="hidden xl:block w-56 shrink-0 space-y-3">
              {hoveredImage
                ? <img src={hoveredImage} alt={hoveredCard} className="w-full rounded-xl shadow-lg border border-gray-700" />
                : <div className="w-full aspect-[63/88] rounded-xl border border-gray-700" />}
              {hoveredCard && <OracleText card={hoveredData} className="text-sm text-gray-200" />}
            </div>
          )}
        </div>
        </>
      )}
    </div>
  )
}

// Pixels a finger must travel sideways, and mostly sideways, to count as a swipe.
const SWIPE_DISTANCE = 60

const NAV_BUTTON = 'px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

// The decks of a tournament, in one of two views. Table: a narrow list, where
// selecting a deck shows its decklist beside the list on desktop and under the
// deck on phones. Swap: one decklist at a time, swiped (or stepped) to the
// next or previous deck. Desktop shows Table only, phones Swap only.
export default function TournamentDecks({ decks }) {
  const isDesktop = useIsDesktop()
  const mode = isDesktop ? 'table' : 'swap'
  const [selectedId, setSelectedId] = useState(null)
  // which way the last swap went, for the decklist to slide in from that side
  const [direction, setDirection] = useState(0)
  // deck-details by deck id; false for those that failed to load
  const [loaded, setLoaded] = useState({})
  const [res, setRes] = useState(null)
  const [hoveredCard, setHoveredCard] = useState(null)
  // how the decklists are shown, kept while another deck is selected
  const [view, setView] = useState({ visual: false, groupByType: true, sort: 'name' })
  // The panel of the deck selected (beside the list on desktop), its row
  // (opened under it on phones) or the swiper, and whether the visitor just
  // picked it: the page then scrolls so that the player and archetype are at the top.
  const targetRef = useRef(null)
  // Swap on phones: the decklist itself, whose header (player and archetype) goes to the top
  const swapPanelRef = useRef(null)
  const justPicked = useRef(false)
  const swipeStart = useRef(null)
  const cardPages = useCardPages()
  const { bind: bindPreview, preview } = useCardPreview({ sheet: true })

  // the first deck (the winner, where the source lists by place) is open from the start on desktop and in Swap
  const selected = selectedId || (isDesktop || mode === 'swap' ? decks[0]?.id : null)
  const index = Math.max(0, decks.findIndex(d => d.id === selected))

  // the card data the decklists need, loaded once a deck is open
  useEffect(() => {
    if (!selected || res) return
    Promise.all(['card-images', 'card-types', 'card-mana-costs', 'card-cmc'].map(n => fetch(`/data/${n}.json`).then(r => r.json())))
      .then(([images, types, costs, cmc]) => setRes({ images, types, costs, cmc }))
      .catch(() => setRes({ images: {}, types: {}, costs: {}, cmc: {} }))
  }, [selected, res])

  // the page is as tall as it will be once the decklist (and the card data it
  // needs) is in: until then the scroll may fall short, so it is redone
  const contentReady = !!selected && loaded[selected] !== undefined && !!res
  useEffect(() => {
    if (!justPicked.current) return
    const frame = requestAnimationFrame(() => {
      if (contentReady) justPicked.current = false
      const el = mode === 'swap' && !isDesktop ? swapPanelRef.current : targetRef.current
      if (!el) return
      const offset = (document.querySelector('header')?.offsetHeight ?? 64) + 16
      const delta = el.getBoundingClientRect().top - offset
      // Table on desktop: the panel sticks at the top by itself once there, so
      // only scroll to it from above. On phones always align it.
      const scroll = !isDesktop ? Math.abs(delta) > 4 : delta > 4
      if (scroll) window.scrollBy({ top: delta, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [selected, isDesktop, mode, contentReady])

  useEffect(() => {
    if (!selected || selected in loaded) return
    let cancelled = false
    fetch(`/data/deck-details/${selected}.json`)
      .then(r => (r.ok ? r.json() : false))
      .catch(() => false)
      .then(data => { if (!cancelled) setLoaded(prev => ({ ...prev, [selected]: data })) })
    return () => { cancelled = true }
  }, [selected, loaded])

  // Swap: the next (1) or previous (-1) deck
  const step = n => {
    const to = index + n
    if (to < 0 || to >= decks.length) return
    justPicked.current = true
    setDirection(n)
    setSelectedId(decks[to].id)
  }
  // the arrow keys step too, unless the visitor is typing or choosing something
  const stepRef = useRef(step)
  stepRef.current = step
  useEffect(() => {
    if (mode !== 'swap') return
    const onKey = e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowRight') stepRef.current(1)
      if (e.key === 'ArrowLeft') stepRef.current(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  const onTouchStart = e => {
    const t = e.touches[0]
    swipeStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = e => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    // a swipe left shows the next deck, a swipe right the previous one
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1)
  }

  const panelFor = (deck, showCardImage) => (
    <DeckPanel deck={deck} data={loaded[deck.id]} res={res} view={view} onView={patch => setView(v => ({ ...v, ...patch }))} hoveredCard={hoveredCard} onHover={setHoveredCard}
      bindPreview={bindPreview} cardPages={cardPages} showCardImage={showCardImage} />
  )
  const selectedDeck = decks.find(d => d.id === selected)

  const swap = (
    <div ref={targetRef}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <button onClick={() => step(-1)} disabled={index === 0} className={NAV_BUTTON}>‹ Previous</button>
        <span className="text-sm text-gray-400 text-center">
          {index + 1} of {decks.length}{decks[index]?.place ? ` · ${decks[index].place}` : ''}
        </span>
        <button onClick={() => step(1)} disabled={index >= decks.length - 1} className={NAV_BUTTON}>Next ›</button>
      </div>
      {/* sideways swipes are ours, vertical ones still scroll the page */}
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ touchAction: 'pan-y' }}>
        <div key={decks[index]?.id} ref={swapPanelRef} className={direction > 0 ? 'swap-from-right' : direction < 0 ? 'swap-from-left' : ''}>
          {decks[index] && panelFor(decks[index], false)}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-gray-500">
        Swipe the decklist left or right for the next or previous deck.
      </p>
    </div>
  )

  const table = (
    <div className="lg:flex lg:gap-6 lg:items-start">
      <ul className="lg:w-72 lg:shrink-0 border border-gray-700 rounded-xl overflow-hidden bg-gray-900 divide-y divide-gray-700/50">
        {decks.map(d => {
          const open = d.id === selected
          return (
            <li key={d.id} ref={open && !isDesktop ? targetRef : null}>
              <button onClick={() => { justPicked.current = !(open && !isDesktop); setSelectedId(open && !isDesktop ? '' : d.id) }} aria-expanded={open}
                className={`w-full flex items-baseline gap-3 px-3 py-2 text-left border-l-2 transition-colors ${open ? 'bg-gray-800 border-amber-400' : 'border-transparent hover:bg-gray-800/60'}`}>
                <span className="w-12 shrink-0 text-sm text-gray-500 whitespace-nowrap">{d.place || '—'}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${open ? 'text-amber-400' : 'text-gray-200'}`}>{d.pilot || 'Anonymous'}</span>
                  <span className="block truncate text-xs text-gray-500">{d.archetype || 'Unclassified'}</span>
                </span>
              </button>
              {!isDesktop && open && <div className="px-3 pb-4 pt-2 bg-gray-800/30">{panelFor(d, false)}</div>}
            </li>
          )
        })}
      </ul>
      {isDesktop && selectedDeck && (
        // stays in view while the list is scrolled
        <div ref={targetRef} className="flex-1 min-w-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
          {panelFor(selectedDeck, true)}
        </div>
      )}
    </div>
  )

  return (
    <div>
      {preview}
      {mode === 'swap' ? swap : table}
    </div>
  )
}
