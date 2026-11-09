import { Fragment, useRef, useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { nameToSlug } from '../utils/slugs'
import Layout from '../components/Layout'
import MtgoButtons from '../components/MtgoButtons'
import ManaCurve from '../components/ManaCurve'
import ManaCost from '../components/ManaCost'
import { ColorsPie, CardTypesRadar, SampleHand } from '../components/DeckStats'
import VideosSection from '../components/VideosSection'
import { OracleText, useCardData, useCardPreview } from '../components/CardPreview'
import { cardLinkSlug, useCardPages } from '../utils/cardPages'
import { MetagameBadge } from '../components/Metagame'
import { computeTypicalList } from '../utils/typicalList'
import { formatDate } from '../utils/dates'

// fewer decks than this in the metagame make for a noisy typical list: no arrows
const MIN_DECKS_FOR_COMPARISON = 3

// The metagame the deck was played in (the latest one starting on or before
// the tournament) and the typical list of its archetype in it, with the
// archetype's videos. The archetype's timeline lists every metagame since its
// first deck: metagame is null for a deck older than that. null until loaded,
// or for decks with no archetype.
function useDeckMetagame(deck) {
  const [state, setState] = useState(null)
  useEffect(() => {
    setState(null)
    if (!deck || !deck.archetype || !deck.tournament_date) return
    let cancelled = false
    const slug = nameToSlug(deck.archetype)
    const get = url => fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null)
    Promise.all([get(`/data/archetype-details/${slug}.json`), get(`/data/archetype-typical/${slug}.json`)])
      .then(([details, counts]) => {
        const timeline = details?.typical_list?.timeline || []
        let index = -1
        timeline.forEach((m, i) => { if (m.date <= deck.tournament_date) index = i })
        if (cancelled) return
        const metagame = index >= 0 ? timeline[index] : null
        let typical = null
        if (metagame && counts?.by_metagame?.[metagame.metagame]) {
          const list = computeTypicalList(timeline, counts, index, index)
          if (list.decks >= MIN_DECKS_FOR_COMPARISON) {
            const byName = board => new Map(board.map(c => [c.name, c.typical]))
            typical = { decks: list.decks, main: byName(list.main), side: byName(list.side) }
          }
        }
        setState({ metagame, typical, videos: details?.videos || [] })
      })
    return () => { cancelled = true }
  }, [deck])
  return state
}

// Whether the deck plays more or fewer copies of a card than the typical list
// of its metagame: 1, -1 or 0 (also when there is nothing to compare to).
function comparison(typical, board, c) {
  if (!typical) return 0
  return Math.sign(c.qty - (typical[board].get(c.name) || 0))
}

// A card type's plural, as a group heading: Sorcery -> Sorceries
const pluralType = t => (t.endsWith('y') ? `${t.slice(0, -1)}ies` : `${t}s`)

const TYPE_ORDER =['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Sticker', 'Other']
const TYPE_PRIORITY = ['Land', 'Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Sticker']

// What a board's cards are compared with: diff(card) is 1 above the typical
// list, -1 below, 0 otherwise; title(card) explains the arrow.
function versusOf(typical, board) {
  return {
    diff: c => comparison(typical, board, c),
    title: (c, code) => {
      const d = comparison(typical, board, c)
      if (!d) return undefined
      const n = typical[board].get(c.name) || 0
      return `${d > 0 ? 'Above' : 'Below'} the typical list of metagame ${code}: ${n === 0 ? 'not played' : `${n} ${n === 1 ? 'copy' : 'copies'}`}`
    },
  }
}

function CardName({ c, onHover, cardPages, versus, metagameCode, manaCost, bindPreview, image }) {
  const slug = cardLinkSlug(cardPages, c.name)
  // on touch devices a tap opens the preview sheet (the hover panel is desktop only)
  const tap = bindPreview(c.name, { slug: slug || undefined, image, hover: false })
  const hover = { ...tap, onMouseEnter: () => onHover(c.name), onMouseLeave: () => onHover(null) }
  return (
    <li className="flex items-baseline gap-2">
      <span className="w-3 text-center shrink-0 text-xs" title={versus.title(c, metagameCode)}>
        {versus.diff(c) > 0 && <span className="text-green-400">▲</span>}
        {versus.diff(c) < 0 && <span className="text-red-400">▼</span>}
      </span>
      <span className="w-5 text-right text-gray-500 shrink-0">{c.qty}</span>
      {/* Cards with no page (banned, misspelt) are plain text. */}
      {slug ? (
        <Link to={`/cards/${slug}`} className="text-gray-200 hover:text-amber-400 transition-colors" {...hover}>
          {c.name}
        </Link>
      ) : (
        <span className="text-gray-200" {...hover}>{c.name}</span>
      )}
      {/* the cost lines up on the right of the column */}
      {manaCost && <span className="ml-auto pl-3 self-center" {...hover}><ManaCost cost={manaCost} size="w-4 h-4" /></span>}
    </li>
  )
}

// The cards split by type, in display order: [[type, cards], ...].
function groupCards(cards, cardTypes) {
  const groups = {}
  cards.forEach(c => {
    const types = cardTypes[c.name] || []
    const key = TYPE_PRIORITY.find(t => types.includes(t)) || 'Other'
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  })
  return TYPE_ORDER.filter(t => groups[t]).map(t => [t, groups[t]])
}

function CardTile({ c, cardPages, bindPreview, image }) {
  const slug = cardLinkSlug(cardPages, c.name)
  // the card's Oracle text pops up beside it on hover (its image is already there)
  const bound = bindPreview(c.name, { slug: slug || undefined, image, showImage: false })
  const picture = image
    ? <img src={image} alt={c.name} loading="lazy" className="w-full aspect-[63/88] rounded-xl bg-gray-800 object-cover shadow-lg border border-gray-700" />
    : <div className="w-full aspect-[63/88] rounded-xl bg-gray-800 border border-gray-700 p-2 text-xs text-gray-300">{c.name}</div>
  const content = (
    <>
      {picture}
      <span className="absolute bottom-1 left-1 min-w-6 px-1.5 py-0.5 rounded-full bg-gray-900/90 border border-gray-600 text-center text-xs font-bold text-white">
        {c.qty}×
      </span>
    </>
  )
  // same size as the cards of the sample hand
  const cls = 'relative block w-[calc((100%-1rem)/3)] sm:w-36 lg:w-48 hover:brightness-110 transition'
  return slug
    ? <Link to={`/cards/${slug}`} className={cls} {...bound}>{content}</Link>
    : <div className={cls} {...bound}>{content}</div>
}

export function VisualList({ cards, label, cardImages, cardTypes, groupByType, cardPages, bindPreview }) {
  if (!cards || !cards.length) return null
  const total = cards.reduce((sum, c) => sum + c.qty, 0)
  const grid = list => (
    <div className="flex flex-wrap gap-2">
      {list.map((c, i) => <CardTile key={i} c={c} cardPages={cardPages} bindPreview={bindPreview} image={cardImages[c.name]} />)}
    </div>
  )
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {label} <span className="text-gray-600">({total})</span>
      </h3>
      {groupByType ? groupCards(cards, cardTypes).map(([t, list]) => (
        <div key={t}>
          <p className="text-xs text-gray-600 uppercase tracking-wider mt-3 mb-1">
            {pluralType(t)} <span className="text-gray-700">({list.reduce((sum, c) => sum + c.qty, 0)})</span>
          </p>
          {grid(list)}
        </div>
      )) : grid(cards)}
    </div>
  )
}

// The cards sorted by mana value, then by name; the alphabetical order is the deck's own.
export function sortCards(cards, sort, cmc) {
  if (!cards || sort !== 'cmc') return cards
  return [...cards].sort((a, b) => (cmc[a.name] ?? 0) - (cmc[b.name] ?? 0) || a.name.localeCompare(b.name))
}

export function Toggle({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-600 overflow-hidden text-sm font-medium">
      {options.map(([v, text], i) => (
        <Fragment key={String(v)}>
          {i > 0 && <div className="w-px bg-gray-600" />}
          <button onClick={() => onChange(v)}
            className={`px-3 py-1.5 transition-colors ${value === v ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
            {text}
          </button>
        </Fragment>
      ))}
    </div>
  )
}

// What a decklist is compared with when there is nothing to compare it to.
export const NO_VERSUS = { diff: () => 0, title: () => undefined }

export function DeckList({ cards, label, onHover, bindPreview, cardImages, cardTypes, groupByType, cardPages, versus, metagameCode, manaCosts }) {
  if (!cards || !cards.length) return null
  const total = cards.reduce((sum, c) => sum + c.qty, 0)

  let content
  if (groupByType) {
    const groups = {}
    cards.forEach(c => {
      const types = cardTypes[c.name] || []
      const key = TYPE_PRIORITY.find(t => types.includes(t)) || 'Other'
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    })
    content = TYPE_ORDER.filter(t => groups[t]).map(t => {
      const groupTotal = groups[t].reduce((sum, c) => sum + c.qty, 0)
      return (
        <div key={t}>
          <p className="text-xs text-gray-600 uppercase tracking-wider mt-3 mb-1">
            {pluralType(t)} <span className="text-gray-700">({groupTotal})</span>
          </p>
          <ul className="space-y-0.5">
            {groups[t].map((c, i) => <CardName key={i} c={c} onHover={onHover} cardPages={cardPages} versus={versus} metagameCode={metagameCode} manaCost={manaCosts[c.name]} bindPreview={bindPreview} image={cardImages[c.name]} />)}
          </ul>
        </div>
      )
    })
  } else {
    content = (
      <ul className="space-y-0.5">
        {cards.map((c, i) => <CardName key={i} c={c} onHover={onHover} cardPages={cardPages} versus={versus} metagameCode={metagameCode} manaCost={manaCosts[c.name]} bindPreview={bindPreview} image={cardImages[c.name]} />)}
      </ul>
    )
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {label} <span className="text-gray-600">({total})</span>
      </h3>
      {content}
    </div>
  )
}

export default function DeckPage() {
  const { id } = useParams()
  const [deck, setDeck] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [cardImages, setCardImages] = useState({})
  const [cardTypes, setCardTypes] = useState({})
  const [manaCosts, setManaCosts] = useState({})
  const [hoveredCard, setHoveredCard] = useState(null)
  const [groupByType, setGroupByType] = useState(true)
  const [visual, setVisual] = useState(false)
  const [sort, setSort] = useState('name')
  const [cmc, setCmc] = useState({})
  // Width of the lists and of the hover panel beside them in the text view:
  // the visual view (which has no panel) takes both on desktop, so the
  // charts beside them don't move.
  const listsRef = useRef(null)
  const panelRef = useRef(null)
  const [listsWidth, setListsWidth] = useState(null)
  const changeVisual = v => {
    if (v && listsRef.current) {
      const panel = panelRef.current ? panelRef.current.offsetWidth : 0
      // 2rem: the gap between the lists and the panel
      setListsWidth(listsRef.current.offsetWidth + (panel ? panel + 32 : 0))
    }
    setVisual(v)
  }
  const cardPages = useCardPages()
  const { bind: bindPreview, preview } = useCardPreview({ sheet: true })
  // Oracle text of the hovered card, shown next to its image; also supplies
  // the image of double-faced cards, listed by their front face only.
  const hoveredData = useCardData(hoveredCard)
  const deckMetagame = useDeckMetagame(deck)
  const typical = deckMetagame?.typical
  const hoveredImage = hoveredCard && (cardImages[hoveredCard] || (hoveredData && hoveredData.images[0]))
  useEffect(() => {
    Promise.all([
      fetch('/data/card-images.json').then(r => r.json()),
      fetch('/data/card-types.json').then(r => r.json()),
      fetch('/data/card-mana-costs.json').then(r => r.json()),
      fetch('/data/card-cmc.json').then(r => r.json()),
    ]).then(([images, types, costs, values]) => {
      setCmc(values)
      setCardImages(images)
      setCardTypes(types)
      setManaCosts(costs)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setDeck(null)
    fetch(`/data/deck-details/${id}.json`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setDeck(data); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [id])

  // Pilot, result and source: above the decklist, in its column.
  const factsRow = deck && (
    <div className="flex flex-wrap gap-4">
      <div>
        <p className="text-base text-gray-500 mb-0.5">Pilot</p>
        <p className="font-medium text-gray-200">{deck.pilot || 'Anonymous'}</p>
      </div>
      {deck.place && (
        <div>
          <p className="text-base text-gray-500 mb-0.5">Result</p>
          <p className="font-medium text-gray-200">{deck.place}</p>
        </div>
      )}
      {/* Prices, hidden for now.
      {deck.mtgo_price && (
        <div>
          <p className="text-base text-gray-500 mb-0.5">MTGO</p>
          <p className="font-medium text-gray-200">{deck.mtgo_price} tix</p>
        </div>
      )}
      {deck.tabletop_price && (
        <div>
          <p className="text-base text-gray-500 mb-0.5">Paper</p>
          <p className="font-medium text-gray-200">${deck.tabletop_price}</p>
        </div>
      )}
      */}
      <div>
        <p className="text-base text-gray-500 mb-0.5">Source</p>
        <a href={deck.url} target="_blank" rel="noopener noreferrer"
          className="text-amber-400 hover:text-amber-300">
          {/* the older decks link Wizards' results page on the Wayback Machine */}
          {deck.url?.startsWith('https://web.archive.org/') ? 'Wayback Machine →' : 'MTGGoldfish →'}
        </a>
      </div>
    </div>
  )

  return (
    <Layout>
      {preview}
      <div className="space-y-6">
        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {notFound && (
          <p className="text-gray-400">
            Deck not found.{' '}
            <Link to="/archetypes" className="text-amber-400 hover:text-amber-300">Back to archetypes</Link>
          </p>
        )}

        {deck && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {deck.archetype
                  ? <><Link to={`/archetypes/${nameToSlug(deck.archetype)}`} className="text-amber-400 hover:text-amber-300 transition-colors">{deck.archetype}</Link><span className="text-white"> by {deck.pilot || 'Anonymous'}</span></>
                  : deck.pilot || 'Anonymous'}
              </h1>
              <p className="mt-2 text-gray-400">
                Played on {formatDate(deck.tournament_date)} @ {deck.tournament_name}
              </p>
              {deckMetagame?.metagame && (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-400">
                  <span>Metagame:</span>
                  <MetagameBadge metagame={deckMetagame.metagame} />
                  <span>{deckMetagame.metagame.name}</span>
                </p>
              )}
            </div>

            {deck.decklist ? (
              <>
                {/* The charts are the last column, starting at the height of the Pilot label: on screens too narrow for it they wrap under the left column. */}
                <div className="flex flex-wrap gap-x-8 gap-y-8 2xl:flex-nowrap items-start">
                <div className="space-y-6 min-w-0">
                {factsRow}
                <div className="flex flex-wrap gap-2">
                  <Toggle value={visual} onChange={changeVisual} options={[[false, 'Text'], [true, 'Visual']]} />
                  <Toggle value={groupByType} onChange={setGroupByType} options={[[true, 'Grouped'], [false, 'Ungrouped']]} />
                  <Toggle value={sort} onChange={setSort} options={[['name', 'A–Z'], ['cmc', 'Mana value']]} />
                  <MtgoButtons decklist={deck.decklist} fileName={`${id}.txt`} />
                  {/* Buy Deck button, hidden for now.
                  <a
                    href={`https://pauperformance.market/wizard?deck=https://pauperformance.com/decks/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                    🛒 Buy Deck
                  </a>
                  */}
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-8 items-start">
                  <div ref={listsRef} className={`space-y-4 ${visual && listsWidth ? 'lg:w-[var(--lists-width)] lg:shrink-0' : ''}`}
                    style={visual && listsWidth ? { '--lists-width': `${listsWidth}px` } : undefined}>
                    {visual ? (
                      <div className="space-y-6">
                        <VisualList cards={sortCards(deck.decklist.main, sort, cmc)} label="Maindeck" cardImages={cardImages} cardTypes={cardTypes}
                          groupByType={groupByType} cardPages={cardPages} bindPreview={bindPreview} />
                        <VisualList cards={sortCards(deck.decklist.side, sort, cmc)} label="Sideboard" cardImages={cardImages} cardTypes={cardTypes}
                          groupByType={groupByType} cardPages={cardPages} bindPreview={bindPreview} />
                      </div>
                    ) : (
                      <div className="flex flex-col items-start sm:flex-row gap-8">
                        <DeckList cards={sortCards(deck.decklist.main, sort, cmc)} label="Maindeck" onHover={setHoveredCard} bindPreview={bindPreview} cardImages={cardImages}
                          cardTypes={cardTypes} groupByType={groupByType} cardPages={cardPages} manaCosts={manaCosts}
                          versus={versusOf(typical, 'main')} metagameCode={deckMetagame?.metagame?.metagame} />
                        <DeckList cards={sortCards(deck.decklist.side, sort, cmc)} label="Sideboard" onHover={setHoveredCard} bindPreview={bindPreview} cardImages={cardImages}
                          cardTypes={cardTypes} groupByType={groupByType} cardPages={cardPages} manaCosts={manaCosts}
                          versus={versusOf(typical, 'side')} metagameCode={deckMetagame?.metagame?.metagame} />
                      </div>
                    )}
                    {typical && !visual && (
                      <p className="text-sm text-gray-500">
                        <span className="text-green-400">▲</span> above or <span className="text-red-400">▼</span> below
                        the quantity in the typical {deck.archetype} list of the metagame.
                      </p>
                    )}
                  </div>
                  {/* xl: the width of the image and the Oracle text, so the charts don't move when a card is hovered */}
                  {!visual && (
                    <div ref={panelRef} className="hidden lg:flex flex-col xl:flex-row gap-4 items-start shrink-0 sticky top-8 xl:w-[496px]">
                      <div className="w-56 shrink-0">
                        {hoveredImage ? (
                          <img
                            src={hoveredImage}
                            alt={hoveredCard}
                            className="w-full rounded-xl shadow-lg border border-gray-700"
                          />
                        ) : (
                          // no card hovered: an empty card-sized box, keeping the place
                          <div className="w-full aspect-[63/88] rounded-xl border border-gray-700" />
                        )}
                      </div>
                      {hoveredCard && <OracleText card={hoveredData} className="w-56 xl:w-64 text-gray-200" />}
                    </div>
                  )}
                </div>
                </div>
                  <div className="flex flex-wrap justify-center w-full 2xl:w-auto 2xl:flex-col 2xl:justify-start gap-x-12 gap-y-8 items-start 2xl:items-center">
                    <ColorsPie cards={deck.decklist.main} cardTypes={cardTypes} />
                    <ManaCurve cards={deck.decklist.main} centered />
                    <CardTypesRadar cards={deck.decklist.main} cardTypes={cardTypes} />
                  </div>
                </div>
                <SampleHand cards={deck.decklist.main} images={cardImages} />
              </>
            ) : (
              <>
                {factsRow}
                <p className="text-gray-500 text-sm">Decklist not available.</p>
              </>
            )}

            {/* The videos of the archetype, as on its page. */}
            {deckMetagame?.videos?.length > 0 && (
              <section>
                <h3 className="text-base text-gray-500 mb-2">Videos</h3>
                <VideosSection videos={deckMetagame.videos} />
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
