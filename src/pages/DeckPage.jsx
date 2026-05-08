import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { nameToSlug } from '../utils/slugs'
import Layout from '../components/Layout'

const TYPE_ORDER = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Sticker', 'Other']
const TYPE_PRIORITY = ['Land', 'Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Sticker']

function CardName({ c, onHover }) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="w-5 text-right text-gray-500 shrink-0">{c.qty}</span>
      <Link
        to={`/cards/${c.name.toLowerCase().replace(/ \/\/ /g, '_').replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '')}`}
        className="text-gray-200 hover:text-amber-400 transition-colors"
        onMouseEnter={() => onHover(c.name)}
        onMouseLeave={() => onHover(null)}
      >
        {c.name}
      </Link>
    </li>
  )
}

function DeckList({ cards, label, onHover, cardTypes, groupByType }) {
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
            {groups[t].map((c, i) => <CardName key={i} c={c} onHover={onHover} />)}
          </ul>
        </div>
      )
    })
  } else {
    content = (
      <ul className="space-y-0.5">
        {cards.map((c, i) => <CardName key={i} c={c} onHover={onHover} />)}
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
  const [hoveredCard, setHoveredCard] = useState(null)
  const [groupByType, setGroupByType] = useState(true)
  const [copied, setCopied] = useState(false)

  function toMtgoText(decklist) {
    const lines = (decklist.main || []).map(c => `${c.qty} ${c.name}`)
    if (decklist.side && decklist.side.length) {
      lines.push('')
      decklist.side.forEach(c => lines.push(`${c.qty} ${c.name}`))
    }
    return lines.join('\n')
  }

  function handleDownload() {
    const text = toMtgoText(deck.decklist)
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleCopy() {
    navigator.clipboard.writeText(toMtgoText(deck.decklist)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  useEffect(() => {
    Promise.all([
      fetch('/data/card-images.json').then(r => r.json()),
      fetch('/data/card-types.json').then(r => r.json()),
    ]).then(([images, types]) => {
      setCardImages(images)
      setCardTypes(types)
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
                Played on {deck.tournament_date} @ {deck.tournament_name}
              </p>
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
              <div>
                <p className="text-base text-gray-500 mb-0.5">Source</p>
                <a href={deck.url} target="_blank" rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300">
                  MTGGoldfish →
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
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                    ⤓ Download for MTGO
                  </button>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                    {copied ? '✓ Copied!' : '⧉ Copy for MTGO'}
                  </button>
                </div>
                <div className="flex gap-8 items-start">
                  <div className="flex flex-col sm:flex-row gap-8">
                    <DeckList cards={deck.decklist.main} label="Maindeck" onHover={setHoveredCard}
                      cardTypes={cardTypes} groupByType={groupByType} />
                    <DeckList cards={deck.decklist.side} label="Sideboard" onHover={setHoveredCard}
                      cardTypes={cardTypes} groupByType={groupByType} />
                  </div>
                  <div className="hidden lg:block w-56 shrink-0 sticky top-8">
                    {hoveredCard && cardImages[hoveredCard] ? (
                      <img
                        src={cardImages[hoveredCard]}
                        alt={hoveredCard}
                        className="w-full rounded-xl shadow-lg border border-gray-700"
                      />
                    ) : (
                      <div className="w-full aspect-[5/7] rounded-xl border border-gray-800 bg-gray-900" />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">Decklist not available.</p>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
