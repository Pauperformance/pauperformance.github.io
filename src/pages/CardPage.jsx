import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import CardPane, { useCardDecks } from '../components/CardPane'
import TournamentDecks, { useIsDesktop } from '../components/TournamentDecks'
import SizeFilter, { bigEnough } from '../components/SizeFilter'
import { FilterPanel } from '../components/FilterSheet'
import DateChips from '../components/DateChips'
import { LONG_RANGES, rangeStart } from '../utils/dateRanges'
import { displayPlace } from '../utils/places'
import { useTournamentSizes, playersOf } from '../utils/tournamentSizes'
import { fullCardSlug } from '../utils/cardPages'
import { formatShortDate } from '../utils/dates'


const PAGE_SIZE = 20

// The decks playing the card, as an archetype's: filters, then the list of decks
// on the left and the decklist of the one selected beside it.
function CardDecksSection({ decks }) {
  const sizes = useTournamentSizes()
  const isDesktop = useIsDesktop()
  const sectionRef = useRef(null)
  const [page, setPage] = useState(0)
  const [activeArchetypes, setActiveArchetypes] = useState(new Set())
  const [filterTournament, setFilterTournament] = useState('')
  const [filterPilot, setFilterPilot] = useState('')
  // the date chip picked (its label), or none for any date
  const [range, setRange] = useState('')
  const dateFrom = useMemo(() => rangeStart(range), [range])
  const [minSize, setMinSize] = useState(0)
  const [archetypeSearch, setArchetypeSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // another card: its own archetype filter
  useEffect(() => { setActiveArchetypes(new Set()) }, [decks])

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false); setArchetypeSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const archetypeNames = useMemo(() => {
    if (!decks) return []
    return [...new Set(decks.map(d => d.archetype).filter(Boolean))].sort()
  }, [decks])

  function toggleArchetype(a) {
    setActiveArchetypes(prev => { const next = new Set(prev); next.has(a) ? next.delete(a) : next.add(a); return next })
    setPage(0)
  }

  const filtered = useMemo(() => {
    if (!decks) return []
    return decks.filter(d => {
      if (activeArchetypes.size > 0 && !activeArchetypes.has(d.archetype)) return false
      if (filterTournament && !(d.tournament_name || '').toLowerCase().includes(filterTournament.toLowerCase())) return false
      if (filterPilot && !(d.pilot || '').toLowerCase().includes(filterPilot.toLowerCase())) return false
      if (dateFrom && (d.tournament_date || '') < dateFrom) return false
      if (!bigEnough(playersOf(sizes, d), minSize)) return false
      return true
    })
  }, [decks, activeArchetypes, filterTournament, filterPilot, dateFrom, minSize, sizes])


  if (!decks) return <p className="text-gray-500 text-sm">Loading decks…</p>
  if (!decks.length) return <p className="text-gray-500 text-sm">No decks recorded.</p>

  const setFilter = (setter) => (e) => { setter(e.target.value); setPage(0) }
  const clearFilters = () => {
    setFilterTournament(''); setFilterPilot(''); setRange('')
    setMinSize(0); setActiveArchetypes(new Set()); setPage(0)
  }

  // Desktop: the decks a page at a time, in a list beside the decklist. Phones
  // swipe from deck to deck, through all of them, so there are no pages.
  const totalPages = isDesktop ? Math.ceil(filtered.length / PAGE_SIZE) : 1
  const shown = isDesktop ? filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : filtered
  const browsed = shown.map(d => ({
    id: d.id,
    pilot: d.pilot,
    archetype: d.archetype,
    place: displayPlace(d.place),
    lead: formatShortDate(d.tournament_date),
    detail: d.tournament_name,
    players: playersOf(sizes, d),
  }))

  const pagination = (
    <div className="flex items-center justify-center gap-3 lg:pl-[21.5rem] xl:pl-[27.5rem]">
      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        ← Previous
      </button>
      <span className="text-sm text-gray-400">Page {page + 1} of {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        Next →
      </button>
    </div>
  )

  return (
    <div ref={sectionRef} className="space-y-3">
      <h2 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-gray-700">Decks</h2>
      <FilterPanel scopeRef={sectionRef} onClear={clearFilters}
        activeCount={(filterTournament ? 1 : 0) + (filterPilot ? 1 : 0) + (range ? 1 : 0) + (minSize ? 1 : 0) + activeArchetypes.size}
        summary={`${filtered.length} deck${filtered.length !== 1 ? 's' : ''}`}>
        <input
          type="search" placeholder="Search tournaments…" value={filterTournament} onChange={setFilter(setFilterTournament)}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400" />
        <input
          type="text" placeholder="Search pilots…" value={filterPilot} onChange={setFilter(setFilterPilot)}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400" />
        <DateChips ranges={LONG_RANGES} value={range} onChange={v => { setRange(v); setPage(0) }} />
        <SizeFilter value={minSize} onChange={v => { setMinSize(v); setPage(0) }} />
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
                    <input autoFocus type="search" placeholder="Search archetypes…" value={archetypeSearch}
                      onChange={e => setArchetypeSearch(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400" />
                  </div>
                  <ul className="max-h-52 overflow-y-auto">
                    {(() => {
                      const opts = archetypeNames.filter(a => !activeArchetypes.has(a) && (!archetypeSearch || a.toLowerCase().includes(archetypeSearch.toLowerCase())))
                      return opts.length === 0
                        ? <li className="px-3 py-2 text-sm text-gray-500">No archetypes found</li>
                        : opts.map(a => (
                          <li key={a}>
                            <button onClick={() => { toggleArchetype(a); setArchetypeSearch(''); setDropdownOpen(false) }}
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
      </FilterPanel>
      <p className="text-xs text-gray-500">
        {filtered.length !== decks.length ? `${filtered.length} of ${decks.length}` : decks.length} decks
      </p>
      {totalPages > 1 && pagination}
      {browsed.length === 0 ? (
        <p className="px-4 py-8 text-center text-gray-500 text-sm">No decks match your filters.</p>
      ) : (
        <TournamentDecks key={`${page}:${browsed[0].id}:${browsed.length}`} decks={browsed} wideList />
      )}
      {totalPages > 1 && pagination}
    </div>
  )
}

export default function CardPage() {
  const { slug } = useParams()
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const navigate = useNavigate()
  const decks = useCardDecks(slug)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setCard(null)
    fetch(`/data/card-details/${slug}.json`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { if (!cancelled) { setCard(data); setLoading(false) } })
      .catch(() => {
        // Decklists link double-faced and adventure cards by their front
        // face alone: redirect those to the full card.
        fullCardSlug(slug).then(full => {
          if (cancelled) return
          if (full) navigate(`/cards/${full}`, { replace: true })
          else { setNotFound(true); setLoading(false) }
        })
      })
    return () => { cancelled = true }
  }, [slug])

  return (
    <Layout>
      <div className="space-y-6">
        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {notFound && (
          <p className="text-gray-400">
            Card not found.{' '}
            <Link to="/cards" className="text-amber-400 hover:text-amber-300">Back to cards</Link>
          </p>
        )}

        {card && (
          <>
            <CardPane card={card} decks={decks} titleAs="h1" />
            <section>
              <CardDecksSection decks={decks} />
            </section>
          </>
        )}

      </div>
    </Layout>
  )
}
