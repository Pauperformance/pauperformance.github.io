import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { nameToSlug } from '../utils/slugs'
import Layout from '../components/Layout'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
const GAME_TYPES = ['Aggro', 'Midrange', 'Control', 'Tempo', 'Combo']
const META_RANGES = [
  { label: '< 0.5%', min: 0, max: 0.5, maxInclusive: false },
  { label: '0.5–1%', min: 0.5, max: 1, maxInclusive: false },
  { label: '1–5%', min: 1, max: 5, maxInclusive: false },
  { label: '5–10%', min: 5, max: 10, maxInclusive: false },
  { label: '≥ 10%', min: 10, max: 100, maxInclusive: true },
]

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

function AndOrToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-600 overflow-hidden text-xs font-semibold shrink-0">
      <button
        onClick={() => onChange('or')}
        className={`px-2 py-1 transition-colors ${value === 'or' ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
        OR
      </button>
      <div className="w-px bg-gray-600" />
      <button
        onClick={() => onChange('and')}
        className={`px-2 py-1 transition-colors ${value === 'and' ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
        AND
      </button>
    </div>
  )
}

export default function ArchetypesIndex() {
  const [archetypes, setArchetypes] = useState([])
  const [metaMap, setMetaMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTypes, setActiveTypes] = useState(new Set())
  const [activeMana, setActiveMana] = useState(new Set())
  const [manaMode, setManaMode] = useState('or')
  const [typeMode, setTypeMode] = useState('or')
  const [activeMetaRange, setActiveMetaRange] = useState(null)
  const [sortCol, setSortCol] = useState('meta')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    Promise.all([
      fetch('/data/archetypes.json').then(r => r.json()),
      fetch('/data/metagame.json').then(r => r.json()),
    ]).then(([archetypeData, metagameData]) => {
      setArchetypes(archetypeData)
      const entries = metagameData.meta_shares || metagameData
      setMetaMap(Object.fromEntries(entries.map(e => [e.archetype_name, e.meta_share])))
      setLoading(false)
    })
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

  const navigate = useNavigate()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return archetypes.filter(a => {
      if (q && !a.name.toLowerCase().includes(q) && !(a.aliases || []).some(alias => alias.toLowerCase().includes(q))) return false
      if (activeTypes.size > 0) {
        const match = typeMode === 'and'
          ? [...activeTypes].every(t => a.game_type.includes(t))
          : [...activeTypes].some(t => a.game_type.includes(t))
        if (!match) return false
      }
      if (activeMana.size > 0) {
        const match = manaMode === 'and'
          ? [...activeMana].every(m => a.dominant_mana.includes(m))
          : [...activeMana].some(m => a.dominant_mana.includes(m))
        if (!match) return false
      }
      if (activeMetaRange !== null) {
        const r = META_RANGES.find(r => r.label === activeMetaRange)
        const pct = metaMap[a.name] ?? 0
        if (!(pct >= r.min && (r.maxInclusive ? pct <= r.max : pct < r.max))) return false
      }
      return true
    })
  }, [archetypes, search, activeTypes, activeMana, manaMode, typeMode, activeMetaRange, metaMap])

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(col === 'meta' ? 'desc' : 'asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortCol) return filtered
    return [...filtered].sort((a, b) => {
      let av, bv
      if (sortCol === 'name') {
        av = a.name.toLowerCase(); bv = b.name.toLowerCase()
      } else if (sortCol === 'colors') {
        av = a.dominant_mana.map(c => MANA_ORDER.indexOf(c)).sort().join('-') || 'Z'
        bv = b.dominant_mana.map(c => MANA_ORDER.indexOf(c)).sort().join('-') || 'Z'
      } else if (sortCol === 'type') {
        av = a.game_type.join(', ').toLowerCase(); bv = b.game_type.join(', ').toLowerCase()
      } else if (sortCol === 'family') {
        av = a.family ? a.family.toLowerCase() : '￿'
        bv = b.family ? b.family.toLowerCase() : '￿'
      } else if (sortCol === 'meta') {
        av = metaMap[a.name] || 0; bv = metaMap[b.name] || 0
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortCol, sortDir, metaMap])

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
          <div className="relative">
            <input
              type="search"
              placeholder="Search archetypes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label="Clear search">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
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
            <AndOrToggle value={manaMode} onChange={setManaMode} />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-10 shrink-0">Type:</span>
            {GAME_TYPES.map(t => (
              <FilterButton key={t} active={activeTypes.has(t)} onClick={() => toggleType(t)}>{t}</FilterButton>
            ))}
            <AndOrToggle value={typeMode} onChange={setTypeMode} />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-10 shrink-0">Meta:</span>
            {META_RANGES.map(r => (
              <FilterButton key={r.label} active={activeMetaRange === r.label}
                onClick={() => setActiveMetaRange(prev => prev === r.label ? null : r.label)}>
                {r.label}
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
            <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900">
              <table className="w-full text-base bg-gray-900">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <SortHeader col="name"   label="Name"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} extraClass="w-2/5" />
                    <SortHeader col="colors" label="Colors"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader col="type"   label="Type"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader col="family" label="Family"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="left" extraClass="hidden sm:table-cell" />
                    <SortHeader col="meta"   label="Meta %"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50 bg-gray-900">
                  {sorted.map(a => (
                    <tr key={a.name}
                      onClick={() => navigate(`/archetypes/${nameToSlug(a.name)}`)}
                      onAuxClick={e => { if (e.button === 1) window.open(`/#/archetypes/${nameToSlug(a.name)}`, '_blank') }}
                      className="bg-gray-900 hover:bg-gray-800 cursor-pointer group">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-200 group-hover:text-amber-400 transition-colors">
                          {a.name}
                        </span>
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
                      <td className="px-4 py-3 text-gray-400">{a.game_type.join(', ')}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {a.family
                          ? <Link to={`/families/${nameToSlug(a.family)}`}
                              onClick={e => e.stopPropagation()}
                              className="text-gray-500 hover:text-amber-400 transition-colors">
                              {a.family}
                            </Link>
                          : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-400">
                        {(metaMap[a.name] ?? 0).toFixed(1)}%
                      </td>
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
