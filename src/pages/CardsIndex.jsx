import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
const MANA_LABELS = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless' }
const CARD_TYPES = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Sticker']
const CMC_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function ManaIcon({ color }) {
  return (
    <img
      src={`/images/mana/${color}.png`}
      alt={MANA_LABELS[color]}
      title={MANA_LABELS[color]}
      className="w-4 h-4 inline-block"
    />
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


export default function CardsIndex() {
  const [cards, setCards] = useState([])
  const [archetypeCardSlugs, setArchetypeCardSlugs] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeMana, setActiveMana] = useState(new Set())
  const [activeTypes, setActiveTypes] = useState(new Set())
  const [activeCmc, setActiveCmc] = useState(new Set())
  const [activeArchetypes, setActiveArchetypes] = useState(new Set())

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
    // AND logic: intersection of all selected archetypes
    const [first, ...rest] = sets
    const intersection = new Set([...first].filter(slug => rest.every(s => s.has(slug))))
    return intersection
  }, [activeArchetypes, archetypeCardSlugs])

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
        for (const m of activeMana) {
          if (m === 'C') { if (colors.length !== 0) return }
          else { if (!colors.includes(m)) return }
        }
      }
      if (activeTypes.size > 0) {
        const types = c.types || []
        if (![...activeTypes].every(t => types.includes(t))) return
      }
      if (activeCmc.size > 0) {
        if (![...activeCmc].some(v => c.cmc === v)) return
      }
      slugs.add(c.slug)
    })
    return slugs
  }, [cards, search, activeMana, activeTypes, activeCmc])

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
        for (const m of activeMana) {
          if (m === 'C') { if (colors.length !== 0) return false }
          else { if (!colors.includes(m)) return false }
        }
      }
      if (activeTypes.size > 0) {
        const types = c.types || []
        if (![...activeTypes].every(t => types.includes(t))) return false
      }
      if (activeCmc.size > 0) {
        if (![...activeCmc].some(v => c.cmc === v)) return false
      }
      if (allowedSlugs !== null && !allowedSlugs.has(c.slug)) return false
      return true
    })
  }, [cards, search, activeMana, activeTypes, activeCmc, allowedSlugs])

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cards</h1>
          <p className="mt-2 text-gray-400 text-sm">{cards.length} cards played in Pauper decks</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <input
            type="search"
            placeholder="Search cards…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
          />
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-10 shrink-0">Color:</span>
            {MANA_ORDER.map(m => (
              <FilterButton key={m} active={activeMana.has(m)} onClick={() => toggleMana(m)}>
                <span className="flex items-center gap-1">
                  <ManaIcon color={m} />
                  {MANA_LABELS[m]}
                </span>
              </FilterButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-10 shrink-0">Type:</span>
            {CARD_TYPES.map(t => (
              <FilterButton key={t} active={activeTypes.has(t)} onClick={() => toggleType(t)}>{t}</FilterButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-10 shrink-0">CMC:</span>
            {CMC_VALUES.map(v => (
              <FilterButton key={v} active={activeCmc.has(v)} onClick={() => toggleCmc(v)}>{v}</FilterButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-10 shrink-0">Arch:</span>
            {visibleArchetypes.map(a => (
              <FilterButton key={a} small active={activeArchetypes.has(a)} onClick={() => toggleArchetype(a)}>{a}</FilterButton>
            ))}
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
              <div className="border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 border-b border-gray-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Card</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Colors</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Type</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">CMC</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Archetypes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filtered.map(c => (
                      <tr key={c.slug} className="bg-gray-900 hover:bg-gray-800 transition-colors">
                        <td className="px-4 py-2.5">
                          <Link to={`/cards/${c.slug}`} className="text-amber-400 hover:text-amber-300">
                            {c.name}
                          </Link>
                        </td>
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
