import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { nameToSlug } from '../utils/slugs'

const LANG_FLAG = {
  en: '🇬🇧', eng: '🇬🇧', 'en-US': '🇬🇧', 'en-GB': '🇬🇧',
  it: '🇮🇹', ita: '🇮🇹', IT: '🇮🇹',
  pt: '🇵🇹', 'pt-BR': '🇵🇹', 'pt-PT': '🇵🇹',
  de: '🇩🇪',
  es: '🇪🇸', 'es-419': '🇪🇸',
  fr: '🇫🇷',
  hi: '🇮🇳',
  pl: '🇵🇱',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SELECT_CLS = 'bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-amber-400 [color-scheme:dark]'
const PAGE_SIZE = 20
const VIDEO_PAGE_SIZE = 50

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
      <span className="text-sm text-gray-500 shrink-0 w-12">{label}</span>
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

function VideoCard({ v }) {
  const [playing, setPlaying] = useState(false)
  const containerRef = useRef(null)

  function handlePlay() {
    setPlaying(true)
    if (containerRef.current && containerRef.current.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {})
    }
  }

  return (
    <div className="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-amber-400/50 transition-all flex flex-col">
      <div ref={containerRef} className="relative aspect-video bg-gray-900 overflow-hidden">
        {playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${v.video_id}?autoplay=1`}
            title={v.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          />
        ) : (
          <button onClick={handlePlay} className="relative w-full h-full block">
            <img
              src={`https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`}
              alt={v.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center group-hover:bg-amber-400/90 transition-colors">
                <svg className="w-9 h-9 text-white fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M5 4.623V19.38a1.5 1.5 0 002.26 1.29L22 12 7.26 3.33A1.5 1.5 0 005 4.623Z" />
                </svg>
              </div>
            </div>
          </button>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <a href={v.link} target="_blank" rel="noreferrer"
          className="text-sm font-medium text-gray-200 hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
          {v.title}
        </a>
        <div className="mt-auto pt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base leading-none shrink-0">{LANG_FLAG[v.language] ?? v.language}</span>
            <Link
              to={`/archetypes/${nameToSlug(v.archetype)}`}
              className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-700 text-amber-400 hover:bg-gray-600 transition-colors truncate">
              {v.archetype}
            </Link>
          </div>
          <span className="text-xs text-gray-500 shrink-0">{v.date}</span>
        </div>
      </div>
    </div>
  )
}

export default function PlayerPage() {
  const { slug } = useParams()
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [filterTournament, setFilterTournament] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [activeArchetypes, setActiveArchetypes] = useState(new Set())
  const [archetypeSearch, setArchetypeSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [page, setPage] = useState(0)
  const dropdownRef = useRef(null)
  const paginationRef = useRef(null)
  const pageInitRef = useRef(true)

  const [creator, setCreator] = useState(null)
  const [creatorVideos, setCreatorVideos] = useState([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [videoPage, setVideoPage] = useState(0)
  const videoPaginationRef = useRef(null)
  const videoPageInitRef = useRef(true)

  useEffect(() => {
    fetch(`/data/player-decks/${slug}.json`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setPlayer(data); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  useEffect(() => {
    if (!player) return
    fetch('/data/creators.json')
      .then(r => r.json())
      .then(creators => {
        const match = creators.find(c =>
          (c.mtgo_name && c.mtgo_name === player.name) ||
          (c.mtgo_name2 && c.mtgo_name2 === player.name)
        )
        if (!match) return
        setCreator(match)
        setVideosLoading(true)
        fetch('/data/videos.json')
          .then(r => r.json())
          .then(videos => {
            setCreatorVideos(videos.filter(v => v.creator_name === match.name))
            setVideosLoading(false)
          })
      })
  }, [player])

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
    if (pageInitRef.current) { pageInitRef.current = false; return }
    const el = paginationRef.current
    if (!el) return
    const headerHeight = document.querySelector('header')?.offsetHeight ?? 64
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 16
    window.scrollTo({ top, behavior: 'smooth' })
  }, [page])

  function toggleArchetype(a) {
    setActiveArchetypes(prev => { const n = new Set(prev); n.has(a) ? n.delete(a) : n.add(a); return n })
    setPage(0)
  }

  const filtered = useMemo(() => {
    if (!player) return []
    return player.decks.filter(d => {
      if (filterTournament && !(d.tournament_name || '').toLowerCase().includes(filterTournament.toLowerCase())) return false
      if (filterDateFrom && (d.tournament_date || '').slice(0, 7) < filterDateFrom) return false
      if (filterDateTo && (d.tournament_date || '').slice(0, 7) > filterDateTo) return false
      if (activeArchetypes.size > 0 && !activeArchetypes.has(d.archetype)) return false
      return true
    })
  }, [player, filterTournament, filterDateFrom, filterDateTo, activeArchetypes])

  useEffect(() => { setPage(0) }, [filtered])

  useEffect(() => {
    if (videoPageInitRef.current) { videoPageInitRef.current = false; return }
    const el = videoPaginationRef.current
    if (!el) return
    const headerHeight = document.querySelector('header')?.offsetHeight ?? 64
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 16
    window.scrollTo({ top, behavior: 'smooth' })
  }, [videoPage])

  const visibleArchetypes = useMemo(() => {
    if (!player) return []
    return player.archetypes.filter(a => {
      if (activeArchetypes.has(a)) return false
      if (archetypeSearch && !a.toLowerCase().includes(archetypeSearch.toLowerCase())) return false
      return true
    })
  }, [player, archetypeSearch, activeArchetypes])

  const filteredVideos = useMemo(() =>
    activeArchetypes.size > 0
      ? creatorVideos.filter(v => activeArchetypes.has(v.archetype))
      : creatorVideos
  , [creatorVideos, activeArchetypes])

  useEffect(() => { setVideoPage(0) }, [filteredVideos])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageDecks = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const totalVideoPages = Math.ceil(filteredVideos.length / VIDEO_PAGE_SIZE)
  const visibleVideos = filteredVideos.slice(videoPage * VIDEO_PAGE_SIZE, (videoPage + 1) * VIDEO_PAGE_SIZE)

  const paginationBar = (ref) => (
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
        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>
        ) : notFound ? (
          <div className="text-center py-20">
            <p className="text-4xl font-bold text-gray-600 mb-4">404</p>
            <p className="text-gray-400 mb-6">Player not found.</p>
            <Link to="/players" className="text-amber-400 hover:underline text-sm">← Back to Players</Link>
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{player.name}</h1>
                {creator && creator.youtube_channel_url && (
                  <a href={creator.youtube_channel_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 hover:border-red-500/70 hover:text-red-400 text-gray-400 transition-colors text-xs font-medium"
                    title="YouTube channel">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    YouTube
                  </a>
                )}
                {creator && creator.twitch_channel_url && (
                  <a href={creator.twitch_channel_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 hover:border-purple-500/70 hover:text-purple-400 text-gray-400 transition-colors text-xs font-medium"
                    title="Twitch channel">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                    </svg>
                    Twitch
                  </a>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-400">
                <span><span className="text-white font-medium">{player.deckCount.toLocaleString()}</span> decks</span>
                <span><span className="text-white font-medium">{player.archetypeCount}</span> archetypes</span>
                {player.firstSeen && <span>First seen: <span className="text-white font-medium">{player.firstSeen}</span></span>}
                {player.lastSeen && <span>Last seen: <span className="text-white font-medium">{player.lastSeen}</span></span>}
              </div>
            </div>

            {creator && creator.resources && creator.resources.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-white border-t border-gray-700 pt-4">Resources</h2>
                <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900">
                  <table className="w-full text-base bg-gray-900 table-fixed">
                    <thead>
                      <tr className="bg-gray-800 border-b border-gray-700">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-1/2">Title</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-1/4 hidden sm:table-cell">Archetype</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-1/4 hidden md:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {creator.resources.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-800 transition-colors">
                          <td className="px-4 py-2.5">
                            <a href={r.link} target="_blank" rel="noreferrer"
                              className="text-amber-400 hover:underline font-medium leading-snug">
                              {r.language && <span className="mr-1.5 text-base leading-none">{r.language}</span>}
                              {r.name}
                            </a>
                          </td>
                          <td className="px-4 py-2.5 hidden sm:table-cell">
                            <Link to={`/archetypes/${r.archetype_slug}`}
                              className="text-amber-400 hover:underline font-medium">
                              {r.archetype}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{r.date || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {creator && creator.sideboards && creator.sideboards.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-white border-t border-gray-700 pt-4">Sideboard Guides</h2>
                <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900">
                  <table className="w-full text-base bg-gray-900">
                    <thead>
                      <tr className="bg-gray-800 border-b border-gray-700">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Archetype</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Price</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50 bg-gray-900">
                      {creator.sideboards.map((s, i) => (
                        <tr key={i} className="bg-gray-900 hover:bg-gray-800 transition-colors">
                          <td className="px-4 py-2.5">
                            <a href={s.link} target="_blank" rel="noreferrer"
                              className="text-amber-400 hover:underline font-medium">{s.archetype}</a>
                          </td>
                          <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{s.price || '—'}</td>
                          <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{s.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <h2 className="text-lg font-semibold text-white border-t border-gray-700 pt-4">Decks</h2>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search tournaments…"
                  value={filterTournament}
                  onChange={e => { setFilterTournament(e.target.value); setPage(0) }}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 [&::-webkit-search-cancel-button]:hidden"
                />
                {filterTournament && (
                  <button onClick={() => { setFilterTournament(''); setPage(0) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label="Clear">
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

              <div className="flex flex-wrap items-center gap-4">
                <MonthPicker label="From:" value={filterDateFrom} onChange={v => { setFilterDateFrom(v); setPage(0) }} />
                <MonthPicker label="To:" value={filterDateTo} onChange={v => { setFilterDateTo(v); setPage(0) }} />
                {(filterDateFrom || filterDateTo) && (
                  <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setPage(0) }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                    Reset
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500">{filtered.length.toLocaleString()} deck{filtered.length !== 1 ? 's' : ''}</p>

            {filtered.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-12">No decks match your filters.</p>
            ) : (
              <>
                {totalPages > 1 && paginationBar(paginationRef)}
                <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900">
                  <table className="w-full text-base bg-gray-900 table-fixed">
                    <thead>
                      <tr className="bg-gray-800 border-b border-gray-700">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-[35%]">Tournament</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-[20%] hidden sm:table-cell">Archetype</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-40 hidden md:table-cell">Date</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 hidden sm:table-cell">Place</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Deck</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50 bg-gray-900">
                      {pageDecks.map(d => (
                        <tr key={d.id} className="bg-gray-900 hover:bg-gray-800 transition-colors">
                          <td className="px-4 py-2.5 text-gray-300 truncate">{d.tournament_name || '—'}</td>
                          <td className="px-4 py-2.5 hidden sm:table-cell">
                            <Link to={`/archetypes/${nameToSlug(d.archetype)}`}
                              className="text-amber-400 hover:underline font-medium">
                              {d.archetype}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{d.tournament_date || '—'}</td>
                          <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{d.place || '—'}</td>
                          <td className="px-4 py-2.5">
                            <Link to={`/decks/${d.id}`}
                              className="text-xs font-semibold text-gray-400 hover:text-amber-400 transition-colors">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && paginationBar(null)}
              </>
            )}

            {creator && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-white border-t border-gray-700 pt-4">Videos</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}{activeArchetypes.size > 0 && creatorVideos.length !== filteredVideos.length ? ` (${creatorVideos.length} total)` : ''}
                  </p>
                </div>
                {videosLoading ? (
                  <p className="text-gray-500 text-sm">Loading videos…</p>
                ) : filteredVideos.length === 0 ? (
                  <p className="text-gray-500 text-sm">No videos match the selected archetypes.</p>
                ) : (
                  <>
                    {totalVideoPages > 1 && (
                      <div ref={videoPaginationRef} className="flex items-center justify-center gap-3 py-2">
                        <button onClick={() => setVideoPage(p => Math.max(0, p - 1))} disabled={videoPage === 0}
                          className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          ← Previous
                        </button>
                        <span className="text-sm text-gray-400">Page {videoPage + 1} of {totalVideoPages}</span>
                        <button onClick={() => setVideoPage(p => Math.min(totalVideoPages - 1, p + 1))} disabled={videoPage >= totalVideoPages - 1}
                          className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          Next →
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {visibleVideos.map(v => <VideoCard key={v.video_id} v={v} />)}
                    </div>
                    {totalVideoPages > 1 && (
                      <div className="flex items-center justify-center gap-3 py-2">
                        <button onClick={() => setVideoPage(p => Math.max(0, p - 1))} disabled={videoPage === 0}
                          className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          ← Previous
                        </button>
                        <span className="text-sm text-gray-400">Page {videoPage + 1} of {totalVideoPages}</span>
                        <button onClick={() => setVideoPage(p => Math.min(totalVideoPages - 1, p + 1))} disabled={videoPage >= totalVideoPages - 1}
                          className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
