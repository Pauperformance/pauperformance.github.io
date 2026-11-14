import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useSearchShortcut, searchShortcutLabel } from '../utils/useSearchShortcut'
import { FilterPanel } from '../components/FilterSheet'
import { nameToSlug } from '../utils/slugs'
import { firstYearOf, formatShortDate } from '../utils/dates'
import { LANG_FLAG, LANG_CANONICAL, LANG_NAME } from '../utils/languages'
import VideoCard from '../components/VideoCard'

const LANG_DISPLAY = Object.fromEntries(Object.entries(LANG_NAME).map(([l, name]) => [l, `${LANG_FLAG[l]} ${name}`]))

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SELECT_CLS = 'bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-amber-400 [color-scheme:dark]'
const PAGE_SIZE = 50

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
        active
          ? 'bg-amber-400 text-gray-900 border-amber-400'
          : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400 hover:text-gray-200'
      }`}>
      {children}
    </button>
  )
}

function MonthPicker({ label, value, onChange, labelClass = 'w-16', firstYear }) {
  const [year, setYear] = useState(value ? value.split('-')[0] : '')
  const [month, setMonth] = useState(value ? value.split('-')[1] : '')
  const currentYear = new Date().getFullYear()
  // from the oldest entry of the table (firstYearOf), this year until it loads
  const fromYear = firstYear ?? currentYear
  const years = Array.from({ length: currentYear - fromYear + 1 }, (_, i) => String(fromYear + i))

  useEffect(() => {
    setYear(value ? value.split('-')[0] : '')
    setMonth(value ? value.split('-')[1] : '')
  }, [value])

  const handleYear = (y) => { setYear(y); onChange(y && month ? `${y}-${month}` : '') }
  const handleMonth = (m) => { setMonth(m); onChange(year && m ? `${year}-${m}` : '') }

  return (
    <div className="flex items-center gap-1.5" data-picker>
      <span className={`text-sm text-gray-500 shrink-0 ${labelClass}`}>{label}</span>
      <select value={month} onChange={e => handleMonth(e.target.value)} className={SELECT_CLS}>
        <option value="">Month</option>
        {MONTHS.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
      </select>
      <select value={year} onChange={e => handleYear(e.target.value)} className={SELECT_CLS}>
        <option value="">Year</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

export default function Watch() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useSearchShortcut()
  const [activeCreators, setActiveCreators] = useState(new Set())
  const [activeLanguages, setActiveLanguages] = useState(new Set())
  const [activeArchetypes, setActiveArchetypes] = useState(new Set())
  const [archetypeSearch, setArchetypeSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [creatorDropdownOpen, setCreatorDropdownOpen] = useState(false)
  const [creatorSearch, setCreatorSearch] = useState('')
  const [activeType, setActiveType] = useState('videos')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [toWrapped, setToWrapped] = useState(false)
  const [viewMode, setViewMode] = useState('infinite')
  const [page, setPage] = useState(0)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const dropdownRef = useRef(null)
  const creatorDropdownRef = useRef(null)
  const sentinelRef = useRef(null)
  const dateRowRef = useRef(null)
  const resultsRef = useRef(null)
  const paginationRef = useRef(null)
  const pageInitRef = useRef(true)

  useEffect(() => {
    fetch('/data/videos.json').then(r => r.json()).then(data => {
      setVideos(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const el = dateRowRef.current
    if (!el) return
    const check = () => {
      const pickers = el.querySelectorAll('[data-picker]')
      if (pickers.length >= 2) setToWrapped(pickers[1].offsetTop > pickers[0].offsetTop)
    }
    const observer = new ResizeObserver(check)
    observer.observe(el)
    check()
    return () => observer.disconnect()
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

  useEffect(() => {
    if (!creatorDropdownOpen) return
    function handleClick(e) {
      if (creatorDropdownRef.current && !creatorDropdownRef.current.contains(e.target)) {
        setCreatorDropdownOpen(false)
        setCreatorSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [creatorDropdownOpen])

  const creators = useMemo(() => [...new Set(videos.map(v => v.creator_name).filter(Boolean))].sort(), [videos])
  const languages = useMemo(() => [...new Set(videos.map(v => LANG_CANONICAL[v.language] ?? v.language).filter(Boolean))].sort(), [videos])
  const archetypes = useMemo(() => [...new Set(videos.map(v => v.archetype).filter(Boolean))].sort(), [videos])

  function toggleLanguage(l) {
    setActiveLanguages(prev => { const n = new Set(prev); n.has(l) ? n.delete(l) : n.add(l); return n })
  }
  function toggleCreator(c) {
    setActiveCreators(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })
  }
  function toggleArchetype(a) {
    setActiveArchetypes(prev => { const n = new Set(prev); n.has(a) ? n.delete(a) : n.add(a); return n })
  }
  function toggleType(t) {
    setActiveType(prev => prev === t ? '' : t)
  }

  const toYM = (d) => d.toISOString().slice(0, 7)
  function applyRange(daysAgo) {
    const to = new Date(), from = new Date()
    if (daysAgo === 7) from.setDate(from.getDate() - 7)
    else if (daysAgo === 30) from.setMonth(from.getMonth() - 1)
    else from.setFullYear(from.getFullYear() - 1)
    setFilterDateFrom(toYM(from))
    setFilterDateTo(toYM(to))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return videos.filter(v => {
      if (q && !v.title.toLowerCase().includes(q)) return false
      if (activeCreators.size > 0 && !activeCreators.has(v.creator_name)) return false
      if (activeLanguages.size > 0 && !activeLanguages.has(LANG_CANONICAL[v.language] ?? v.language)) return false
      if (activeArchetypes.size > 0 && !activeArchetypes.has(v.archetype)) return false
      if (activeType === 'videos' && v.is_short === true) return false
      if (activeType === 'shorts' && v.is_short !== true) return false
      if (filterDateFrom && v.date.slice(0, 7) < filterDateFrom) return false
      if (filterDateTo && v.date.slice(0, 7) > filterDateTo) return false
      return true
    })
  }, [videos, search, activeCreators, activeLanguages, activeArchetypes, activeType, filterDateFrom, filterDateTo])

  const firstYear = useMemo(() => firstYearOf(videos, 'date'), [videos])

  // Reset paging whenever filters change
  useEffect(() => {
    setPage(0)
    setVisibleCount(PAGE_SIZE)
  }, [filtered])

  // Scroll to pagination buttons after page changes (skip initial mount)
  useEffect(() => {
    if (pageInitRef.current) { pageInitRef.current = false; return }
    const el = paginationRef.current
    if (!el) return
    const headerHeight = document.querySelector('header')?.offsetHeight ?? 64
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 16
    window.scrollTo({ top, behavior: 'smooth' })
  }, [page])

  // Infinite scroll: observe sentinel to load more
  useEffect(() => {
    if (viewMode !== 'infinite' || visibleCount >= filtered.length) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(c => c + PAGE_SIZE) },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [viewMode, visibleCount, filtered])

  const visibleVideos = viewMode === 'paginated'
    ? filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : filtered.slice(0, visibleCount)

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const visibleArchetypes = useMemo(() => {
    const q = search.trim().toLowerCase()
    return archetypes.filter(a => {
      if (activeArchetypes.has(a)) return false
      if (archetypeSearch && !a.toLowerCase().includes(archetypeSearch.toLowerCase())) return false
      return videos.some(v => {
        if (v.archetype !== a) return false
        if (q && !v.title.toLowerCase().includes(q)) return false
        if (activeCreators.size > 0 && !activeCreators.has(v.creator_name)) return false
        if (activeLanguages.size > 0 && !activeLanguages.has(LANG_CANONICAL[v.language] ?? v.language)) return false
        if (activeType === 'videos' && v.is_short === true) return false
        if (activeType === 'shorts' && v.is_short !== true) return false
        if (filterDateFrom && v.date.slice(0, 7) < filterDateFrom) return false
        if (filterDateTo && v.date.slice(0, 7) > filterDateTo) return false
        return true
      })
    })
  }, [archetypes, archetypeSearch, activeArchetypes, videos, search, activeCreators, activeLanguages, activeType, filterDateFrom, filterDateTo])

  const visibleCreators = useMemo(() => {
    const q = search.trim().toLowerCase()
    return creators.filter(c => {
      if (activeCreators.has(c)) return false
      if (creatorSearch && !c.toLowerCase().includes(creatorSearch.toLowerCase())) return false
      return videos.some(v => {
        if (v.creator_name !== c) return false
        if (q && !v.title.toLowerCase().includes(q)) return false
        if (activeLanguages.size > 0 && !activeLanguages.has(LANG_CANONICAL[v.language] ?? v.language)) return false
        if (activeArchetypes.size > 0 && !activeArchetypes.has(v.archetype)) return false
        if (activeType === 'videos' && v.is_short === true) return false
        if (activeType === 'shorts' && v.is_short !== true) return false
        if (filterDateFrom && v.date.slice(0, 7) < filterDateFrom) return false
        if (filterDateTo && v.date.slice(0, 7) > filterDateTo) return false
        return true
      })
    })
  }, [creators, creatorSearch, activeCreators, videos, search, activeLanguages, activeArchetypes, activeType, filterDateFrom, filterDateTo])

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Watch</h1>
          <p className="mt-2 text-gray-400 text-sm">Pauper videos from creators around the world.</p>
        </div>

        <FilterPanel activeCount={(search ? 1 : 0) + activeCreators.size + activeLanguages.size + activeArchetypes.size + (filterDateFrom ? 1 : 0) + (filterDateTo ? 1 : 0)}
          onClear={() => { setSearch(''); setActiveCreators(new Set()); setActiveLanguages(new Set()); setActiveArchetypes(new Set()); setFilterDateFrom(''); setFilterDateTo('') }}
          summary={`${filtered.length} video${filtered.length !== 1 ? 's' : ''}`}>
          <div className="relative">
            <input
              ref={searchRef}
              type="search"
              placeholder={`Search videos… (${searchShortcutLabel})`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                aria-label="Clear search">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-16 shrink-0">Language:</span>
            {languages.map(l => (
              <FilterButton key={l} active={activeLanguages.has(l)} onClick={() => toggleLanguage(l)}>
                {LANG_DISPLAY[l] ?? l}
              </FilterButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-16 shrink-0">Type:</span>
            <FilterButton active={activeType === 'videos'} onClick={() => toggleType('videos')}>Videos</FilterButton>
            <FilterButton active={activeType === 'shorts'} onClick={() => toggleType('shorts')}>Shorts</FilterButton>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-16 shrink-0">Creator:</span>
              <div className="relative" ref={creatorDropdownRef}>
                <button
                  onClick={() => setCreatorDropdownOpen(o => !o)}
                  className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1 text-sm text-gray-300 hover:border-gray-400 focus:outline-none focus:border-amber-400 cursor-pointer flex items-center gap-2">
                  Add creator… <span className="text-gray-500 text-xs">▾</span>
                </button>
                {creatorDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-56 bg-gray-900 border border-gray-600 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-2">
                      <input
                        autoFocus
                        type="search"
                        placeholder="Search creators…"
                        value={creatorSearch}
                        onChange={e => setCreatorSearch(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <ul className="max-h-52 overflow-y-auto">
                      {visibleCreators.length === 0
                        ? <li className="px-3 py-2 text-sm text-gray-500">No creators found</li>
                        : visibleCreators.map(c => (
                            <li key={c}>
                              <button
                                onClick={() => { toggleCreator(c); setCreatorSearch(''); setCreatorDropdownOpen(false) }}
                                className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                                {c}
                              </button>
                            </li>
                          ))
                      }
                    </ul>
                  </div>
                )}
              </div>
            </div>
            {activeCreators.size > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-[calc(theme(spacing.2)+4rem)]">
                {[...activeCreators].map(c => (
                  <span key={c} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-gray-900">
                    {c}
                    <button onClick={() => toggleCreator(c)} className="hover:text-gray-700 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-16 shrink-0">Archetype:</span>
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
              <div className="flex flex-wrap gap-1.5 pl-[calc(theme(spacing.2)+4rem)]">
                {[...activeArchetypes].map(a => (
                  <span key={a} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-gray-900">
                    {a}
                    <button onClick={() => toggleArchetype(a)} className="hover:text-gray-700 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div ref={dateRowRef} className="flex flex-wrap items-center gap-4">
            <MonthPicker label="From:" value={filterDateFrom} onChange={v => setFilterDateFrom(v)} firstYear={firstYear} />
            <MonthPicker label="To:" value={filterDateTo} onChange={v => setFilterDateTo(v)} labelClass={toWrapped ? 'w-16' : ''} firstYear={firstYear} />
            <div className="flex gap-1.5 flex-wrap">
              {[{ label: 'Last week', days: 7 }, { label: 'Last month', days: 30 }, { label: 'Last year', days: 365 }].map(({ label, days }) => (
                <button key={label} onClick={() => applyRange(days)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                  {label}
                </button>
              ))}
              {(filterDateFrom || filterDateTo) && (
                <button onClick={() => { setFilterDateFrom(''); setFilterDateTo('') }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                  Reset
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 w-16 shrink-0">View:</span>
            <div className="inline-flex rounded-xl border border-gray-600 overflow-hidden text-sm font-semibold">
              <button
                onClick={() => setViewMode('infinite')}
                className={`px-4 py-1.5 transition-colors ${viewMode === 'infinite' ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
                Infinite scroll
              </button>
              <div className="w-px bg-gray-600" />
              <button
                onClick={() => setViewMode('paginated')}
                className={`px-4 py-1.5 transition-colors ${viewMode === 'paginated' ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
                Paginated
              </button>
            </div>
          </div>
        </FilterPanel>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading videos…</p>
        ) : (
          <>
            <div ref={resultsRef}>
              <p className="text-xs text-gray-500">{filtered.length} video{filtered.length !== 1 ? 's' : ''}</p>
            </div>

            {filtered.length === 0
              ? <p className="text-center text-gray-500 text-sm py-12">No videos match your filters.</p>
              : (
                <>
                  {viewMode === 'paginated' && totalPages > 1 && (
                    <div ref={paginationRef} className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 0}
                        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        ← Previous
                      </button>
                      <span className="text-sm text-gray-400">
                        Page {page + 1} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages - 1}
                        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        Next →
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {visibleVideos.map(v => <VideoCard key={v.video_id} v={v} />)}
                  </div>

                  {viewMode === 'paginated' && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 0}
                        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        ← Previous
                      </button>
                      <span className="text-sm text-gray-400">
                        Page {page + 1} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages - 1}
                        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        Next →
                      </button>
                    </div>
                  )}

                  {viewMode === 'infinite' && visibleCount < filtered.length && (
                    <div ref={sentinelRef} className="py-8 text-center text-gray-500 text-sm">
                      Loading more…
                    </div>
                  )}
                </>
              )
            }
          </>
        )}
      </div>
    </Layout>
  )
}
