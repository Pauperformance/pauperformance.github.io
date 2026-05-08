import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { nameToSlug, slugToName } from '../utils/slugs'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
const MANA_LABELS = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless' }

function ManaIcon({ color }) {
  return (
    <img src={`/images/mana/${color}.png`} alt={MANA_LABELS[color] ?? color}
      title={MANA_LABELS[color] ?? color} className="w-5 h-5 inline-block" />
  )
}

export default function FamilyPage() {
  const { name } = useParams()
  const decodedName = slugToName(name)
  const [family, setFamily] = useState(null)
  const [metaMap, setMetaMap] = useState({})
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/data/families.json').then(r => r.json()),
      fetch('/data/metagame.json').then(r => r.json()),
    ]).then(([families, metagameData]) => {
      const found = families.find(f => f.name === decodedName)
      if (!found) { setNotFound(true); return }
      setFamily(found)
      const entries = metagameData.meta_shares || metagameData
      setMetaMap(Object.fromEntries(entries.map(e => [e.archetype_name, e.meta_share])))
    })
  }, [decodedName])

  if (notFound) return (
    <Layout>
      <div className="text-center py-20">
        <p className="text-gray-400">Family <strong className="text-white">{decodedName}</strong> not found.</p>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Colors</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Meta %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {family.archetypes.map(a => (
                <tr key={a.name} className="bg-gray-900 hover:bg-gray-800 transition-colors group">
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
