import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'

export default function CardPage() {
  const { slug } = useParams()
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    fetch(`/data/card-details/${slug}.json`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setCard(data); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {notFound && (
          <p className="text-gray-400">Card not found. <Link to="/cards" className="text-amber-400 hover:text-amber-300">Back to cards</Link></p>
        )}

        {card && (
          <>
            <div className="mb-6">
              <Link to="/cards" className="text-xs text-gray-500 hover:text-gray-300">← Cards</Link>
            </div>

            <h1 className="text-2xl font-bold text-gray-100 mb-6">{card.name}</h1>

            {card.archetypes.length > 0 ? (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Played in {card.archetypes.length} {card.archetypes.length === 1 ? 'archetype' : 'archetypes'}
                </h2>
                <ul className="flex flex-col gap-1">
                  {card.archetypes.sort().map(name => (
                    <li key={name}>
                      <Link
                        to={`/archetypes/${encodeURIComponent(name)}`}
                        className="text-sm text-amber-400 hover:text-amber-300"
                      >
                        {name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="text-gray-500 text-sm">No archetype data available yet.</p>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
