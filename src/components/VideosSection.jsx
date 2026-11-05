import { useState, useEffect, useMemo, useRef } from 'react'
import { firstYearOf } from '../utils/dates'
import { LANG_FLAG, LANG_CANONICAL, LANG_NAME } from '../utils/languages'
import VideoCard from './VideoCard'

// The videos of an archetype, with their filters: on the archetype page, and
// on the pages of its decks.

const LANG_DISPLAY = Object.fromEntries(Object.entries(LANG_NAME).map(([l, name]) => [l, `${LANG_FLAG[l]} ${name}`]))

const VIDEOS_PAGE_SIZE = 50
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SELECT_CLS = 'bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-amber-400 [color-scheme:dark]'

function FilterButton({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
        active
          ? 'bg-amber-400 text-gray-900 border-amber-400'
          : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400 hover:text-gray-200'
      }`}>
      {children}
    </button>
  )
}

export function MonthPicker({ label, value, onChange, labelClass = '', firstYear }) {
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
    <div className="flex items-center gap-1.5">
      <span className={`text-sm text-gray-400 shrink-0 ${labelClass}`}>{label}</span>
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

export default function VideosSection({ videos: allVideos }) {
  const [search, setSearch] = useState('')
  const [activeCreators, setActiveCreators] = useState(new Set())
  const [activeLanguages, setActiveLanguages] = useState(new Set())
  const [activeType, setActiveType] = useState('videos')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [toWrapped, setToWrapped] = useState(false)
  const [viewMode, setViewMode] = useState('infinite')
  const [page, setPage] = useState(0)
  const [visibleCount, setVisibleCount] = useState(VIDEOS_PAGE_SIZE)
  const dateRowRef = useRef(null)
  const sentinelRef = useRef(null)
  const paginationRef = useRef(null)
  const pageInitRef = useRef(true)

  const creators = useMemo(() => [...new Set((allVideos || []).map(v => v.creator_name).filter(Boolean))].sort(), [allVideos])
  const languages = useMemo(() => [...new Set((allVideos || []).map(v => LANG_CANONICAL[v.language] ?? v.language).filter(Boolean))].sort(), [allVideos])

  function toggleCreator(c) { setActiveCreators(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n }) }
  function toggleLanguage(l) { setActiveLanguages(prev => { const n = new Set(prev); n.has(l) ? n.delete(l) : n.add(l); return n }) }
  function toggleType(t) { setActiveType(prev => prev === t ? '' : t) }

  const toYM = (d) => d.toISOString().slice(0, 7)
  function applyRange(daysAgo) {
    const to = new Date(), from = new Date()
    if (daysAgo === 7) from.setDate(from.getDate() - 7)
    else if (daysAgo === 30) from.setMonth(from.getMonth() - 1)
    else from.setFullYear(from.getFullYear() - 1)
    setFilterDateFrom(toYM(from)); setFilterDateTo(toYM(to))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (allVideos || []).filter(v => {
      if (q && !v.title.toLowerCase().includes(q)) return false
      if (activeCreators.size > 0 && !activeCreators.has(v.creator_name)) return false
      if (activeLanguages.size > 0 && !activeLanguages.has(LANG_CANONICAL[v.language] ?? v.language)) return false
      if (activeType === 'videos' && v.is_short === true) return false
      if (activeType === 'shorts' && v.is_short !== true) return false
      if (filterDateFrom && v.date.slice(0, 7) < filterDateFrom) return false
      if (filterDateTo && v.date.slice(0, 7) > filterDateTo) return false
      return true
    })
  }, [allVideos, search, activeCreators, activeLanguages, activeType, filterDateFrom, filterDateTo])

  const firstYear = useMemo(() => firstYearOf(allVideos, 'date'), [allVideos])

  useEffect(() => { setPage(0); setVisibleCount(VIDEOS_PAGE_SIZE) }, [filtered])

  useEffect(() => {
    if (pageInitRef.current) { pageInitRef.current = false; return }
    const el = paginationRef.current
    if (!el) return
    const headerHeight = document.querySelector('header')?.offsetHeight ?? 64
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - headerHeight - 16, behavior: 'smooth' })
  }, [page])

  useEffect(() => {
    if (viewMode !== 'infinite' || visibleCount >= filtered.length) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(c => c + VIDEOS_PAGE_SIZE) },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [viewMode, visibleCount, filtered])

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

  const totalPages = Math.ceil(filtered.length / VIDEOS_PAGE_SIZE)
  const visibleVideos = viewMode === 'paginated'
    ? filtered.slice(page * VIDEOS_PAGE_SIZE, (page + 1) * VIDEOS_PAGE_SIZE)
    : filtered.slice(0, visibleCount)

  const paginationBar = (ref) => (
    <div ref={ref} className="flex items-center justify-center gap-3">
      <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        ← Previous
      </button>
      <span className="text-sm text-gray-400">Page {page + 1} of {totalPages}</span>
      <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        Next →
      </button>
    </div>
  )

  if (!allVideos?.length) return <p className="text-gray-500 text-sm">No videos recorded.</p>

  return (
    <div className="space-y-3">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
        <div className="relative">
          <input type="search" placeholder="Search videos…" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 [&::-webkit-search-cancel-button]:hidden" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label="Clear search">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        {languages.length > 1 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-16 shrink-0">Language:</span>
            {languages.map(l => (
              <FilterButton key={l} active={activeLanguages.has(l)} onClick={() => toggleLanguage(l)}>{LANG_DISPLAY[l] ?? l}</FilterButton>
            ))}
          </div>
        )}
        {allVideos.some(v => v.is_short === true) && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-16 shrink-0">Type:</span>
            <FilterButton active={activeType === 'videos'} onClick={() => toggleType('videos')}>Videos</FilterButton>
            <FilterButton active={activeType === 'shorts'} onClick={() => toggleType('shorts')}>Shorts</FilterButton>
          </div>
        )}
        {creators.length > 1 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-16 shrink-0">Creator:</span>
            {creators.map(c => (
              <FilterButton key={c} active={activeCreators.has(c)} onClick={() => toggleCreator(c)}>{c}</FilterButton>
            ))}
          </div>
        )}
        <div ref={dateRowRef} className="flex flex-wrap items-center gap-4">
          <MonthPicker label="From:" value={filterDateFrom} onChange={v => setFilterDateFrom(v)} labelClass="w-16" firstYear={firstYear} />
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
            <button onClick={() => setViewMode('infinite')}
              className={`px-4 py-1.5 transition-colors ${viewMode === 'infinite' ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
              Infinite scroll
            </button>
            <div className="w-px bg-gray-600" />
            <button onClick={() => setViewMode('paginated')}
              className={`px-4 py-1.5 transition-colors ${viewMode === 'paginated' ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
              Paginated
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">{filtered.length !== allVideos.length ? `${filtered.length} of ${allVideos.length}` : allVideos.length} video{allVideos.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0
        ? <p className="text-center text-gray-500 text-sm py-12">No videos match your filters.</p>
        : (
          <>
            {viewMode === 'paginated' && totalPages > 1 && paginationBar(paginationRef)}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleVideos.map(v => <VideoCard showArchetype={false} key={v.video_id || v.link} v={v} />)}
            </div>
            {viewMode === 'paginated' && totalPages > 1 && paginationBar(null)}
            {viewMode === 'infinite' && visibleCount < filtered.length && (
              <div ref={sentinelRef} className="py-8 text-center text-gray-500 text-sm">Loading more…</div>
            )}
          </>
        )
      }
    </div>
  )
}
