import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { nameToSlug } from '../utils/slugs'

const LANG_FLAG = {
  en: '🇬🇧', eng: '🇬🇧',
  it: '🇮🇹', ita: '🇮🇹', IT: '🇮🇹',
}
const LANG_CANONICAL = {
  en: 'en', eng: 'en',
  it: 'it', ita: 'it', IT: 'it',
}
const LANG_DISPLAY = {
  en: '🇬🇧 English',
  it: '🇮🇹 Italian',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SELECT_CLS = 'bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-amber-400 [color-scheme:dark]'

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

function MonthPicker({ label, value, onChange }) {
  const [year, setYear] = useState(value ? value.split('-')[0] : '')
  const [month, setMonth] = useState(value ? value.split('-')[1] : '')
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2018 }, (_, i) => String(2019 + i))

  useEffect(() => {
    setYear(value ? value.split('-')[0] : '')
    setMonth(value ? value.split('-')[1] : '')
  }, [value])

  const handleYear = (y) => { setYear(y); onChange(y && month ? `${y}-${month}` : '') }
  const handleMonth = (m) => { setMonth(m); onChange(year && m ? `${year}-${m}` : '') }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-gray-400 shrink-0">{label}</span>
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
  const [activeCreators, setActiveCreators] = useState(new Set())
  const [activeLanguages, setActiveLanguages] = useState(new Set())
  const [activeArchetypes, setActiveArchetypes] = useState(new Set())
  const [archetypeSearch, setArchetypeSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const dropdownRef = useRef(null)

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

  const creators = useMemo(() => [...new Set(videos.map(v => v.creator_name).filter(Boolean))].sort(), [videos])
  const languages = useMemo(() => [...new Set(videos.map(v => LANG_CANONICAL[v.language] ?? v.language).filter(Boolean))].sort(), [videos])
  const archetypes = useMemo(() => [...new Set(videos.map(v => v.archetype).filter(Boolean))].sort(), [videos])

  function toggleLanguage(l) {
    setActiveLanguages(prev => {
      const next = new Set(prev)
      next.has(l) ? next.delete(l) : next.add(l)
      return next
    })
  }

  function toggleCreator(c) {
    setActiveCreators(prev => {
      const next = new Set(prev)
      next.has(c) ? next.delete(c) : next.add(c)
      return next
    })
  }

  function toggleArchetype(a) {
    setActiveArchetypes(prev => {
      const next = new Set(prev)
      next.has(a) ? next.delete(a) : next.add(a)
      return next
    })
  }

  const toYM = (d) => d.toISOString().slice(0, 7)
  function applyRange(daysAgo) {
    const to = new Date()
    const from = new Date()
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
      if (filterDateFrom && v.date.slice(0, 7) < filterDateFrom) return false
      if (filterDateTo && v.date.slice(0, 7) > filterDateTo) return false
      return true
    })
  }, [videos, search, activeCreators, activeLanguages, activeArchetypes, filterDateFrom, filterDateTo])

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
        if (filterDateFrom && v.date.slice(0, 7) < filterDateFrom) return false
        if (filterDateTo && v.date.slice(0, 7) > filterDateTo) return false
        return true
      })
    })
  }, [archetypes, archetypeSearch, activeArchetypes, videos, search, activeCreators, activeLanguages, filterDateFrom, filterDateTo])

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Watch</h1>
          <p className="mt-2 text-gray-400 text-sm">Pauper videos from creators around the world.</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <input
            type="search"
            placeholder="Search videos…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
          />
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-16 shrink-0">Language:</span>
            {languages.map(l => (
              <FilterButton key={l} active={activeLanguages.has(l)} onClick={() => toggleLanguage(l)}>
                {LANG_DISPLAY[l] ?? l}
              </FilterButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 w-16 shrink-0">Creator:</span>
            {creators.map(c => (
              <FilterButton key={c} active={activeCreators.has(c)} onClick={() => toggleCreator(c)}>{c}</FilterButton>
            ))}
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
              <div className="flex flex-wrap gap-1.5 pl-[calc(theme(spacing.2)+5rem)]">
                {[...activeArchetypes].map(a => (
                  <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400 text-gray-900">
                    {a}
                    <button onClick={() => toggleArchetype(a)} className="hover:text-gray-700 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <MonthPicker label="From" value={filterDateFrom} onChange={v => setFilterDateFrom(v)} />
            <MonthPicker label="To" value={filterDateTo} onChange={v => setFilterDateTo(v)} />
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
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading videos…</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">{filtered.length} video{filtered.length !== 1 ? 's' : ''}</p>
            {filtered.length === 0
              ? <p className="text-center text-gray-500 text-sm py-12">No videos match your filters.</p>
              : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map(v => (
                    <a key={v.video_id} href={v.link} target="_blank" rel="noreferrer"
                      className="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-amber-400/50 transition-all flex flex-col">
                      <div className="relative aspect-video bg-gray-900 overflow-hidden">
                        <img
                          src={`https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`}
                          alt={v.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3 flex flex-col gap-1.5 flex-1">
                        <p className="text-sm font-medium text-gray-200 group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                          {v.title}
                        </p>
                        <p className="text-xs text-gray-400">{v.creator_name}</p>
                        <div className="mt-auto pt-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-base leading-none shrink-0">{LANG_FLAG[v.language] ?? v.language}</span>
                            <Link
                              to={`/archetypes/${nameToSlug(v.archetype)}`}
                              onClick={e => e.stopPropagation()}
                              className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-700 text-amber-400 hover:bg-gray-600 transition-colors truncate">
                              {v.archetype}
                            </Link>
                          </div>
                          <span className="text-xs text-gray-500 shrink-0">{v.date}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )
            }
          </>
        )}
      </div>
    </Layout>
  )
}
