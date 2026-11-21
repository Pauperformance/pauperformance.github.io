import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useSearchShortcut, searchShortcutLabel } from '../utils/useSearchShortcut'
import { FilterPanel } from '../components/FilterSheet'
import { nameToSlug } from '../utils/slugs'
import { formatShortDate } from '../utils/dates'
import DateChips from '../components/DateChips'
import { WATCH_RANGES, rangeStart } from '../utils/dateRanges'
import { LANG_FLAG, LANG_CANONICAL, LANG_NAME } from '../utils/languages'
import VideoCard from '../components/VideoCard'
import LiveStreams, { useLiveYouTube } from '../components/LiveStreams'
import { probeLive, isProbeable } from '../utils/liveProbe'
import { WATCH_TYPES, showsLive, typeAllows } from '../utils/watchTypes'
import SwipeCards from '../components/SwipeCards'
import { useMediaQuery } from '../utils/useMediaQuery'
import { getSettings } from '../utils/settings'

const LANG_DISPLAY = Object.fromEntries(Object.entries(LANG_NAME).map(([l, name]) => [l, `${LANG_FLAG[l]} ${name}`]))

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

export default function Watch() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useSearchShortcut()
  const [activeCreators, setActiveCreators] = useState(new Set())
  // the languages shown: those of the visitor's settings to start with (none: all)
  const [activeLanguages, setActiveLanguages] = useState(() => new Set(getSettings().content.languages))
  const [activeArchetypes, setActiveArchetypes] = useState(new Set())
  const [archetypeSearch, setArchetypeSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  // the creator menu: closed, or open to add a creator to show ('show') or to hide ('hide')
  const [creatorMenu, setCreatorMenu] = useState('')
  const creatorDropdownOpen = creatorMenu !== ''
  // the creators hidden: those of the visitor's settings to start with
  const [excludedCreators, setExcludedCreators] = useState(() => new Set(getSettings().watch.hiddenCreators))
  const [creatorSearch, setCreatorSearch] = useState('')
  // videos or shorts to start with: the visitor's setting
  // what is shown: videos, live streams, shorts, any together (none: videos and shorts)
  const [activeTypes, setActiveTypes] = useState(() => new Set(getSettings().watch.types))
  // with Live: the YouTube streams on the air are tiles, and not repeated among the videos
  const youtubeLive = useLiveYouTube(excludedCreators, showsLive(activeTypes)).live
  const youtubeLiveIds = useMemo(() => new Set(youtubeLive.map(v => v.video_id)), [youtubeLive])
  // with Live: the live streams still on the air. Those that have ended are left out, and
  // so are the ones not checked yet (utils/liveProbe.js): they appear once found live.
  const [liveStatus, setLiveStatus] = useState({})
  const onAir = useCallback(v => liveStatus[v.video_id] === 'live' || liveStatus[v.video_id] === 'unknown', [liveStatus])
  // whether the videos preview (play without pressing play): the visitor's setting to start with
  const [previews, setPreviews] = useState(() => getSettings().videos.previews)
  // the date chip picked (its label), or none for any date
  const [range, setRange] = useState('')
  const dateFrom = useMemo(() => rangeStart(range), [range])
  const [viewMode, setViewMode] = useState('infinite')
  const [page, setPage] = useState(0)
  const phone = useMediaQuery('(max-width: 767px)')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const dropdownRef = useRef(null)
  const creatorDropdownRef = useRef(null)
  const sentinelRef = useRef(null)
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
        setCreatorMenu('')
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
  function toggleExcludedCreator(c) {
    setExcludedCreators(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })
  }
  function toggleArchetype(a) {
    setActiveArchetypes(prev => { const n = new Set(prev); n.has(a) ? n.delete(a) : n.add(a); return n })
  }
  function toggleType(t) {
    setActiveTypes(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n })
  }

  // check the live streams as soon as Live is picked
  useEffect(() => {
    if (!showsLive(activeTypes)) return
    let alive = true
    videos.filter(isProbeable).forEach(v => {
      probeLive(v.video_id).then(st => { if (alive) setLiveStatus(prev => (prev[v.video_id] === st ? prev : { ...prev, [v.video_id]: st })) })
    })
    return () => { alive = false }
  }, [videos, activeTypes])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return videos.filter(v => {
      if (q && !v.title.toLowerCase().includes(q)) return false
      if (activeCreators.size > 0 && !activeCreators.has(v.creator_name)) return false
      if (excludedCreators.has(v.creator_name)) return false
      if (activeLanguages.size > 0 && !activeLanguages.has(LANG_CANONICAL[v.language] ?? v.language)) return false
      if (activeArchetypes.size > 0 && !activeArchetypes.has(v.archetype)) return false
      if (youtubeLiveIds.has(v.video_id)) return false
      if (!typeAllows(activeTypes, v, onAir)) return false
      if (dateFrom && v.date < dateFrom) return false
      return true
    })
  }, [videos, search, activeCreators, activeLanguages, activeArchetypes, activeTypes, dateFrom, excludedCreators, onAir, youtubeLiveIds])

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
        if (excludedCreators.has(v.creator_name)) return false
        if (activeLanguages.size > 0 && !activeLanguages.has(LANG_CANONICAL[v.language] ?? v.language)) return false
        if (!typeAllows(activeTypes, v, onAir)) return false
        if (dateFrom && v.date < dateFrom) return false
        return true
      })
    })
  }, [archetypes, archetypeSearch, activeArchetypes, videos, search, activeCreators, excludedCreators, activeLanguages, activeTypes, dateFrom, onAir])

  const visibleCreators = useMemo(() => {
    const q = search.trim().toLowerCase()
    return creators.filter(c => {
      if (activeCreators.has(c) || excludedCreators.has(c)) return false
      if (creatorSearch && !c.toLowerCase().includes(creatorSearch.toLowerCase())) return false
      return videos.some(v => {
        if (v.creator_name !== c) return false
        if (q && !v.title.toLowerCase().includes(q)) return false
        if (activeLanguages.size > 0 && !activeLanguages.has(LANG_CANONICAL[v.language] ?? v.language)) return false
        if (activeArchetypes.size > 0 && !activeArchetypes.has(v.archetype)) return false
        if (!typeAllows(activeTypes, v, onAir)) return false
        if (dateFrom && v.date < dateFrom) return false
        return true
      })
    })
  }, [creators, creatorSearch, activeCreators, excludedCreators, videos, search, activeLanguages, activeArchetypes, activeTypes, dateFrom, onAir])

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Watch</h1>
          <p className="mt-2 text-gray-400 text-sm">Pauper videos from creators around the world.</p>
        </div>

        <FilterPanel activeCount={(search ? 1 : 0) + activeCreators.size + excludedCreators.size + activeLanguages.size + activeArchetypes.size + (range ? 1 : 0)}
          onClear={() => { setSearch(''); setActiveCreators(new Set()); setExcludedCreators(new Set()); setActiveLanguages(new Set()); setActiveArchetypes(new Set()); setRange('') }}
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
            {WATCH_TYPES.map(([type, label]) => (
              <FilterButton key={type} active={activeTypes.has(type)} onClick={() => toggleType(type)}>{label}</FilterButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-16 shrink-0" title="Video previews, without pressing play">Autoplay:</span>
            <FilterButton active={previews} onClick={() => setPreviews(true)}>On</FilterButton>
            <FilterButton active={!previews} onClick={() => setPreviews(false)}>Off</FilterButton>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-16 shrink-0">Creator:</span>
              <div className="relative" ref={creatorDropdownRef}>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setCreatorMenu(m => m === 'show' ? '' : 'show'); setCreatorSearch('') }}
                    className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1 text-sm text-gray-300 hover:border-gray-400 focus:outline-none focus:border-amber-400 cursor-pointer flex items-center gap-2">
                    Add creator… <span className="text-gray-500 text-xs">▾</span>
                  </button>
                  <button
                    onClick={() => { setCreatorMenu(m => m === 'hide' ? '' : 'hide'); setCreatorSearch('') }}
                    className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1 text-sm text-gray-300 hover:border-gray-400 focus:outline-none focus:border-amber-400 cursor-pointer flex items-center gap-2">
                    Hide creator… <span className="text-gray-500 text-xs">▾</span>
                  </button>
                </div>
                {creatorDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-56 bg-gray-900 border border-gray-600 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-2">
                      <input
                        autoFocus
                        type="search"
                        placeholder={creatorMenu === 'hide' ? 'Search creators to hide…' : 'Search creators…'}
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
                                onClick={() => { (creatorMenu === 'hide' ? toggleExcludedCreator : toggleCreator)(c); setCreatorSearch(''); setCreatorMenu('') }}
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
            {(activeCreators.size > 0 || excludedCreators.size > 0) && (
              <div className="flex flex-wrap gap-1.5 pl-[calc(theme(spacing.2)+4rem)]">
                {[...activeCreators].map(c => (
                  // the whole pill removes the filter, not just its ×
                  <button key={c} type="button" onClick={() => toggleCreator(c)} title={`Remove the ${c} filter`} aria-label={`Remove the ${c} filter`}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-gray-900 cursor-pointer hover:bg-amber-300 transition-colors">
                    {c}
                    <span aria-hidden="true" className="leading-none">×</span>
                  </button>
                ))}
                {[...excludedCreators].map(c => (
                  <button key={c} type="button" onClick={() => toggleExcludedCreator(c)} title={`Hidden: click to show ${c} again`} aria-label={`Show ${c} again`}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-900/60 text-red-100 border border-red-700 cursor-pointer hover:bg-red-800/70 transition-colors">
                    <span className="line-through">{c}</span>
                    <span aria-hidden="true" className="leading-none">×</span>
                  </button>
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 w-16 shrink-0">Date:</span>
            <DateChips ranges={WATCH_RANGES} value={range} onChange={setRange} />
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

        {showsLive(activeTypes) && <LiveStreams hidden={excludedCreators} youtube={youtubeLive} languages={activeLanguages} />}

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
                  {viewMode === 'paginated' && !phone && totalPages > 1 && (
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

                  {viewMode === 'paginated' && phone && totalPages > 1 ? (
                    <div ref={paginationRef}>
                      <SwipeCards index={page} count={totalPages} cardKey={page}
                        onChange={setPage}
                        label={`Page ${page + 1} of ${totalPages}`}
                        hint="Swipe the page left or right for the next or previous page.">
                        <div className="grid grid-cols-1 gap-4">
                          {visibleVideos.map(v => <VideoCard key={v.video_id} v={v} previews={previews} withAvatar />)}
                        </div>
                      </SwipeCards>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {visibleVideos.map(v => <VideoCard key={v.video_id} v={v} previews={previews} withAvatar />)}
                    </div>
                  )}

                  {viewMode === 'paginated' && !phone && totalPages > 1 && (
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
