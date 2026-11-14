import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import ArchetypeMap from '../components/ArchetypeMap'

// The map of the archetypes, on a page of its own.
export default function ArchetypeMapPage() {
  const [archetypes, setArchetypes] = useState([])
  const [metaMap, setMetaMap] = useState({})
  const [loading, setLoading] = useState(true)

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

  // no filters here: every archetype is on the map
  const visible = useMemo(() => new Set(archetypes.map(a => a.name)), [archetypes])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-2xl font-bold text-white">Archetype map</h1>
          <Link to="/archetypes" className="text-sm text-amber-400 hover:text-amber-300">← Archetypes index</Link>
        </div>
        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading archetypes...</p>
        ) : (
          <ArchetypeMap archetypes={archetypes} visible={visible} metaMap={metaMap} filtering={false} />
        )}
      </div>
    </Layout>
  )
}
