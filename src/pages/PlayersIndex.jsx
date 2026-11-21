import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useSearchShortcut, searchShortcutLabel } from '../utils/useSearchShortcut'
import { FilterPanel } from '../components/FilterSheet'
import { useEnterShortcut } from '../utils/useEnterShortcut'
import { useMediaQuery } from '../utils/useMediaQuery'
import { scrollSidebarToTop } from '../utils/scroll'
import { useImageFor } from '../utils/artwork'
import PlayerPane from '../components/PlayerPane'
import RowArt from '../components/RowArt'
import { useRepresentativeCards } from '../components/TournamentDecks'

const PAGE_SIZE = 50

// Phones and small tablets: the list of players, each opening its page (Tailwind's lg, below)
const NARROW_QUERY = '(max-width: 1023px)'

// how the players can be sorted, and the way each starts (the most, the newest or A-Z first)
const SORTS = [
  ['events', 'Events', 'desc'],
  ['decks', 'Decks', 'desc'],
  ['wins', 'Wins', 'desc'],
  ['top8', 'Top8', 'desc'],
  ['archetypes', 'Archetypes', 'desc'],
  ['lastSeen', 'Last seen', 'desc'],
  ['name', 'Name', 'asc'],
]

export default function PlayersIndex() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useSearchShortcut()
  const [activeArchetypes, setActiveArchetypes] = useState(new Set())
  const [archetypeSearch, setArchetypeSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [sortCol, setSortCol] = useState('events')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const narrow = useMediaQuery(NARROW_QUERY)
  const [selectedSlug, setSelectedSlug] = useState(null)
  // the decks of the players opened, by slug; null for those that failed to load
  const [details, setDetails] = useState({})
  const requested = useRef(new Set())
  const representatives = useRepresentativeCards()
  const imageFor = useImageFor()

  useEffect(() => {
    fetch('/data/players.json').then(r => r.json()).then(data => {
      setPlayers(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setArchetypeSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  function pickSort(col, dir) {
    setSortCol(col)
    setSortDir(dir)
  }

  function toggleArchetype(a) {
    setActiveArchetypes(prev => { const n = new Set(prev); n.has(a) ? n.delete(a) : n.add(a); return n })
  }

  const allArchetypes = useMemo(() => {
    const set = new Set()
    players.forEach(p => (p.archetypes || []).forEach(a => set.add(a)))
    return [...set].sort()
  }, [players])

  const visibleArchetypes = useMemo(() => {
    return allArchetypes.filter(a => {
      if (activeArchetypes.has(a)) return false
      if (archetypeSearch && !a.toLowerCase().includes(archetypeSearch.toLowerCase())) return false
      return true
    })
  }, [allArchetypes, archetypeSearch, activeArchetypes])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return players.filter(p => {
      if (q && !p.name.toLowerCase().includes(q)) return false
      if (activeArchetypes.size > 0 && !(p.archetypes || []).some(a => activeArchetypes.has(a))) return false
      return true
    })
  }, [players, search, activeArchetypes])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av, bv
      if (sortCol === 'name') {
        av = a.name.toLowerCase(); bv = b.name.toLowerCase()
      } else if (sortCol === 'archetypes') {
        av = a.archetypeCount; bv = b.archetypeCount
      } else if (sortCol === 'decks') {
        av = a.deckCount; bv = b.deckCount
      } else if (sortCol === 'wins' || sortCol === 'top8' || sortCol === 'events' || sortCol === 'resources') {
        av = a[sortCol] || 0; bv = b[sortCol] || 0
        if (av === bv) { av = a.deckCount; bv = b.deckCount }
      } else if (sortCol === 'lastSeen') {
        av = a.lastSeen; bv = b.lastSeen
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortCol, sortDir])

  useEffect(() => { setPage(0) }, [sorted])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pagePlayers = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // The player shown beside the list (wide): the one picked, else the first of the page
  const selected = sorted.some(x => x.slug === selectedSlug) ? selectedSlug : pagePlayers[0]?.slug
  const selectedPlayer = sorted.find(x => x.slug === selected)

  // the decks of the player shown are loaded
  useEffect(() => {
    if (narrow || !selected || selected in details || requested.current.has(selected)) return
    requested.current.add(selected)
    fetch(`/data/player-decks/${encodeURIComponent(selected)}.json`)
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(data => setDetails(prev => ({ ...prev, [selected]: data })))
  }, [narrow, selected, details])

  useEnterShortcut(() => {
    if (pagePlayers.length > 0) navigate(`/players/${pagePlayers[0].slug}`)
  }, searchRef)

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

  // The picture of a player's row: the representative card of the archetype played most
  const rowArt = x => {
    const rep = x.top && representatives[x.top]
    return rep ? imageFor(rep.name, rep.preview) : null
  }
  // what a row says: the name, then the archetype played most and how much the player played and won
  const rowText = (x, open) => (
    <span className="min-w-0 flex-1">
      <span className={`block truncate ${open ? 'text-amber-400' : 'text-gray-200'}`}>{x.name}</span>
      <span className="block truncate text-sm text-gray-500">
        {[x.top, `${x.deckCount.toLocaleString('en-US')} deck${x.deckCount !== 1 ? 's' : ''}`, x.wins > 0 && `${x.wins.toLocaleString('en-US')} win${x.wins !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
      </span>
    </span>
  )

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Players Index</h1>
          <p className="mt-2 text-gray-400 text-sm">
            Players tracked across all Pauper tournaments.
            Wins and Top8s count the tournaments with a ranking and more than 8 decks listed.
          </p>
        </div>

        <FilterPanel activeCount={(search ? 1 : 0) + activeArchetypes.size}
          onClear={() => { setSearch(''); setActiveArchetypes(new Set()) }}
          summary={`${filtered.length.toLocaleString()} player${filtered.length !== 1 ? 's' : ''}`}>
          <div className="relative">
            <input
              ref={searchRef}
              type="search"
              placeholder={`Search players… (${searchShortcutLabel})`}
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-20 shrink-0">Archetype:</span>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1 text-sm text-gray-300 hover:border-gray-400 focus:outline-none focus:border-amber-400 cursor-pointer flex items-center gap-2">
                  Add archetype… <span className="text-gray-500 text-xs">▾</span>
                </button>
                {dropdownOpen && (
                  <div className="absolute z-20 mt-1 w-64 bg-gray-900 border border-gray-600 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-2">
                      <input
                        autoFocus
                        type="search"
                        placeholder="Search archetypes…"
                        value={archetypeSearch}
                        onChange={e => setArchetypeSearch(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <ul className="max-h-52 overflow-y-auto">
                      {visibleArchetypes.length === 0
                        ? <li className="px-3 py-2 text-sm text-gray-500">No archetypes found</li>
                        : visibleArchetypes.map(a => (
                            <li key={a}>
                              <button
                                onClick={() => { toggleArchetype(a); setArchetypeSearch(''); setDropdownOpen(false) }}
                                className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                                {a}
                              </button>
                            </li>
                          ))
                      }
                    </ul>
                  </div>
                )}
              </div>
            </div>
            {activeArchetypes.size > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-[calc(theme(spacing.2)+5rem)]">
                {[...activeArchetypes].map(a => (
                  <span key={a} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-gray-900">
                    {a}
                    <button onClick={() => toggleArchetype(a)} className="hover:text-gray-700 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 w-20 shrink-0">Sort by:</span>
            <div className="flex flex-wrap gap-1.5">
              {SORTS.map(([col, label, dir]) => (
                <button key={col} onClick={() => pickSort(col, dir)} aria-pressed={sortCol === col}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${sortCol === col
                    ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                    : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </FilterPanel>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading players…</p>
        ) : (
          narrow ? (
            <>
              <p className="text-xs text-gray-500">{filtered.length.toLocaleString()} player{filtered.length !== 1 ? 's' : ''}</p>
              {/* the list of the wide layout; a player opens his page */}
              <div data-sidebar className="space-y-3">
                <ul className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900 divide-y divide-gray-700/50">
                  {pagePlayers.map(x => (
                    <li key={x.slug}>
                      <Link to={`/players/${x.slug}`} className="flex items-baseline gap-3 px-3 py-2 overflow-hidden border-l-2 border-transparent active:bg-gray-800">
                        {rowText(x, false)}
                        <RowArt url={rowArt(x)} />
                      </Link>
                    </li>
                  ))}
                </ul>
                {filtered.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-12">No players match your search.</p>
                )}
                {paginationBar()}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500">{filtered.length.toLocaleString()} player{filtered.length !== 1 ? 's' : ''}</p>
              <div className="flex gap-6 items-start">
                <div className="w-[22rem] xl:w-[32rem] shrink-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto space-y-3">
                  <ul className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900 divide-y divide-gray-700/50">
                    {pagePlayers.map(x => {
                      const open = x.slug === selected
                      return (
                        <li key={x.slug}>
                          <button onClick={() => setSelectedSlug(x.slug)} aria-current={open ? 'true' : undefined}
                            className={`w-full flex items-baseline gap-3 px-3 py-2 text-left overflow-hidden border-l-2 transition-colors ${open ? 'bg-gray-800 border-amber-400' : 'border-transparent hover:bg-gray-800/60'}`}>
                            {rowText(x, open)}
                            <RowArt url={rowArt(x)} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  {filtered.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-12">No players match your search.</p>
                  )}
                  {paginationBar()}
                </div>
                <div className="flex-1 min-w-0">
                  {selectedPlayer && <PlayerPane key={selectedPlayer.slug} p={selectedPlayer} data={details[selected]} />}
                </div>
              </div>
            </>
          )
        )}
      </div>
    </Layout>
  )
}
