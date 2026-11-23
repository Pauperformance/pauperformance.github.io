import { useState, useEffect, useMemo, useRef } from 'react'
import TournamentDecks, { useIsDesktop } from './TournamentDecks'
import { FilterPanel } from './FilterSheet'
import SizeFilter, { bigEnough } from './SizeFilter'
import ResultFilter from './ResultFilter'
import { resultMatches } from '../utils/places'
import { Pager } from './DeckFilters'
import DateChips from './DateChips'
import { LONG_RANGES, rangeStart } from '../utils/dateRanges'
import { useTournamentSizes, playersOf } from '../utils/tournamentSizes'
import { displayPlace } from '../utils/places'
import { formatShortDate } from '../utils/dates'

const PAGE_SIZE = 20
const SEARCH_CLS = 'w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 [&::-webkit-search-cancel-button]:hidden'

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <input type="search" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }} className={SEARCH_CLS} />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label="Clear search">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      )}
    </div>
  )
}

// The tournament decks of all the archetypes of a family, as the player and archetype pages list
// theirs: a page of decks beside the decklist, with filters. decks: the entries of intel-decks/,
// each with the name of its `archetype`; archetypes: the names to filter by.
export default function FamilyDecks({ decks, archetypes }) {
  const [page, setPage] = useState(0)
  const [filterTournament, setFilterTournament] = useState('')
  const [filterPilot, setFilterPilot] = useState('')
  // the date chip picked (its label), or none for any date
  const [range, setRange] = useState('')
  const dateFrom = useMemo(() => rangeStart(range), [range])
  const [activeArchetypes, setActiveArchetypes] = useState(new Set())
  const [minSize, setMinSize] = useState(0)
  const [result, setResult] = useState('')
  const sectionRef = useRef(null)
  const paginationRef = useRef(null)
  const pageInitRef = useRef(0)
  const isDesktop = useIsDesktop()
  const sizes = useTournamentSizes()

  // newest first
  const sortedDecks = useMemo(
    () => [...decks].sort((a, b) => (b.tournament_date || '').localeCompare(a.tournament_date || '')),
    [decks])

  const filtered = useMemo(() => sortedDecks.filter(d => {
    if (filterTournament && !(d.tournament_name || '').toLowerCase().includes(filterTournament.toLowerCase())) return false
    if (filterPilot && !(d.pilot || '').toLowerCase().includes(filterPilot.toLowerCase())) return false
    if (dateFrom && (d.tournament_date || '') < dateFrom) return false
    if (activeArchetypes.size > 0 && !activeArchetypes.has(d.archetype)) return false
    if (!bigEnough(playersOf(sizes, d), minSize)) return false
    if (!resultMatches(d.place, result)) return false
    return true
  }), [sortedDecks, filterTournament, filterPilot, dateFrom, activeArchetypes, minSize, result, sizes])

  useEffect(() => { setPage(0) }, [filtered])

  // a page change brings the list back into view
  useEffect(() => {
    // only when the page really changed: not on the first render (nor the one StrictMode repeats in dev)
    if (pageInitRef.current === page) return
    pageInitRef.current = page
    const el = paginationRef.current
    if (!el) return
    const headerHeight = document.querySelector('header')?.offsetHeight ?? 64
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - headerHeight - 16, behavior: 'smooth' })
  }, [page])


  const toggleArchetype = a => {
    setActiveArchetypes(prev => { const n = new Set(prev); n.has(a) ? n.delete(a) : n.add(a); return n })
  }
  const clearFilters = () => {
    setFilterTournament(''); setFilterPilot(''); setRange('')
    setActiveArchetypes(new Set()); setMinSize(0); setResult('')
  }

  // desktop: a page of decks beside the decklist; phones swipe through all of them
  const totalPages = isDesktop ? Math.ceil(filtered.length / PAGE_SIZE) : 1
  const pageDecks = isDesktop ? filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : filtered
  const browsed = pageDecks.map(d => ({
    id: d.id,
    pilot: d.pilot,
    pilotOriginal: d.pilot_original,
    archetype: d.archetype,
    place: displayPlace(d.place),
    lead: formatShortDate(d.tournament_date),
    detail: d.tournament_name,
    // in the list: the archetype large, the pilot and the event small
    listTitle: d.archetype,
    listDetail: [d.pilot, d.tournament_name].filter(Boolean).join(' · '),
    players: playersOf(sizes, d),
  }))

  const activeCount = (filterTournament ? 1 : 0) + (filterPilot ? 1 : 0) + activeArchetypes.size
    + (range ? 1 : 0) + (minSize ? 1 : 0) + (result ? 1 : 0)
  const available = archetypes.filter(a => !activeArchetypes.has(a))

  return (
    <div ref={sectionRef} className="space-y-3">
      <FilterPanel scopeRef={sectionRef} onClear={clearFilters} activeCount={activeCount}
        summary={`${filtered.length} deck${filtered.length !== 1 ? 's' : ''}`}>
        <SearchBox value={filterTournament} onChange={setFilterTournament} placeholder="Search tournaments…" />
        <SearchBox value={filterPilot} onChange={setFilterPilot} placeholder="Search pilots…" />

        {archetypes.length > 1 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-20 shrink-0">Archetype:</span>
              <select value="" onChange={e => e.target.value && toggleArchetype(e.target.value)}
                className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1 text-sm text-gray-300 hover:border-gray-400 focus:outline-none focus:border-amber-400 cursor-pointer [color-scheme:dark]">
                <option value="">Add archetype…</option>
                {available.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {activeArchetypes.size > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-[calc(theme(spacing.2)+5rem)]">
                {[...activeArchetypes].map(a => (
                  <span key={a} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-gray-900">
                    {a}
                    <button onClick={() => toggleArchetype(a)} className="hover:text-gray-700 leading-none" aria-label={`Remove ${a}`}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <DateChips ranges={LONG_RANGES} value={range} onChange={setRange} />
        <SizeFilter value={minSize} onChange={setMinSize} />
        <ResultFilter value={result} onChange={setResult} />
      </FilterPanel>

      <p className="text-xs text-gray-500">
        {filtered.length !== decks.length ? `${filtered.length.toLocaleString()} of ${decks.length.toLocaleString()}` : decks.length.toLocaleString()} decks
      </p>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-12">No decks match your filters.</p>
      ) : (
        <div ref={paginationRef}>
          <TournamentDecks key={`${page}:${browsed[0].id}:${browsed.length}`} decks={browsed}
            pager={<Pager page={page} totalPages={totalPages} onPage={setPage} />} />
        </div>
      )}
    </div>
  )
}
