import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { nameToSlug, metagameSlug } from '../utils/slugs'
import { formatDate } from '../utils/dates'
import Layout from '../components/Layout'
import { useSearchShortcut, searchShortcutLabel } from '../utils/useSearchShortcut'
import { useEnterShortcut } from '../utils/useEnterShortcut'
import { useMediaQuery } from '../utils/useMediaQuery'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
const MANA_LABELS = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless' }
const GAME_TYPES = ['Aggro', 'Midrange', 'Control', 'Tempo', 'Combo']

function ManaIcon({ color, size = 'w-6 h-6' }) {
  return <img src={`/images/mana/${color}.png`} alt={MANA_LABELS[color] ?? color}
    title={MANA_LABELS[color] ?? color} className={`${size} inline-block`} />
}

function FilterButton({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
        active ? 'bg-amber-400 text-gray-900 border-amber-400'
          : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400 hover:text-gray-200'}`}>
      {children}
    </button>
  )
}

function SortHeader({ col, label, sortCol, sortDir, onSort, align = 'left', extraClass = '' }) {
  const active = sortCol === col
  const indicator = active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'
  return (
    <th onClick={() => onSort(col)}
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none group ${align === 'right' ? 'text-right' : 'text-left'} ${extraClass}`}>
      <span className={`inline-flex items-center gap-1 transition-colors ${active ? 'text-amber-400' : 'text-gray-400 group-hover:text-gray-200'}`}>
        {label}
        <span className={active ? 'text-amber-400' : 'text-gray-600 group-hover:text-gray-400'}>{indicator}</span>
      </span>
    </th>
  )
}

// Wide enough for the list of families to sit beside the one selected
const WIDE_QUERY = '(min-width: 1440px)'

// A family in brief: who it is, and its archetypes
function FamilyPane({ f, metaMap }) {
  const archetypes = [...f.archetypes].sort((a, b) => (metaMap[b.name] || 0) - (metaMap[a.name] || 0))
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-xl font-bold text-white">{f.name}</h2>
          <Link to={`/families/${nameToSlug(f.name)}`} className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-amber-400 text-gray-900 text-sm font-semibold hover:bg-amber-300 transition-colors whitespace-nowrap">Family page</Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-1">
            {MANA_ORDER.filter(m => f.mana.includes(m)).map(m => <ManaIcon key={m} color={m} size="w-5 h-5" />)}
          </div>
          {f.types.length > 0 && <div><span className="text-gray-500">Type </span><span className="font-medium text-gray-200">{f.types.join(', ')}</span></div>}
          <div><span className="text-gray-500">Archetypes </span><span className="font-medium text-gray-200">{f.archetypes.length}</span></div>
          <div><span className="text-gray-500">Meta </span><span className="font-mono font-medium text-amber-400">{f.meta.toFixed(1)}%</span></div>
        </div>
      </div>
      {f.description && <p className="text-sm text-gray-300 leading-relaxed">{f.description}</p>}
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">Archetypes</h3>
        <ul className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900 divide-y divide-gray-700/50">
          {archetypes.map(a => (
            <li key={a.name}>
              <Link to={`/archetypes/${nameToSlug(a.name)}`} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800/60 group">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-gray-200 group-hover:text-amber-400 transition-colors">{a.name}</span>
                  <span className="block truncate text-xs text-gray-500">{a.game_type.join(', ')}</span>
                </span>
                <span className="flex gap-0.5 shrink-0">
                  {MANA_ORDER.filter(m => a.dominant_mana.includes(m)).map(m => <ManaIcon key={m} color={m} size="w-4 h-4" />)}
                </span>
                <span className="w-14 shrink-0 text-right font-mono text-sm text-amber-400">{(metaMap[a.name] ?? 0).toFixed(1)}%</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const union = (archetypes, key) => [...new Set(archetypes.flatMap(a => a[key] || []))]

export default function FamiliesIndex() {
  const [families, setFamilies] = useState([])
  const [metaMap, setMetaMap] = useState({})
  const [metagame, setMetagame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useSearchShortcut()
  const [activeTypes, setActiveTypes] = useState(new Set())
  const [activeMana, setActiveMana] = useState(new Set())
  const [sortCol, setSortCol] = useState('meta')
  const [sortDir, setSortDir] = useState('desc')
  const wide = useMediaQuery(WIDE_QUERY)
  const [selectedName, setSelectedName] = useState(null)
  const rowRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      fetch('/data/families.json').then(r => r.json()),
      fetch('/data/metagame.json').then(r => r.json()),
    ]).then(([familyData, metagameData]) => {
      const entries = metagameData.meta_shares || metagameData
      const shares = Object.fromEntries(entries.map(e => [e.archetype_name, e.meta_share]))
      setMetaMap(shares)
      setMetagame(metagameData.metagame?.date ? metagameData.metagame : null)
      setFamilies(familyData.map(f => ({
        ...f,
        mana: union(f.archetypes, 'dominant_mana'),
        types: union(f.archetypes, 'game_type'),
        meta: f.archetypes.reduce((sum, a) => sum + (shares[a.name] || 0), 0),
      })))
      setLoading(false)
    })
  }, [])

  const toggle = setter => v => setter(prev => {
    const next = new Set(prev)
    next.has(v) ? next.delete(v) : next.add(v)
    return next
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return families.filter(f => {
      if (q && !f.name.toLowerCase().includes(q)
        && !f.archetypes.some(a => a.name.toLowerCase().includes(q) || (a.aliases || []).some(x => x.toLowerCase().includes(q)))) return false
      if (activeTypes.size > 0 && ![...activeTypes].some(t => f.types.includes(t))) return false
      if (activeMana.size > 0 && ![...activeMana].some(m => f.mana.includes(m))) return false
      return true
    })
  }, [families, search, activeTypes, activeMana])

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir(col === 'name' ? 'asc' : 'desc') }
  }

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let av, bv
    if (sortCol === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase() }
    else if (sortCol === 'colors') {
      av = a.mana.map(c => MANA_ORDER.indexOf(c)).sort().join('-') || 'Z'
      bv = b.mana.map(c => MANA_ORDER.indexOf(c)).sort().join('-') || 'Z'
    } else if (sortCol === 'type') { av = a.types.join(', ').toLowerCase(); bv = b.types.join(', ').toLowerCase() }
    else if (sortCol === 'count') { av = a.archetypes.length; bv = b.archetypes.length }
    else { av = a.meta; bv = b.meta }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return a.name.localeCompare(b.name)
  }), [filtered, sortCol, sortDir])

  // The family shown beside the list (wide): the one picked, else the first
  const selected = sorted.find(f => f.name === selectedName) || sorted[0]

  useEnterShortcut(() => {
    if (!sorted.length) return
    if (wide) setSelectedName(sorted[0].name)
    else navigate(`/families/${nameToSlug(sorted[0].name)}`)
  }, searchRef)

  const go = f => navigate(`/families/${nameToSlug(f.name)}`)

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Families Index</h1>
          <p className="mt-2 text-gray-400 text-sm">
            Archetypes that share a core strategy are grouped in families.{' '}
            <Link to="/archetypes" className="text-amber-400 hover:text-amber-300 whitespace-nowrap">Browse the archetypes →</Link>
          </p>
          {metagame && (
            <p className="mt-1 text-gray-400 text-sm">
              Meta % is the share of the decks of all the family's archetypes in the current metagame,{' '}
              <Link to={`/metagames/${metagameSlug(metagame)}`} className="text-amber-400 hover:text-amber-300">
                {metagame.metagame}.{metagame.label}{metagame.name && metagame.name !== metagame.label ? ` ${metagame.name}` : ''}
              </Link>
              {' '}(from {formatDate(metagame.date).replace(/, \d{4}$/, '')}).
            </p>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <input ref={searchRef} type="search" placeholder={`Search families... (${searchShortcutLabel})`}
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400" />
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-10 shrink-0">Color:</span>
            {MANA_ORDER.map(m => (
              <FilterButton key={m} active={activeMana.has(m)} onClick={() => toggle(setActiveMana)(m)}>
                <span className="flex items-center gap-1"><ManaIcon color={m} size="w-4 h-4" />{MANA_LABELS[m]}</span>
              </FilterButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-10 shrink-0">Type:</span>
            {GAME_TYPES.map(t => (
              <FilterButton key={t} active={activeTypes.has(t)} onClick={() => toggle(setActiveTypes)(t)}>{t}</FilterButton>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading families...</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">{filtered.length} famil{filtered.length !== 1 ? 'ies' : 'y'}</p>
            {wide ? (
              <div ref={rowRef} className="flex gap-6 items-start">
                <div className="w-96 2xl:w-[28rem] shrink-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
                  <ul className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900 divide-y divide-gray-700/50">
                    {sorted.map(f => {
                      const open = f.name === selected?.name
                      return (
                        <li key={f.slug}>
                          <button onClick={() => setSelectedName(f.name)} aria-current={open ? 'true' : undefined}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left border-l-2 transition-colors ${open ? 'bg-gray-800 border-amber-400' : 'border-transparent hover:bg-gray-800/60'}`}>
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate ${open ? 'text-amber-400' : 'text-gray-200'}`}>{f.name}</span>
                              <span className="block truncate text-xs text-gray-500">{f.archetypes.length} archetypes · {f.types.join(', ')}</span>
                            </span>
                            <span className="flex gap-0.5 shrink-0">
                              {MANA_ORDER.filter(m => f.mana.includes(m)).map(m => <ManaIcon key={m} color={m} size="w-4 h-4" />)}
                            </span>
                            <span className="w-14 shrink-0 text-right font-mono text-sm text-amber-400">{f.meta.toFixed(1)}%</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  {filtered.length === 0 && <p className="text-center text-gray-500 text-sm py-12">No families match your filters.</p>}
                </div>
                <div className="flex-1 min-w-0">
                  {selected && <FamilyPane key={selected.name} f={selected} metaMap={metaMap} />}
                </div>
              </div>
            ) : (
            <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900">
              <table className="w-full text-base bg-gray-900">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <SortHeader col="name" label="Name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} extraClass="w-2/5" />
                    <SortHeader col="colors" label="Colors" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader col="type" label="Type" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} extraClass="hidden sm:table-cell" />
                    <SortHeader col="count" label="Archetypes" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" extraClass="hidden sm:table-cell" />
                    <SortHeader col="meta" label="Meta %" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {sorted.map(f => (
                    <tr key={f.slug} onClick={() => go(f)}
                      onAuxClick={e => { if (e.button === 1) window.open(`/#/families/${nameToSlug(f.name)}`, '_blank') }}
                      className="hover:bg-gray-800 cursor-pointer group">
                      <td className="px-4 py-3 font-medium text-gray-200 group-hover:text-amber-400 transition-colors">{f.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5">
                          {MANA_ORDER.filter(m => f.mana.includes(m)).map(m => <ManaIcon key={m} color={m} />)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{f.types.join(', ')}</td>
                      <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">{f.archetypes.length}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber-400">{f.meta.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="text-center text-gray-500 text-sm py-12">No families match your filters.</p>}
            </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
