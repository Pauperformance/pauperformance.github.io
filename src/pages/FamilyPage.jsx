import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { nameToSlug } from '../utils/slugs'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
const MANA_LABELS = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless' }

function SortHeader({ col, label, sortCol, sortDir, onSort, align = 'left' }) {
  const active = sortCol === col
  const indicator = active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'
  const alignClass = align === 'right' ? 'text-right' : 'text-left'
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none group ${alignClass}`}>
      <span className={`inline-flex items-center gap-1 transition-colors ${active ? 'text-amber-400' : 'text-gray-400 group-hover:text-gray-200'}`}>
        {label}
        <span className={`${active ? 'text-amber-400' : 'text-gray-600 group-hover:text-gray-400'}`}>{indicator}</span>
      </span>
    </th>
  )
}

function ManaIcon({ color }) {
  return (
    <img src={`/images/mana/${color}.png`} alt={MANA_LABELS[color] ?? color}
      title={MANA_LABELS[color] ?? color} className="w-5 h-5 inline-block" />
  )
}

export default function FamilyPage() {
  const { name } = useParams()
  const navigate = useNavigate()
  const [family, setFamily] = useState(null)
  const [metaMap, setMetaMap] = useState({})
  const [notFound, setNotFound] = useState(false)
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => {
    Promise.all([
      fetch('/data/families.json').then(r => r.json()),
      fetch('/data/metagame.json').then(r => r.json()),
    ]).then(([families, metagameData]) => {
      const found = families.find(f => f.slug === name)
      if (!found) { setNotFound(true); return }
      setFamily(found)
      const entries = metagameData.meta_shares || metagameData
      setMetaMap(Object.fromEntries(entries.map(e => [e.archetype_name, e.meta_share])))
    })
  }, [name])

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(col === 'meta' ? 'desc' : 'asc')
    }
  }

  const sorted = useMemo(() => {
    if (!family) return []
    return [...family.archetypes].sort((a, b) => {
      let av, bv
      if (sortCol === 'name') {
        av = a.name.toLowerCase(); bv = b.name.toLowerCase()
      } else if (sortCol === 'colors') {
        av = a.dominant_mana.map(c => MANA_ORDER.indexOf(c)).sort().join('-') || 'Z'
        bv = b.dominant_mana.map(c => MANA_ORDER.indexOf(c)).sort().join('-') || 'Z'
      } else if (sortCol === 'type') {
        av = a.game_type.join(', ').toLowerCase(); bv = b.game_type.join(', ').toLowerCase()
      } else if (sortCol === 'meta') {
        av = metaMap[a.name] || 0; bv = metaMap[b.name] || 0
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [family, sortCol, sortDir, metaMap])

  if (notFound) return (
    <Layout>
      <div className="text-center py-20">
        <p className="text-gray-400">Family <strong className="text-white">{name}</strong> not found.</p>
        <Link to="/archetypes" className="mt-4 inline-block text-amber-400 hover:underline text-sm">← Back to Archetypes Index</Link>
      </div>
    </Layout>
  )

  if (!family) return (
    <Layout>
      <div className="text-center py-20 text-gray-500 text-sm">Loading...</div>
    </Layout>
  )

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <Link to="/archetypes" className="text-xs text-gray-500 hover:text-amber-400 transition-colors mb-3 inline-block">
            ← Archetypes Index
          </Link>
          <h1 className="text-3xl font-bold text-white">{family.name} <span className="text-gray-500 font-normal text-xl">Family</span></h1>
          {family.description && (
            <p className="mt-3 text-gray-300 text-sm leading-relaxed">{family.description}</p>
          )}
        </div>

        <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900">
          <table className="w-full text-base bg-gray-900">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <SortHeader col="name"   label="Name"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortHeader col="colors" label="Colors" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortHeader col="type"   label="Type"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
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
                    <Link to={`/archetypes/${nameToSlug(a.name)}`}
                      className="font-medium text-gray-200 group-hover:text-amber-400 transition-colors">
                      {a.name}
                    </Link>
                    {a.aliases && a.aliases.length > 0 && (
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
                  <td className="px-4 py-3 text-right font-mono text-amber-400">
                    {(metaMap[a.name] || 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
