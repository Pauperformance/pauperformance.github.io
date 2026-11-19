import { useState, useEffect, useRef } from 'react'
import ArchetypePane from './ArchetypePane'
import { useIsDesktop } from './TournamentDecks'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
const fmtInt = n => n.toLocaleString('en-US')

// The archetypes of a family as the decks of a tournament are browsed: a list beside the one
// picked, with its typical list and main information (desktop), or opened under its row (phones).
// archetypes: the family's, most played first; family: its name; metaMap: the share of each
// archetype of the latest metagame (%); weights: its decks, over all the metagames; parts: per
// archetype name, { details } once loaded (null until then).
export default function FamilyArchetypes({ archetypes, family, metaMap, weights, parts }) {
  const isDesktop = useIsDesktop()
  const [selectedName, setSelectedName] = useState(null)
  const rowRef = useRef(null)
  const picked = useRef(false)
  const selected = selectedName && archetypes.some(a => a.name === selectedName) ? selectedName : archetypes[0]?.name

  // on phones, a picked row is scrolled to the top, under the header
  useEffect(() => {
    if (isDesktop || !picked.current || !rowRef.current) return
    picked.current = false
    const headerHeight = document.querySelector('header')?.offsetHeight ?? 64
    window.scrollTo({ top: rowRef.current.getBoundingClientRect().top + window.scrollY - headerHeight - 8, behavior: 'smooth' })
  }, [selectedName, isDesktop])

  const paneFor = a => (
    <ArchetypePane key={a.name} a={{ ...a, family }} meta={metaMap[a.name]} details={parts ? (parts[a.name]?.details ?? null) : undefined} />
  )

  const selectedArchetype = archetypes.find(a => a.name === selected)

  return (
    <div className="lg:flex lg:gap-6 lg:items-start">
      <div className="lg:w-80 xl:w-[26rem] lg:shrink-0">
        <ul className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900 divide-y divide-gray-700/50">
          {archetypes.map(a => {
            const open = a.name === selected && (isDesktop || selectedName === a.name)
            return (
              <li key={a.name} ref={open && !isDesktop ? rowRef : null}>
                <button
                  onClick={() => { picked.current = true; setSelectedName(!isDesktop && selectedName === a.name ? '' : a.name) }}
                  aria-expanded={open}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left border-l-2 transition-colors ${open ? 'bg-gray-800 border-amber-400' : 'border-transparent hover:bg-gray-800/60'}`}>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${open ? 'text-amber-400' : 'text-gray-200'}`}>{a.name}</span>
                    <span className="flex items-center gap-1.5 min-w-0 text-sm text-gray-500">
                      <span className="flex gap-0.5 shrink-0">
                        {MANA_ORDER.filter(m => a.dominant_mana.includes(m)).map(m => (
                          <img key={m} src={`/images/mana/${m}.png`} alt={m} className="w-4 h-4" />
                        ))}
                      </span>
                      <span className="truncate">{a.game_type.join(', ')} · {fmtInt(weights[a.name] || 0)} decks</span>
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm text-amber-400 tabular-nums">{(metaMap[a.name] || 0).toFixed(1)}%</span>
                </button>
                {!isDesktop && open && <div className="px-3 pb-4 pt-2 bg-gray-800/30">{paneFor(a)}</div>}
              </li>
            )
          })}
        </ul>
      </div>
      {isDesktop && selectedArchetype && (
        <div className="flex-1 min-w-0">{paneFor(selectedArchetype)}</div>
      )}
    </div>
  )
}
