import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { nameToSlug } from '../utils/slugs'
import Layout from '../components/Layout'
import MtgoButtons from '../components/MtgoButtons'
import ManaCurve from '../components/ManaCurve'
import ManaCost from '../components/ManaCost'
import { ColorsPie, CardTypesRadar, SampleHand } from '../components/DeckStats'
import VideosSection from '../components/VideosSection'
import { OracleText, useCardData } from '../components/CardPreview'
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

const TYPE_ORDER = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Sticker', 'Other']
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

function CardName({ c, onHover, cardPages, versus, metagameCode, manaCost }) {
  const slug = cardLinkSlug(cardPages, c.name)
  const hover = { onMouseEnter: () => onHover(c.name), onMouseLeave: () => onHover(null) }
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

function DeckList({ cards, label, onHover, cardTypes, groupByType, cardPages, versus, metagameCode, manaCosts }) {
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
            {t}s <span className="text-gray-700">({groupTotal})</span>
          </p>
          <ul className="space-y-0.5">
            {groups[t].map((c, i) => <CardName key={i} c={c} onHover={onHover} cardPages={cardPages} versus={versus} metagameCode={metagameCode} manaCost={manaCosts[c.name]} />)}
          </ul>
        </div>
      )
    })
  } else {
    content = (
      <ul className="space-y-0.5">
        {cards.map((c, i) => <CardName key={i} c={c} onHover={onHover} cardPages={cardPages} versus={versus} metagameCode={metagameCode} manaCost={manaCosts[c.name]} />)}
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
  const cardPages = useCardPages()
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
    ]).then(([images, types, costs]) => {
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

  return (
    <Layout>
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

            {deck.decklist ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex rounded-lg border border-gray-600 overflow-hidden text-sm font-medium">
                    <button
                      onClick={() => setGroupByType(true)}
                      className={`px-3 py-1.5 transition-colors ${groupByType ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
                      Group by type
                    </button>
                    <div className="w-px bg-gray-600" />
                    <button
                      onClick={() => setGroupByType(false)}
                      className={`px-3 py-1.5 transition-colors ${!groupByType ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
                      Compact View
                    </button>
                  </div>
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
                {/* The charts are the last column: on screens too narrow for it they wrap under the decklist. */}
                <div className="flex flex-wrap gap-x-8 gap-y-8 items-start">
                  <div className="space-y-4">
                    <div className="flex flex-col items-start sm:flex-row gap-8">
                      <DeckList cards={deck.decklist.main} label="Maindeck" onHover={setHoveredCard}
                        cardTypes={cardTypes} groupByType={groupByType} cardPages={cardPages} manaCosts={manaCosts}
                        versus={versusOf(typical, 'main')} metagameCode={deckMetagame?.metagame?.metagame} />
                      <DeckList cards={deck.decklist.side} label="Sideboard" onHover={setHoveredCard}
                        cardTypes={cardTypes} groupByType={groupByType} cardPages={cardPages} manaCosts={manaCosts}
                        versus={versusOf(typical, 'side')} metagameCode={deckMetagame?.metagame?.metagame} />
                    </div>
                    {typical && (
                      <p className="text-sm text-gray-500">
                        <span className="text-green-400">▲</span> above or <span className="text-red-400">▼</span> below
                        the quantity in the typical {deck.archetype} list of the metagame.
                      </p>
                    )}
                  </div>
                  {/* xl: the width of the image and the Oracle text, so the charts don't move when a card is hovered */}
                  <div className="hidden lg:flex flex-col xl:flex-row gap-4 items-start shrink-0 sticky top-8 xl:w-[496px]">
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
                  <div className="flex flex-wrap justify-center w-full 2xl:w-auto 2xl:flex-col 2xl:justify-start gap-x-12 gap-y-8 items-start 2xl:items-center">
                    <ColorsPie cards={deck.decklist.main} cardTypes={cardTypes} />
                    <ManaCurve cards={deck.decklist.main} centered />
                    <CardTypesRadar cards={deck.decklist.main} cardTypes={cardTypes} />
                  </div>
                </div>
                <SampleHand cards={deck.decklist.main} images={cardImages} />
              </>
            ) : (
              <p className="text-gray-500 text-sm">Decklist not available.</p>
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
