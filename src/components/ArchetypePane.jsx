import { Link } from 'react-router-dom'
import TypicalListSection from './TypicalListSection'
import { useCardPreview } from './CardPreview'
import { useMetagames } from './CardPopularityChart'
import { nameToSlug } from '../utils/slugs'
import { useMediaQuery } from '../utils/useMediaQuery'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
const POPULARITY_METAGAMES = '/data/archetype-popularity-metagames.json'

// An archetype in brief, for the archetypes page: who it is, and its typical list.
// a: its row of the index (name, aliases, colors, type, family); meta: its share of
// the metagame (%); details: the archetype's details (undefined while loading,
// null if they could not be loaded).
export default function ArchetypePane({ a, meta, details }) {
  const { bind: bindPreview, preview } = useCardPreview({ sheet: true })
  const metagames = useMetagames(POPULARITY_METAGAMES)
  // phones get the simple, deck-page-like list
  const phone = useMediaQuery('(max-width: 1023px)')

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-xl font-bold text-white">
            {a.name}
            {a.aliases?.length > 0 && <span className="ml-2 text-sm font-normal text-gray-500">({a.aliases.join(', ')})</span>}
          </h2>
          <Link to={`/archetypes/${nameToSlug(a.name)}`} className="text-sm text-amber-400 hover:text-amber-300 whitespace-nowrap">Archetype page →</Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-1">
            {MANA_ORDER.filter(m => a.dominant_mana.includes(m)).map(m => (
              <img key={m} src={`/images/mana/${m}.png`} alt={m} className="w-5 h-5" />
            ))}
          </div>
          {a.game_type.length > 0 && (
            <div><span className="text-gray-500">Type </span><span className="font-medium text-gray-200">{a.game_type.join(', ')}</span></div>
          )}
          {a.family && (
            <div>
              <span className="text-gray-500">Family </span>
              <Link to={`/families/${nameToSlug(a.family)}`} className="font-medium text-amber-400 hover:text-amber-300">{a.family}</Link>
            </div>
          )}
          <div><span className="text-gray-500">Meta </span><span className="font-mono font-medium text-amber-400">{(meta ?? 0).toFixed(1)}%</span></div>
        </div>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">Typical list</h3>
        {details === undefined ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading archetype…</p>
        ) : details === null ? (
          <p className="text-gray-500 text-sm">This archetype could not be loaded.</p>
        ) : (
          <TypicalListSection key={a.name} name={details.name} list={details.typical_list} bindPreview={bindPreview}
            currentMetagame={metagames?.at(-1)?.slug.split('.')[0]} compact={phone} />
        )}
      </section>
      {preview}
    </div>
  )
}
