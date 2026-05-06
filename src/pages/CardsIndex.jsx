import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

export default function CardsIndex() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/data/cards.json')
      .then(r => r.json())
      .then(data => { setCards(data); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cards
    return cards.filter(c => c.name.toLowerCase().includes(q))
  }, [cards, search])

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-amber-400 mb-1">Cards</h1>
        <p className="text-gray-400 text-sm mb-6">{cards.length} cards in the Pauper card pool</p>

        <input
          type="search"
          placeholder="Search cards…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 mb-6"
        />

        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-sm">No cards found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-700">
                <th className="pb-2 font-medium">Card</th>
                <th className="pb-2 font-medium text-right">Archetypes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.slug} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                  <td className="py-2 pr-4">
                    <Link to={`/cards/${c.slug}`} className="text-amber-400 hover:text-amber-300">
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-2 text-right text-gray-400">{c.archetypeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
