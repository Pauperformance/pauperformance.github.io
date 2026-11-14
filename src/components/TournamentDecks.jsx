import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { DeckList, VisualList, Toggle, sortCards, useDeckMetagame, versusOf } from '../pages/DeckPage'
import MtgoButtons from './MtgoButtons'
import { useCardData, useCardPreview, OracleText } from './CardPreview'
import { useCardPages } from '../utils/cardPages'
import { nameToSlug, pilotToSlug } from '../utils/slugs'
import { sourceLabel } from '../utils/sources'

// Whether the screen is wide enough for the decklist to sit beside the list of
// decks (Tailwind's lg); below it the decklist opens under the deck tapped.
export function useIsDesktop() {
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

// What each source says of a deck: its copies, and where they differ. Shown for
// tournaments several sources list, to tell what matches and what doesn't.
function DeckCopies({ deck }) {
  const copies = deck.copies || []
  const differences = Object.entries(deck.differences || {})
  const lists = deck.match === 'different'
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {copies.length > 1
          ? `In ${copies.length} sources${lists ? ', the lists differ' : ', the same list'}`
          : `Only in ${sourceLabel(copies[0]?.source)}`}
      </p>
      <ul className="space-y-0.5">
        {copies.map(c => (
          <li key={c.source} className="text-gray-300">
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">{sourceLabel(c.source)} →</a>
            <span className="text-gray-400">
              {' '}{c.pilot || 'Anonymous'}{c.place ? ` · ${c.place}` : ''}{c.name ? ` · “${c.name}”` : ''}
              {copies.length > 1 && c.counted ? ' · shown here' : ''}
            </span>
          </li>
        ))}
      </ul>
      {deck.place_conflict && (
        <p className="text-amber-500">The sources report incompatible results for the player; the order follows {sourceLabel(copies.find(c => c.place === deck.place)?.source || copies[0]?.source)}.</p>
      )}
      {deck.inconsistent && (
        <p className="text-amber-500">These copies were matched through another one, not directly with each other.</p>
      )}
      {differences.map(([source, cards]) => (
        <details key={source}>
          <summary className="cursor-pointer text-gray-400 hover:text-gray-200">
            {Object.keys(cards).length} card{Object.keys(cards).length !== 1 ? 's differ' : ' differs'} in {sourceLabel(source)}’s list
          </summary>
          <ul className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-xs text-gray-400">
            {Object.entries(cards).map(([card, [here, there]]) => (
              <li key={card}><span className="text-gray-300">{card}</span>: {here} here, {there} there</li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}

// The decklist of the selected deck, with who played it and a link to its page.
// deck: the tournament's entry (id, pilot, archetype, place); data: its deck
// details (undefined while loading, false if they could not be loaded).
function DeckPanel({ deck, several, showArchetype, data, res, view, onView, hoveredCard, onHover, bindPreview, cardPages, showCardImage }) {
  const { visual, groupByType, sort } = view
  const hoveredData = useCardData(hoveredCard)
  const hoveredImage = hoveredCard && res && (res.images[hoveredCard] || (hoveredData && hoveredData.images[0]))
  // the arrows: whether the deck plays more or fewer copies of a card than the
  // typical list of its archetype in the metagame it was played in
  const deckMetagame = useDeckMetagame(data || null)
  const typical = deckMetagame?.typical
  const list = (cards, label, board) => {
    if (!res) return null
    const sorted = sortCards(cards, sort, res.cmc)
    return visual ? (
      <VisualList cards={sorted} label={label} cardImages={res.images} cardTypes={res.types}
        groupByType={groupByType} cardPages={cardPages} bindPreview={bindPreview} />
    ) : (
      <DeckList cards={sorted} label={label} onHover={onHover} bindPreview={bindPreview}
        cardImages={res.images} cardTypes={res.types} groupByType={groupByType} cardPages={cardPages}
        versus={versusOf(typical, board)} metagameCode={deckMetagame?.metagame?.metagame} manaCosts={res.costs} />
    )
  }
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-lg font-semibold text-white">
          {deck.pilot && deck.archetype
            ? <Link to={`/players/${pilotToSlug(deck.pilot)}`} className="hover:text-amber-400 transition-colors">{deck.pilot}</Link>
            : (deck.pilot || 'Anonymous')}
          {deck.archetype && showArchetype && (
            <>
              <span className="text-gray-500 font-normal"> · </span>
              <Link to={`/archetypes/${nameToSlug(deck.archetype)}`} className="text-amber-400 hover:text-amber-300 font-normal">{deck.archetype}</Link>
            </>
          )}
          {deck.place && <span className="text-gray-500 font-normal text-sm"> · {deck.place}</span>}
        </p>
        <Link to={`/decks/${deck.id}`} className="text-sm text-amber-400 hover:text-amber-300">Deck page →</Link>
      </div>
      {/* where the deck was played, when the list shows it by something else (an archetype's decks) */}
      {deck.lead && <p className="-mt-2 text-sm text-gray-400">{deck.lead}{deck.detail ? ` @ ${deck.detail}` : ''}</p>}
      {several && deck.copies && <DeckCopies deck={deck} />}
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
          {/* text view: the lists take their own width, so the card hovered shows beside them, not at the far right */}
          <div className={`min-w-0 ${visual ? 'flex-1 space-y-6' : 'flex flex-col sm:flex-row gap-8'}`}>
            {list(data.decklist.main, 'Maindeck', 'main')}
            {list(data.decklist.side, 'Sideboard', 'side')}
          </div>
          {showCardImage && !visual && (
            // the image of the card hovered (an empty card-sized box meanwhile, keeping the place),
            // with its Oracle text under it, or beside it where there is room (as on a deck page)
            <div className="hidden xl:flex flex-col min-[1800px]:flex-row gap-4 items-start shrink-0 w-56 min-[1800px]:w-[496px]">
              <div className="w-56 shrink-0">
                {hoveredImage
                  ? <img src={hoveredImage} alt={hoveredCard} className="w-full rounded-xl shadow-lg border border-gray-700" />
                  : <div className="w-full aspect-[63/88] rounded-xl border border-gray-700" />}
              </div>
              {hoveredCard && <OracleText card={hoveredData} className="w-56 min-[1800px]:w-64 text-gray-200" />}
            </div>
          )}
        </div>
        {typical && !visual && (
          <p className="text-sm text-gray-500">
            <span className="text-green-400">▲</span> above or <span className="text-red-400">▼</span> below
            the quantity in the typical {data.archetype} list of the metagame.
          </p>
        )}
        </>
      )}
    </div>
  )
}

// Pixels a finger must travel sideways, and mostly sideways, to count as a swipe.
const SWIPE_DISTANCE = 80

const NAV_BUTTON = 'px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

// The decks of a tournament (or of an archetype), in one of two views. Table: a narrow list, where
// selecting a deck shows its decklist beside the list on desktop and under the
// deck on phones. Swap: one decklist at a time, swiped (or stepped) to the
// next or previous deck. Desktop shows Table only, phones Swap only.
// several: whether several sources list the tournament, so that a deck only
// one has, or whose lists differ, is pointed out. Each deck is shown by its
// pilot, `lead` (default: its place) on the left and `detail` (default: its
// archetype) under the pilot; showArchetype: whether the panel names the
// archetype, which is no news on the page of the archetype itself.
export default function TournamentDecks({ decks, several = false, showArchetype = true }) {
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
  const swapAreaRef = useRef(null)
  // Table on desktop: the list and the decklist together
  const tableRef = useRef(null)
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
      const offset = (document.querySelector('header')?.offsetHeight ?? 64) + 16
      if (isDesktop) {
        // Table on desktop: the list and the decklist are lined up with the top of
        // the screen, under the header. Where that would take the deck picked out
        // of view (a long list, scrolled far down), the page stays where it is.
        const wrap = tableRef.current
        const row = wrap?.querySelector('[aria-expanded="true"]')
        if (!wrap || !row) return
        const delta = wrap.getBoundingClientRect().top - offset
        if (Math.abs(delta) <= 4) return
        const rowTop = row.getBoundingClientRect().top - delta
        const visible = rowTop >= offset && rowTop + row.offsetHeight <= window.innerHeight
        if (delta > 0 || visible) window.scrollBy({ top: delta, behavior: 'smooth' })
        return
      }
      const el = mode === 'swap' ? swapPanelRef.current : targetRef.current
      if (!el) return
      const delta = el.getBoundingClientRect().top - offset
      if (Math.abs(delta) > 4) window.scrollBy({ top: delta, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [selected, isDesktop, mode, contentReady])

  // the next deck is in: the card needn't hold its place any more
  useEffect(() => {
    if (contentReady && swapAreaRef.current) swapAreaRef.current.style.minHeight = ''
  }, [contentReady, selected])

  // The deck selected and the ones a swipe or two away are loaded before they
  // are asked for, so that a swipe shows the next decklist at once.
  const requested = useRef(new Set())
  useEffect(() => {
    const ids = [selected, decks[index + 1]?.id, decks[index - 1]?.id, decks[index + 2]?.id].filter(Boolean)
    for (const id of ids) {
      if (id in loaded || requested.current.has(id)) continue
      requested.current.add(id)
      fetch(`/data/deck-details/${id}.json`)
        .then(r => (r.ok ? r.json() : false))
        .catch(() => false)
        .then(data => setLoaded(prev => ({ ...prev, [id]: data })))
    }
  }, [selected, index, decks, loaded])

  // Swap: the next (1) or previous (-1) deck
  // scroll: whether to bring the decklist's header to the top (not after a
  // swipe: the card is where the finger left it)
  const step = (n, scroll = true) => {
    const to = index + n
    if (to < 0 || to >= decks.length) return
    justPicked.current = scroll
    // the card keeps its height until the next one is in: the page below it doesn't move meanwhile
    if (swapAreaRef.current) swapAreaRef.current.style.minHeight = `${swapAreaRef.current.offsetHeight}px`
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

  // Swipes: the decklist is a card that follows the finger and fades as it is
  // dragged. Let go past SWIPE_DISTANCE and it leaves the way it was going
  // (the next or previous deck comes in from the other side); let go before,
  // or at the first or last deck, and it settles back. The card is moved
  // directly, not through state: a decklist is too big to render on every move.
  const dragging = useRef(false)
  const settle = (el, transform, opacity, ms = 200) => {
    el.style.transition = `transform ${ms}ms ease-out, opacity ${ms}ms ease-out`
    el.style.transform = transform
    el.style.opacity = opacity
  }
  // how far the card is dragged for a finger that moved dx: at the ends it only gives a little
  const dragged = dx => ((dx > 0 && index === 0) || (dx < 0 && index >= decks.length - 1) ? dx * 0.25 : dx)
  const onTouchStart = e => {
    const t = e.touches[0]
    swipeStart.current = { x: t.clientX, y: t.clientY }
    dragging.current = false
  }
  const onTouchMove = e => {
    const start = swipeStart.current
    const el = swapPanelRef.current
    if (!start || !el) return
    const t = e.touches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (!dragging.current) {
      // mostly sideways: ours; otherwise the page scrolls
      if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy) * 1.5) return
      dragging.current = true
    }
    const d = dragged(dx)
    el.style.animation = 'none'
    el.style.transition = 'none'
    el.style.transform = `translateX(${d}px) rotate(${d / 60}deg)`
    el.style.opacity = String(1 - Math.min(Math.abs(d) / (window.innerWidth * 0.9), 0.85))
  }
  const onTouchEnd = e => {
    const start = swipeStart.current
    swipeStart.current = null
    const el = swapPanelRef.current
    if (!start || !dragging.current || !el) return
    dragging.current = false
    const dx = e.changedTouches[0].clientX - start.x
    const to = dx < 0 ? 1 : -1 // a swipe left shows the next deck, a swipe right the previous one
    if (Math.abs(dx) >= SWIPE_DISTANCE && index + to >= 0 && index + to < decks.length) {
      // it keeps going the way it was dragged, fading out, then the next deck comes in
      settle(el, `translateX(${dx < 0 ? '-' : ''}${window.innerWidth}px) rotate(${dx < 0 ? '-' : ''}6deg)`, '0', 120)
      setTimeout(() => step(to, false), 100)
    } else {
      settle(el, 'none', '1')
    }
  }
  const onTouchCancel = () => {
    swipeStart.current = null
    if (dragging.current && swapPanelRef.current) settle(swapPanelRef.current, 'none', '1')
    dragging.current = false
  }

  const panelFor = (deck, showCardImage) => (
    <DeckPanel deck={deck} several={several} showArchetype={showArchetype} data={loaded[deck.id]} res={res} view={view} onView={patch => setView(v => ({ ...v, ...patch }))} hoveredCard={hoveredCard} onHover={setHoveredCard}
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
      <div ref={swapAreaRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel} style={{ touchAction: 'pan-y' }}>
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
    <div ref={tableRef} className="lg:flex lg:gap-6 lg:items-start">
      <ul className="lg:w-80 xl:w-[26rem] lg:shrink-0 border border-gray-700 rounded-xl overflow-hidden bg-gray-900 divide-y divide-gray-700/50">
        {decks.map(d => {
          const open = d.id === selected
          return (
            <li key={d.id} ref={open && !isDesktop ? targetRef : null}>
              <button onClick={() => { justPicked.current = !(open && !isDesktop); setSelectedId(open && !isDesktop ? '' : d.id) }} aria-expanded={open}
                className={`w-full flex items-baseline gap-3 px-3 py-2 text-left border-l-2 transition-colors ${open ? 'bg-gray-800 border-amber-400' : 'border-transparent hover:bg-gray-800/60'}`}>
                <span className={`${decks.some(x => x.lead) ? 'w-24' : 'w-12'} shrink-0 text-sm text-gray-500 whitespace-nowrap`}>{d.lead ?? d.place ?? '—'}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${open ? 'text-amber-400' : 'text-gray-200'}`}>{d.pilot || 'Anonymous'}</span>
                  <span className="block truncate text-xs text-gray-500">{d.detail ?? d.archetype ?? 'Unclassified'}</span>
                  {several && d.copies && (d.copies.length === 1 || d.match === 'different') && (
                    <span className="block truncate text-xs text-amber-600">
                      {d.copies.length === 1 ? `only in ${sourceLabel(d.copies[0].source)}` : 'lists differ'}
                    </span>
                  )}
                </span>
              </button>
              {!isDesktop && open && <div className="px-3 pb-4 pt-2 bg-gray-800/30">{panelFor(d, false)}</div>}
            </li>
          )
        })}
      </ul>
      {isDesktop && selectedDeck && (
        // stays in view while the list is scrolled; a fixed height, so that the page doesn't change height from one deck to the next
        <div ref={targetRef} className="flex-1 min-w-0 sticky top-24 h-[calc(100vh-7rem)] overflow-y-auto">
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
