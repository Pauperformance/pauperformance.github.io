import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'

function DeckList({ cards, label, onHover }) {
  if (!cards || !cards.length) return null
  const total = cards.reduce((sum, c) => sum + c.qty, 0)
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {label} <span className="text-gray-600">({total})</span>
      </h3>
      <ul className="space-y-0.5">
        {cards.map((c, i) => (
          <li key={i} className="flex items-baseline gap-2 text-sm">
            <span className="w-5 text-right text-gray-500 shrink-0">{c.qty}</span>
            <Link
              to={`/cards/${c.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
              className="text-gray-200 hover:text-amber-400 transition-colors"
              onMouseEnter={() => onHover(c.name)}
              onMouseLeave={() => onHover(null)}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DeckPage() {
  const { id } = useParams()
  const [deck, setDeck] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [cardImages, setCardImages] = useState({})
  const [hoveredCard, setHoveredCard] = useState(null)

  useEffect(() => {
    fetch('/data/card-images.json')
      .then(r => r.json())
      .then(setCardImages)
      .catch(() => {})
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {notFound && (
          <p className="text-gray-400">
            Deck not found.{' '}
            <Link to="/archetypes" className="text-amber-400 hover:text-amber-300">Back to archetypes</Link>
          </p>
        )}

        {deck && (
          <>
            <div className="mb-6">
              <Link to={`/archetypes/${encodeURIComponent(deck.archetype)}`}
                className="text-xs text-gray-500 hover:text-gray-300">
                ← {deck.archetype}
              </Link>
            </div>

            <h1 className="text-xl font-bold text-gray-100 mb-1">{deck.tournament_name}</h1>
            <p className="text-sm text-gray-500 mb-6">{deck.tournament_date}</p>

            <div className="flex flex-wrap gap-4 mb-8">
              {deck.pilot && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Pilot</p>
                  <p className="text-sm font-medium text-gray-200">{deck.pilot}</p>
                </div>
              )}
              {deck.place && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Result</p>
                  <p className="text-sm font-medium text-gray-200">{deck.place}</p>
                </div>
              )}
              {deck.mtgo_price && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">MTGO</p>
                  <p className="text-sm font-medium text-gray-200">{deck.mtgo_price} tix</p>
                </div>
              )}
              {deck.tabletop_price && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Paper</p>
                  <p className="text-sm font-medium text-gray-200">${deck.tabletop_price}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Source</p>
                <a href={deck.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-amber-400 hover:text-amber-300">
                  MTGGoldfish →
                </a>
              </div>
            </div>

            {deck.decklist ? (
              <div className="flex gap-8 items-start">
                <div className="flex flex-col sm:flex-row gap-8">
                  <DeckList cards={deck.decklist.main} label="Maindeck" onHover={setHoveredCard} />
                  <DeckList cards={deck.decklist.side} label="Sideboard" onHover={setHoveredCard} />
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
            ) : (
              <p className="text-gray-500 text-sm">Decklist not available.</p>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
