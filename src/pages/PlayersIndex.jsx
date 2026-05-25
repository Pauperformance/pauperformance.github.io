import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

function SortHeader({ col, label, sortCol, sortDir, onSort, align = 'left', extraClass = '' }) {
  const active = sortCol === col
  const indicator = active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'
  const alignClass = align === 'right' ? 'text-right' : 'text-left'
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none group ${alignClass} ${extraClass}`}>
      <span className={`inline-flex items-center gap-1 transition-colors ${active ? 'text-amber-400' : 'text-gray-400 group-hover:text-gray-200'}`}>
        {label}
        <span className={`${active ? 'text-amber-400' : 'text-gray-600 group-hover:text-gray-400'}`}>{indicator}</span>
      </span>
    </th>
  )
}

export default function PlayersIndex() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('decks')
  const [sortDir, setSortDir] = useState('desc')
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/data/players.json').then(r => r.json()).then(data => {
      setPlayers(data)
      setLoading(false)
    })
  }, [])

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(col === 'name' || col === 'lastSeen' ? 'asc' : 'desc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return players
    return players.filter(p => p.name.toLowerCase().includes(q))
  }, [players, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av, bv
      if (sortCol === 'name') {
        av = a.name.toLowerCase(); bv = b.name.toLowerCase()
      } else if (sortCol === 'archetypes') {
        av = a.archetypeCount; bv = b.archetypeCount
      } else if (sortCol === 'decks') {
        av = a.deckCount; bv = b.deckCount
      } else if (sortCol === 'lastSeen') {
        av = a.lastSeen; bv = b.lastSeen
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortCol, sortDir])

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Players Index</h1>
          <p className="mt-2 text-gray-400 text-sm">
            {players.length.toLocaleString()} players tracked across all Pauper tournaments.
          </p>
        </div>

        <div className="relative">
          <input
            type="search"
            placeholder="Search players…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 pr-8 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label="Clear search">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading players…</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">{filtered.length.toLocaleString()} player{filtered.length !== 1 ? 's' : ''}</p>
            <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900">
              <table className="w-full text-base bg-gray-900">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <SortHeader col="name"       label="Name"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort} extraClass="w-1/2" />
                    <SortHeader col="archetypes" label="Archetypes" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" extraClass="hidden sm:table-cell" />
                    <SortHeader col="decks"      label="Decks"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader col="lastSeen"   label="Last Seen"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" extraClass="hidden md:table-cell" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50 bg-gray-900">
                  {sorted.map(p => (
                    <tr key={p.slug}
                      onClick={() => navigate(`/players/${p.slug}`)}
                      onAuxClick={e => { if (e.button === 1) window.open(`/#/players/${p.slug}`, '_blank') }}
                      className="bg-gray-900 hover:bg-gray-800 cursor-pointer group">
                      <td className="px-4 py-2.5 font-medium text-gray-200 group-hover:text-amber-400 transition-colors">{p.name}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400 hidden sm:table-cell">{p.archetypeCount}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-amber-400">{p.deckCount.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400 hidden md:table-cell">{p.lastSeen || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-12">No players match your search.</p>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
