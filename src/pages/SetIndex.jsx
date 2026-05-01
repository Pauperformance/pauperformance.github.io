import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'

export default function SetIndex() {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pauperOnly, setPauperOnly] = useState(false)

  useEffect(() => {
    fetch('/data/sets.json')
      .then(r => r.json())
      .then(data => { setSets(data); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return sets.filter(s => {
      if (pauperOnly && !s.pauper_pool) return false
      if (q && !s.name.toLowerCase().includes(q) && !s.scryfall.toLowerCase().includes(q) && !String(s.code).includes(q)) return false
      return true
    })
  }, [sets, search, pauperOnly])

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Set Index</h1>
          <p className="mt-2 text-gray-400 text-sm leading-relaxed">
            Reference numbers used by Pauperformance (p12e) to uniquely identify Magic sets.
            Generated from the <a href="https://scryfall.com/docs/api/sets" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">Scryfall API</a>.
            Sets in <span className="text-amber-400 font-medium">amber</span> have introduced new cards in the Pauper pool.
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name, code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={() => setPauperOnly(v => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors shrink-0 ${
              pauperOnly
                ? 'bg-amber-400 text-gray-900 border-amber-400'
                : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400 hover:text-gray-200'
            }`}>
            Pauper pool only
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading sets...</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">{filtered.length} set{filtered.length !== 1 ? 's' : ''}</p>
            <div className="border border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">p12e</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Scryfall</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Set name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Release date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {filtered.map(s => (
                    <tr key={s.code}
                      className={`transition-colors ${s.pauper_pool ? 'bg-amber-950/20 hover:bg-amber-950/40' : 'bg-gray-900 hover:bg-gray-800'}`}>
                      <td className={`px-4 py-2.5 font-mono font-semibold ${s.pauper_pool ? 'text-amber-400' : 'text-gray-400'}`}>
                        {s.code}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-500 hidden sm:table-cell">{s.scryfall}</td>
                      <td className={`px-4 py-2.5 ${s.pauper_pool ? 'text-amber-200 font-medium' : 'text-gray-300'}`}>
                        {s.name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{s.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-12">No sets match your search.</p>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
