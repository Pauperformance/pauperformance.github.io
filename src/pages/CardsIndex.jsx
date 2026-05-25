import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
const MANA_LABELS = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless' }
const CARD_TYPES = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Sticker']
const CMC_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function ManaIcon({ color, size = 'w-6 h-6' }) {
  return (
    <img
      src={`/images/mana/${color}.png`}
      alt={MANA_LABELS[color]}
      title={MANA_LABELS[color]}
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

function FilterButton({ active, onClick, children, small = false }) {
  return (
    <button
      onClick={onClick}
      className={`${small ? 'px-1.5 py-0.5' : 'px-3 py-1'} rounded-full text-xs font-semibold transition-colors border ${
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


export default function CardsIndex() {
  const [cards, setCards] = useState([])
  const [archetypeCardSlugs, setArchetypeCardSlugs] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeMana, setActiveMana] = useState(new Set())
  const [activeTypes, setActiveTypes] = useState(new Set())
  const [activeCmc, setActiveCmc] = useState(new Set())
  const [activeArchetypes, setActiveArchetypes] = useState(new Set())
  const [manaMode, setManaMode] = useState('or')
  const [typeMode, setTypeMode] = useState('or')
  const [archetypeMode, setArchetypeMode] = useState('or')
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [archetypeSearch, setArchetypeSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setArchetypeSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  useEffect(() => {
    Promise.all([
      fetch('/data/cards.json').then(r => r.json()),
      fetch('/data/archetype-card-slugs.json').then(r => r.json()),
    ]).then(([cardData, archData]) => {
      setCards(cardData)
      setArchetypeCardSlugs(archData)
      setLoading(false)
    })
  }, [])

  const allowedSlugs = useMemo(() => {
    if (activeArchetypes.size === 0) return null
    const sets = [...activeArchetypes].map(a => new Set(archetypeCardSlugs[a] || []))
    if (archetypeMode === 'or') {
      return new Set(sets.flatMap(s => [...s]))
    }
    const [first, ...rest] = sets
    return new Set([...first].filter(slug => rest.every(s => s.has(slug))))
  }, [activeArchetypes, archetypeCardSlugs, archetypeMode])

  function toggleMana(m) {
    setActiveMana(prev => {
      const next = new Set(prev)
      next.has(m) ? next.delete(m) : next.add(m)
      return next
    })
  }

  function toggleType(t) {
    setActiveTypes(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }

  function toggleCmc(v) {
    setActiveCmc(prev => prev.has(v) ? new Set() : new Set([v]))
  }

  function toggleArchetype(a) {
    setActiveArchetypes(prev => {
      const next = new Set(prev)
      next.has(a) ? next.delete(a) : next.add(a)
      return next
    })
  }

  const slugsPassingPreArchetypeFilters = useMemo(() => {
    const q = search.trim().toLowerCase()
    const slugs = new Set()
    cards.forEach(c => {
      if (q && !c.name.toLowerCase().includes(q)) return
      if (activeMana.size > 0) {
        const colors = c.colors || []
        const manaMatch = manaMode === 'and'
          ? [...activeMana].every(m => m === 'C' ? colors.length === 0 : colors.includes(m))
          : [...activeMana].some(m => m === 'C' ? colors.length === 0 : colors.includes(m))
        if (!manaMatch) return
      }
      if (activeTypes.size > 0) {
        const types = c.types || []
        const typeMatch = typeMode === 'and'
          ? [...activeTypes].every(t => types.includes(t))
          : [...activeTypes].some(t => types.includes(t))
        if (!typeMatch) return
      }
      if (activeCmc.size > 0) {
        if (![...activeCmc].some(v => c.cmc === v)) return
      }
      slugs.add(c.slug)
    })
    return slugs
  }, [cards, search, activeMana, activeTypes, activeCmc, manaMode, typeMode])

  const visibleArchetypes = useMemo(() => {
    return Object.keys(archetypeCardSlugs).sort().filter(a =>
      activeArchetypes.has(a) ||
      (archetypeCardSlugs[a] || []).some(slug => slugsPassingPreArchetypeFilters.has(slug))
    )
  }, [archetypeCardSlugs, slugsPassingPreArchetypeFilters, activeArchetypes])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cards.filter(c => {
      if (q && !c.name.toLowerCase().includes(q)) return false
      if (activeMana.size > 0) {
        const colors = c.colors || []
        const manaMatch = manaMode === 'and'
          ? [...activeMana].every(m => m === 'C' ? colors.length === 0 : colors.includes(m))
          : [...activeMana].some(m => m === 'C' ? colors.length === 0 : colors.includes(m))
        if (!manaMatch) return false
      }
      if (activeTypes.size > 0) {
        const types = c.types || []
        const typeMatch = typeMode === 'and'
          ? [...activeTypes].every(t => types.includes(t))
          : [...activeTypes].some(t => types.includes(t))
        if (!typeMatch) return false
      }
      if (activeCmc.size > 0) {
        if (![...activeCmc].some(v => c.cmc === v)) return false
      }
      if (allowedSlugs !== null && !allowedSlugs.has(c.slug)) return false
      return true
    })
  }, [cards, search, activeMana, activeTypes, activeCmc, allowedSlugs, manaMode, typeMode])

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(col === 'archetypes' || col === 'cmc' ? 'desc' : 'asc')
    }
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av, bv
      if (sortCol === 'name') {
        av = a.name.toLowerCase(); bv = b.name.toLowerCase()
      } else if (sortCol === 'colors') {
        av = (a.colors || []).map(c => MANA_ORDER.indexOf(c)).sort().join('-') || 'Z'
        bv = (b.colors || []).map(c => MANA_ORDER.indexOf(c)).sort().join('-') || 'Z'
      } else if (sortCol === 'type') {
        av = (a.types || []).join(', ').toLowerCase(); bv = (b.types || []).join(', ').toLowerCase()
      } else if (sortCol === 'cmc') {
        av = a.cmc ?? -1; bv = b.cmc ?? -1
      } else if (sortCol === 'archetypes') {
        av = a.archetypeCount; bv = b.archetypeCount
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
          <h1 className="text-2xl font-bold text-white">Cards Index</h1>
          <p className="mt-2 text-gray-400 text-sm">{cards.length} cards played in Pauper decks</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="relative">
            <input
              type="search"
              placeholder="Search cards…"
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
            {CARD_TYPES.map(t => (
              <FilterButton key={t} active={activeTypes.has(t)} onClick={() => toggleType(t)}>{t}</FilterButton>
            ))}
            <AndOrToggle value={typeMode} onChange={setTypeMode} />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-10 shrink-0">CMC:</span>
            {CMC_VALUES.map(v => (
              <FilterButton key={v} active={activeCmc.has(v)} onClick={() => toggleCmc(v)}>{v}</FilterButton>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 shrink-0">Archetype:</span>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1 text-sm text-gray-300 hover:border-gray-400 focus:outline-none focus:border-amber-400 cursor-pointer flex items-center gap-2">
                  Add archetype… <span className="text-gray-500 text-xs">▾</span>
                </button>
                {dropdownOpen && (
                  <div className="absolute z-20 mt-1 w-64 bg-gray-900 border border-gray-600 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-2">
                      <input
                        autoFocus
                        type="search"
                        placeholder="Search archetypes…"
                        value={archetypeSearch}
                        onChange={e => setArchetypeSearch(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <ul className="max-h-52 overflow-y-auto">
                      {(() => {
                        const opts = visibleArchetypes
                          .filter(a => !activeArchetypes.has(a))
                          .filter(a => !archetypeSearch || a.toLowerCase().includes(archetypeSearch.toLowerCase()))
                        return opts.length === 0
                          ? <li className="px-3 py-2 text-sm text-gray-500">No archetypes found</li>
                          : opts.map(a => (
                              <li key={a}>
                                <button
                                  onClick={() => { toggleArchetype(a); setArchetypeSearch(''); setDropdownOpen(false) }}
                                  className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                                  {a}
                                </button>
                              </li>
                            ))
                      })()}
                    </ul>
                  </div>
                )}
              </div>
              <AndOrToggle value={archetypeMode} onChange={setArchetypeMode} />
            </div>
            {activeArchetypes.size > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-[calc(theme(spacing.2)+4.5rem)]">
                {[...activeArchetypes].map(a => (
                  <span key={a} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-gray-900">
                    {a}
                    <button onClick={() => toggleArchetype(a)} className="hover:text-gray-700 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">{filtered.length} card{filtered.length !== 1 ? 's' : ''}</p>
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm">No cards found.</p>
            ) : (
              <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900">
                <table className="w-full text-base bg-gray-900">
                  <thead>
                    <tr className="bg-gray-800 border-b border-gray-700">
                      <SortHeader col="name"       label="Name"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort} extraClass="w-2/5" />
                      <SortHeader col="colors"     label="Colors"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader col="type"       label="Type"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort} extraClass="hidden sm:table-cell" />
                      <SortHeader col="cmc"        label="CMC"        sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" extraClass="hidden sm:table-cell" />
                      <SortHeader col="archetypes" label="Archetypes" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50 bg-gray-900">
                    {sorted.map(c => (
                      <tr key={c.slug}
                        onClick={() => navigate(`/cards/${c.slug}`)}
                        onAuxClick={e => { if (e.button === 1) window.open(`/cards/${c.slug}`, '_blank') }}
                        className="bg-gray-900 hover:bg-gray-800 cursor-pointer group">
                        <td className="px-4 py-2.5 font-medium text-gray-200 group-hover:text-amber-400">{c.name}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-0.5">
                            {(c.colors || []).length === 0
                              ? <ManaIcon color="C" />
                              : MANA_ORDER.filter(m => m !== 'C' && (c.colors || []).includes(m)).map(m => (
                                  <ManaIcon key={m} color={m} />
                                ))
                            }
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{(c.types || []).join(', ')}</td>
                        <td className="px-4 py-2.5 text-right text-gray-400 hidden sm:table-cell">{c.cmc ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right text-gray-400">{c.archetypeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
