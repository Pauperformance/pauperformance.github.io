import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
const GAME_TYPES = ['Aggro', 'Midrange', 'Control', 'Tempo', 'Combo']

const MANA_LABELS = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless' }

function ManaIcon({ color, size = 'w-6 h-6' }) {
  return (
    <img
      src={`/images/mana/${color}.png`}
      alt={MANA_LABELS[color] ?? color}
      title={MANA_LABELS[color] ?? color}
      className={`${size} inline-block`}
    />
  )
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
        active
          ? 'bg-amber-400 text-gray-900 border-amber-400'
          : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400 hover:text-gray-200'
      }`}>
      {children}
    </button>
  )
}

export default function ArchetypesIndex() {
  const [archetypes, setArchetypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTypes, setActiveTypes] = useState(new Set())
  const [activeMana, setActiveMana] = useState(new Set())

  useEffect(() => {
    fetch('/data/archetypes.json')
      .then(r => r.json())
      .then(data => { setArchetypes(data); setLoading(false) })
  }, [])

  function toggleType(t) {
    setActiveTypes(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }

  function toggleMana(m) {
    setActiveMana(prev => {
      const next = new Set(prev)
      next.has(m) ? next.delete(m) : next.add(m)
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return archetypes.filter(a => {
      if (q && !a.name.toLowerCase().includes(q) && !(a.aliases || []).some(alias => alias.toLowerCase().includes(q))) return false
      if (activeTypes.size > 0 && ![...activeTypes].every(t => a.game_type.includes(t))) return false
      if (activeMana.size > 0 && ![...activeMana].every(m => a.dominant_mana.includes(m))) return false
      return true
    })
  }, [archetypes, search, activeTypes, activeMana])

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Archetypes Index</h1>
          <p className="mt-2 text-gray-400 text-sm">
            A curated list of the most important Pauper archetypes. Some may no longer be present in the meta due to bans.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <input
            type="text"
            placeholder="Search archetypes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
          />
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-10 shrink-0">Type:</span>
            {GAME_TYPES.map(t => (
              <FilterButton key={t} active={activeTypes.has(t)} onClick={() => toggleType(t)}>{t}</FilterButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-10 shrink-0">Color:</span>
            {MANA_ORDER.map(m => (
              <FilterButton key={m} active={activeMana.has(m)} onClick={() => toggleMana(m)}>
                <span className="flex items-center gap-1">
                  <ManaIcon color={m} size="w-4 h-4" />
                  {MANA_LABELS[m]}
                </span>
              </FilterButton>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading archetypes...</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">{filtered.length} archetype{filtered.length !== 1 ? 's' : ''}</p>
            <div className="border border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Colors</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Family</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {filtered.map(a => (
                    <tr key={a.name} className="bg-gray-900 hover:bg-gray-800 transition-colors group">
                      <td className="px-4 py-3">
                        <Link
                          to={`/archetypes/${encodeURIComponent(a.name)}`}
                          className="font-medium text-gray-200 group-hover:text-amber-400 transition-colors">
                          {a.name}
                        </Link>
                        {a.aliases?.length > 0 && (
                          <span className="ml-2 text-xs text-gray-500">({a.aliases.join(', ')})</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5">
                          {MANA_ORDER.filter(m => a.dominant_mana.includes(m)).map(m => (
                            <ManaIcon key={m} color={m} />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-base text-gray-400">{a.game_type.join(', ')}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{a.family || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-12">No archetypes match your filters.</p>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
