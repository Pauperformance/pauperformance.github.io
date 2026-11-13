import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useSearchShortcut, searchShortcutLabel } from '../utils/useSearchShortcut'
import { formatShortDate } from '../utils/dates'
import { sourceLabel } from '../utils/sources'

const PAGE_SIZE = 50


// "Players" is how many decks the source lists for the event, usually the top
// finishers rather than every entrant, so these are lower bounds on its size.
const SIZE_OPTIONS = [
  { label: 'Any size', min: 0 },
  { label: '8+ players', min: 8 },
  { label: '16+ players', min: 16 },
  { label: '32+ players', min: 32 },
  { label: '64+ players', min: 64 },
]

// YYYY-MM-DD of a Date in the visitor's own time zone (toISOString would be UTC).
function localIso(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const RANGES = [
  { label: 'Last 2 days', back: d => d.setDate(d.getDate() - 2) },
  { label: 'Last week', back: d => d.setDate(d.getDate() - 7) },
  { label: 'Last month', back: d => d.setMonth(d.getMonth() - 1) },
]

function SortHeader({ col, label, sortCol, sortDir, onSort, align = 'left', extraClass = '' }) {
  const active = sortCol === col
  const indicator = active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'
  const alignClass = align === 'right' ? 'text-right' : 'text-left'
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none group ${alignClass} ${extraClass}`}>
      <span className={`inline-flex items-center gap-1 transition-colors ${active ? 'text-amber-400' : 'text-gray-400 group-hover:text-gray-200'}`}>
        {label}
        <span className={`${active ? 'text-amber-400' : 'text-gray-600 group-hover:text-gray-400'}`}>{indicator}</span>
      </span>
    </th>
  )
}

const inputClass = 'bg-gray-900 border border-gray-600 rounded-lg px-3 py-1 text-sm text-gray-300 hover:border-gray-400 focus:outline-none focus:border-amber-400'

export default function TournamentsIndex() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useSearchShortcut()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [minDecks, setMinDecks] = useState(0)
  const [sortCol, setSortCol] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)
  const paginationRef = useRef(null)
  const pageInitRef = useRef(true)

  useEffect(() => {
    fetch('/data/tournaments.json').then(r => r.json()).then(data => {
      setRows(data.map(([id, date, name, decks, sources, notes]) => ({ id, date, name, decks, sources, notes })))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (pageInitRef.current) { pageInitRef.current = false; return }
    const el = paginationRef.current
    if (!el) return
    const headerHeight = document.querySelector('header')?.offsetHeight ?? 64
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 16
    window.scrollTo({ top, behavior: 'smooth' })
  }, [page])

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(col === 'name' ? 'asc' : 'desc')
    }
  }

  function applyRange(back) {
    const start = new Date()
    back(start)
    setFrom(localIso(start))
    setTo(localIso(new Date()))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (q && !r.name.toLowerCase().includes(q) && !r.id.includes(q)) return false
      if (from && r.date < from) return false
      if (to && r.date > to) return false
      if (r.decks < minDecks) return false
      return true
    })
  }, [rows, search, from, to, minDecks])

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
  const hasFilters = search || from || to || minDecks > 0

  function clearFilters() {
    setSearch(''); setFrom(''); setTo(''); setMinDecks(0)
  }

  const paginationBar = (ref) => totalPages > 1 && (
    <div ref={ref} className="flex items-center justify-center gap-3 py-2">
      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        ← Previous
      </button>
      <span className="text-sm text-gray-400">Page {page + 1} of {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        Next →
      </button>
    </div>
  )

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tournaments</h1>
          <p className="mt-2 text-gray-400 text-sm">
            {rows.length.toLocaleString()} Pauper tournaments tracked, put together from MTGGoldfish, MTGTop8 and the Wayback Machine:
            an event several of them list is one tournament here, with the differences between them shown on its page.
            The player count is how many different decks the sources list for the event, usually the top finishers rather than every entrant.
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
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
            <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)}
              aria-label="From date" className={inputClass} />
            <span className="text-gray-500 text-sm">to</span>
            <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)}
              aria-label="To date" className={inputClass} />
            {RANGES.map(({ label, back }) => (
              <button key={label} onClick={() => applyRange(back)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 w-14 shrink-0">Size:</span>
            <select value={minDecks} onChange={e => setMinDecks(Number(e.target.value))}
              aria-label="Minimum number of players" className={`${inputClass} cursor-pointer`}>
              {SIZE_OPTIONS.map(o => <option key={o.min} value={o.min}>{o.label}</option>)}
            </select>
            {hasFilters && (
              <button onClick={clearFilters} className="ml-auto text-xs text-gray-400 hover:text-amber-400 transition-colors">
                Clear filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading tournaments…</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">{filtered.length.toLocaleString()} tournament{filtered.length !== 1 ? 's' : ''}</p>
            {paginationBar(paginationRef)}
            <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900">
              <table className="w-full text-base bg-gray-900">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <SortHeader col="name"   label="Tournament" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} extraClass="w-1/2" />
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left text-gray-400 hidden sm:table-cell">Sources</th>
                    <SortHeader col="decks"  label="Players"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader col="date"   label="Date"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50 bg-gray-900">
                  {pageRows.map(r => (
                    <tr key={r.id}
                      onClick={e => { if (!e.target.closest('a')) navigate(`/tournaments/${r.id}`) }}
                      className="bg-gray-900 hover:bg-gray-800 cursor-pointer group">
                      <td className="px-4 py-2.5 font-medium">
                        <Link to={`/tournaments/${r.id}`} className="text-gray-200 group-hover:text-amber-400 transition-colors">
                          {r.name || `Tournament #${r.id}`}
                        </Link>
                        {r.notes > 0 && (
                          <span title={`The sources disagree on ${r.notes} point${r.notes !== 1 ? 's' : ''}`}
                            className="ml-2 text-xs text-amber-500">⚠ {r.notes}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell text-gray-400">
                        {r.sources.map(sourceLabel).join(' · ')}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-amber-400">{r.decks}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400 whitespace-nowrap">{formatShortDate(r.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-12">No tournaments match your filters.</p>
              )}
            </div>
            {paginationBar(null)}
          </>
        )}
      </div>
    </Layout>
  )
}
