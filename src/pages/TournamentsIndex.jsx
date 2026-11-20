import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useSearchShortcut, searchShortcutLabel } from '../utils/useSearchShortcut'
import { FilterPanel } from '../components/FilterSheet'
import { formatShortDate } from '../utils/dates'
import { sourceLabel } from '../utils/sources'
import { useMediaQuery } from '../utils/useMediaQuery'
import TournamentPane from '../components/TournamentPane'
import SizeStars, { sizeStars } from '../components/SizeStars'
import SizeFilter from '../components/SizeFilter'
import DateChips from '../components/DateChips'
import { LONG_RANGES, rangeStart } from '../utils/dateRanges'
import { scrollSidebarToTop } from '../utils/scroll'

const PAGE_SIZE = 50

// Phones and small tablets: one tournament at a time, swiped (Tailwind's lg, below)
const NARROW_QUERY = '(max-width: 1023px)'

export default function TournamentsIndex() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useSearchShortcut()
  // the date chip picked (its label), or none for any date
  const [range, setRange] = useState('')
  const from = useMemo(() => rangeStart(range), [range])
  // the least stars of the size of a tournament (0 for any)
  const [minStars, setMinStars] = useState(0)
  const [sortCol, setSortCol] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)
  const narrow = useMediaQuery(NARROW_QUERY)
  const wide = !narrow
  const [selectedId, setSelectedId] = useState(null)
  // details of the tournaments opened, by id; null for those that failed to load
  const [details, setDetails] = useState({})
  const requested = useRef(new Set())

  useEffect(() => {
    fetch('/data/tournaments.json').then(r => r.json()).then(data => {
      setRows(data.map(([id, date, name, decks, sources, notes]) => ({ id, date, name, decks, sources, notes })))
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (q && !r.name.toLowerCase().includes(q) && !r.id.includes(q)) return false
      if (from && r.date < from) return false
      if (sizeStars(r.decks) < minStars) return false
      return true
    })
  }, [rows, search, from, minStars])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      let av, bv
      if (sortCol === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase() }
      else if (sortCol === 'decks') { av = a.decks; bv = b.decks }
      else { av = a.date; bv = b.date }
      if (av < bv) return -dir
      if (av > bv) return dir
      // stable, readable tie-break: newest first
      return b.date.localeCompare(a.date) || a.id.localeCompare(b.id)
    })
  }, [filtered, sortCol, sortDir])

  useEffect(() => { setPage(0) }, [sorted])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  // The tournament shown beside the list (wide): the one picked, else the first of the page
  const selectedIndex = sorted.findIndex(r => r.id === selectedId)
  const selected = selectedIndex >= 0 ? selectedId : pageRows[0]?.id

  // the details of the tournament shown are loaded
  const wanted = wide && selected ? [selected] : []
  const wantedKey = wanted.join()
  useEffect(() => {
    for (const id of wantedKey ? wantedKey.split(',') : []) {
      if (id in details || requested.current.has(id)) continue
      requested.current.add(id)
      fetch(`/data/tournament-details/${encodeURIComponent(id)}.json`)
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)
        .then(data => setDetails(prev => ({ ...prev, [id]: data })))
    }
  }, [wantedKey, details])

  const hasFilters = search || range || minStars > 0

  function clearFilters() {
    setSearch(''); setRange(''); setMinStars(0)
  }

  const paginationBar = () => totalPages > 1 && (
    <div className="flex items-center justify-center gap-3 py-2">
      <button onClick={e => { scrollSidebarToTop(e.currentTarget); setPage(p => Math.max(0, p - 1)) }} disabled={page === 0}
        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        ← Previous
      </button>
      <span className="text-sm text-gray-400">Page {page + 1} of {totalPages}</span>
      <button onClick={e => { scrollSidebarToTop(e.currentTarget); setPage(p => Math.min(totalPages - 1, p + 1)) }} disabled={page >= totalPages - 1}
        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        Next →
      </button>
    </div>
  )

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tournaments Index</h1>
          <p className="mt-2 text-gray-400 text-sm">
            {rows.length.toLocaleString()} Pauper tournaments tracked and reconciled across multiple sources.
            Inconsistencies across tournaments are highlighted.
            Some events might report only top decklists.
          </p>
        </div>

        <FilterPanel activeCount={(search ? 1 : 0) + (range ? 1 : 0) + (minStars > 0 ? 1 : 0)}
          onClear={clearFilters}
          summary={`${filtered.length.toLocaleString()} tournament${filtered.length !== 1 ? 's' : ''}`}>
          <div className="relative">
            <input
              ref={searchRef}
              type="search"
              placeholder={`Search tournaments by name or id… (${searchShortcutLabel})`}
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

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 w-14 shrink-0">Date:</span>
            <DateChips ranges={LONG_RANGES} value={range} onChange={setRange} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SizeFilter value={minStars} onChange={setMinStars} />
            {hasFilters && (
              <button onClick={clearFilters} className="ml-auto hidden lg:block text-xs text-gray-400 hover:text-amber-400 transition-colors">
                Clear filters
              </button>
            )}
          </div>
        </FilterPanel>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading tournaments…</p>
        ) : (
          narrow ? (
            <>
              <p className="text-xs text-gray-500">{filtered.length.toLocaleString()} tournament{filtered.length !== 1 ? 's' : ''}</p>
              {/* the list of the wide layout; a tournament opens its page */}
              <ul className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900 divide-y divide-gray-700/50">
                {pageRows.map(r => (
                  <li key={r.id}>
                    <Link to={`/tournaments/${r.id}`} className="block px-3 py-2.5 border-l-2 border-transparent active:bg-gray-800">
                      <span className="block truncate text-gray-200">
                        <SizeStars players={r.decks} className="w-12 mr-2" />
                        {r.name || `Tournament #${r.id}`}
                        {r.notes > 0 && (
                          <span title={`The sources disagree on ${r.notes} point${r.notes !== 1 ? 's' : ''}`}
                            className="ml-2 text-xs text-amber-500">⚠ {r.notes}</span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {formatShortDate(r.date)} · {r.decks} players · {r.sources.map(sourceLabel).join(' · ')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {filtered.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-12">No tournaments match your filters.</p>
              )}
              {paginationBar()}
            </>
          ) : wide ? (
            <>
              <p className="text-xs text-gray-500">{filtered.length.toLocaleString()} tournament{filtered.length !== 1 ? 's' : ''}</p>
              <div className="flex gap-6 items-start">
                <div className="w-[22rem] xl:w-[32rem] shrink-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto space-y-3">
                  <ul className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900 divide-y divide-gray-700/50">
                    {pageRows.map(r => {
                      const open = r.id === selected
                      return (
                        <li key={r.id}>
                          <button onClick={() => setSelectedId(r.id)} aria-current={open ? 'true' : undefined}
                            className={`w-full px-3 py-2 text-left border-l-2 transition-colors ${open ? 'bg-gray-800 border-amber-400' : 'border-transparent hover:bg-gray-800/60'}`}>
                            <span className={`block truncate ${open ? 'text-amber-400' : 'text-gray-200'}`}>
                              <SizeStars players={r.decks} className="w-12 mr-2" />
                              {r.name || `Tournament #${r.id}`}
                              {r.notes > 0 && (
                                <span title={`The sources disagree on ${r.notes} point${r.notes !== 1 ? 's' : ''}`}
                                  className="ml-2 text-xs text-amber-500">⚠ {r.notes}</span>
                              )}
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                              {formatShortDate(r.date)} · {r.decks} players · {r.sources.map(sourceLabel).join(' · ')}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  {filtered.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-12">No tournaments match your filters.</p>
                  )}
                  {paginationBar()}
                </div>
                <div className="flex-1 min-w-0">
                  {selected && <TournamentPane t={details[selected]} />}
                </div>
              </div>
            </>
          ) : null
        )}
      </div>
    </Layout>
  )
}
