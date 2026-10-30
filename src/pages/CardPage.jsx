import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { RulesText } from '../components/CardPreview'
import { AppearanceRow } from '../components/Metagame'
import { fullCardSlug } from '../utils/cardPages'
import { nameToSlug } from '../utils/slugs'
import { formatShortDate } from '../utils/dates'

const MANA_ICONS = new Set([
  'W', 'U', 'B', 'R', 'G', 'C',
  'WU', 'WB', 'BR', 'BG', 'UB', 'UR', 'RG', 'RW', 'GW', 'GU',
  'GUP', 'GWP',
  'CW', 'CU', 'CB', 'CR', 'CG',
  '2W', '2U', '2B', '2R', '2G',
  'WP', 'UP', 'BP', 'RP', 'GP',
  'X', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '10', '11', '12', '13', '14', '15', '16',
])

function ManaCost({ cost }) {
  if (!cost) return null
  const tokens = [...cost.matchAll(/\{([^}]+)\}/g)].map(m => m[1])
  if (!tokens.length) return null
  return (
    <span className="inline-flex items-center gap-0.5">
      {tokens.map((t, i) => {
        const key = t.replace('/', '')
        if (MANA_ICONS.has(key)) return <img key={i} src={`/images/mana/${key}.png`} alt={t} className="w-5 h-5 inline-block" />
        return (
          <span key={i} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-600 text-gray-200 text-xs font-bold leading-none">
            {t}
          </span>
        )
      })}
    </span>
  )
}

function FaceDetails({ face }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-lg font-semibold text-gray-100">{face.name}</span>
        {face.mana_cost && <ManaCost cost={face.mana_cost} />}
      </div>
      {face.type_line && <span className="text-gray-300 text-sm">{face.type_line}</span>}
      {face.oracle_text && (
        <RulesText text={face.oracle_text}
          className="text-sm text-gray-200 leading-relaxed bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 space-y-1" />
      )}
      {face.flavor_text && (
        <p className="text-xs text-gray-400 italic leading-relaxed">{face.flavor_text}</p>
      )}
    </div>
  )
}

const PAGE_SIZE = 20
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SELECT_CLS = 'bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-amber-400 [color-scheme:dark]'

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

// The decklists playing the card (null while loading), from
// /data/card-decks/<slug>.json.
function useCardDecks(slug) {
  const [decks, setDecks] = useState(null)
  useEffect(() => {
    setDecks(null)
    fetch(`/data/card-decks/${slug}.json`)
      .then(r => r.ok ? r.json() : [])
      .then(setDecks)
      .catch(() => setDecks([]))
  }, [slug])
  return decks
}

// The archetypes playing the card, the most decklists first; the first few,
// the others on demand.
const PLAYED_IN_SHOWN = 8

function PlayedIn({ decks }) {
  const [showAll, setShowAll] = useState(false)
  const counts = useMemo(() => {
    const byArchetype = {}
    for (const d of decks || []) if (d.archetype) byArchetype[d.archetype] = (byArchetype[d.archetype] || 0) + 1
    return Object.entries(byArchetype).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [decks])
  if (!counts.length) return null
  const shown = showAll ? counts : counts.slice(0, PLAYED_IN_SHOWN)
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="w-24 shrink-0 text-gray-500">Played in:</span>
      {shown.map(([name, count]) => (
        <Link key={name} to={`/archetypes/${nameToSlug(name)}`} title={`${count.toLocaleString('en-US')} decklists`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600 hover:border-amber-400 hover:text-amber-400 transition-colors">
          {name}
          <span className="text-gray-500 tabular-nums">{count.toLocaleString('en-US')}</span>
        </Link>
      ))}
      {counts.length > PLAYED_IN_SHOWN && (
        <button onClick={() => setShowAll(s => !s)} className="text-xs text-gray-500 hover:text-amber-400 transition-colors">
          {showAll ? 'Show fewer' : `+${counts.length - PLAYED_IN_SHOWN} more`}
        </button>
      )}
    </div>
  )
}

function CardDecksSection({ decks }) {
  const [page, setPage] = useState(0)
  const [activeArchetypes, setActiveArchetypes] = useState(new Set())
  const [filterTournament, setFilterTournament] = useState('')
  const [filterPilot, setFilterPilot] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [archetypeSearch, setArchetypeSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

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
    return [...new Set(decks.map(d => d.archetype))].sort()
  }, [decks])

  function toggleArchetype(a) {
    setActiveArchetypes(prev => { const next = new Set(prev); next.has(a) ? next.delete(a) : next.add(a); return next })
    setPage(0)
  }

  const toYM = (d) => d.toISOString().slice(0, 7)
  const applyRange = (daysAgo) => {
    const to = new Date(), from = new Date()
    if (daysAgo === 7) from.setDate(from.getDate() - 7)
    else if (daysAgo === 30) from.setMonth(from.getMonth() - 1)
    else from.setFullYear(from.getFullYear() - 1)
    setFilterDateFrom(toYM(from)); setFilterDateTo(toYM(to)); setPage(0)
  }

  const filtered = useMemo(() => {
    if (!decks) return []
    return decks.filter(d => {
      if (activeArchetypes.size > 0 && !activeArchetypes.has(d.archetype)) return false
      if (filterTournament && !(d.tournament_name || '').toLowerCase().includes(filterTournament.toLowerCase())) return false
      if (filterPilot && !(d.pilot || '').toLowerCase().includes(filterPilot.toLowerCase())) return false
      if (filterDateFrom && (d.tournament_date || '').slice(0, 7) < filterDateFrom) return false
      if (filterDateTo && (d.tournament_date || '').slice(0, 7) > filterDateTo) return false
      return true
    })
  }, [decks, activeArchetypes, filterTournament, filterPilot, filterDateFrom, filterDateTo])

  if (!decks) return <p className="text-gray-500 text-sm">Loading decklists…</p>
  if (!decks.length) return <p className="text-gray-500 text-sm">No decklists recorded.</p>

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const setFilter = (setter) => (e) => { setter(e.target.value); setPage(0) }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-gray-700">Decklists</h2>
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
        <input
          type="search" placeholder="Search tournaments…" value={filterTournament} onChange={setFilter(setFilterTournament)}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400" />
        <input
          type="text" placeholder="Search pilots…" value={filterPilot} onChange={setFilter(setFilterPilot)}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400" />
        <div className="flex flex-wrap gap-4 items-center">
          <MonthPicker label="From" value={filterDateFrom} onChange={v => { setFilterDateFrom(v); setPage(0) }} />
          <MonthPicker label="To" value={filterDateTo} onChange={v => { setFilterDateTo(v); setPage(0) }} />
          <div className="flex gap-1.5">
            {[['Last week', 7], ['Last month', 30], ['Last year', 365]].map(([label, days]) => (
              <button key={label} onClick={() => applyRange(days)}
                className="px-2.5 py-1 text-xs rounded-md border border-gray-600 text-gray-400 hover:border-amber-400/50 hover:text-amber-400 transition-colors">
                {label}
              </button>
            ))}
            <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setPage(0) }}
              className="px-2.5 py-1 text-xs rounded-md border border-gray-600 text-gray-400 hover:border-amber-400/50 hover:text-amber-400 transition-colors">
              Reset
            </button>
          </div>
        </div>
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
      </div>

      <p className="text-xs text-gray-500">
        {filtered.length !== decks.length ? `${filtered.length} of ${decks.length}` : decks.length} decklists
      </p>

      <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900">
        <table className="w-full text-base bg-gray-900">
          <thead>
            <tr className="bg-gray-800 border-b border-gray-700">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Archetype</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Tournament</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Deck Date</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Pilot</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Result</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50 bg-gray-900">
            {paginated.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">No decklists match your filters.</td></tr>
            )}
            {paginated.map(deck => (
              <tr key={deck.id}
                onClick={() => navigate(`/decks/${deck.id}`)}
                onAuxClick={e => { if (e.button === 1) window.open(`/decks/${deck.id}`, '_blank') }}
                className="bg-gray-900 hover:bg-gray-800 transition-colors cursor-pointer">
                <td className="px-4 py-2.5 text-amber-400 text-base">{deck.archetype}</td>
                <td className="px-4 py-2.5 text-gray-300 hidden sm:table-cell">{deck.tournament_name}</td>
                <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{formatShortDate(deck.tournament_date)}</td>
                <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell">{deck.pilot || 'Anonymous'}</td>
                <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell">{deck.place}</td>
                <td className="px-4 py-2.5 text-amber-400 text-xs">View →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1 rounded-md border border-gray-700 hover:border-amber-400/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            ← Prev
          </button>
          <span>Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            className="px-3 py-1 rounded-md border border-gray-700 hover:border-amber-400/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Next →
          </button>
        </div>
      )}
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

        {card && (() => {
          const s = card.scryfall
          const faces = s?.card_faces || null
          // DFC: card_faces present but no top-level image (each face has its own image)
          // Split: card_faces present with a top-level image (one image, multiple text halves)
          const isDFC = !!faces && !s?.image_uris
          const isMultiFace = !!faces

          return (
            <>
              <div className="md:hidden flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold text-gray-100">{card.name}</h1>
                {!isMultiFace && s?.mana_cost && <ManaCost cost={s.mana_cost} />}
              </div>
              <div className="flex flex-col md:flex-row gap-8 mb-10">
                {/* Images */}
                <div className={`shrink-0 flex flex-col gap-3`}>
                  <div className={`flex gap-3 ${isDFC ? 'flex-row md:flex-col' : ''}`}>
                  {isDFC ? (
                    faces.map((face, i) =>
                      face.image_uris?.normal && (
                        <a key={i} href={s.scryfall_uri} target="_blank" rel="noopener noreferrer">
                          <img
                            src={face.image_uris.normal}
                            alt={face.name}
                            className="w-44 rounded-xl shadow-lg border border-gray-700 hover:border-amber-400 transition-colors"
                          />
                        </a>
                      )
                    )
                  ) : s?.image_uris?.normal ? (
                    <a href={s.scryfall_uri} target="_blank" rel="noopener noreferrer">
                      <img
                        src={s.image_uris.normal}
                        alt={card.name}
                        className="w-64 rounded-xl shadow-lg border border-gray-700 hover:border-amber-400 transition-colors"
                      />
                    </a>
                  ) : null}
                  </div>
                  {/* Links, under the card: as wide as the images (w-0 min-w-full),
                      wrapping under narrow ones rather than widening the column */}
                  <div className="w-0 min-w-full flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
                    {s?.scryfall_uri && (
                      <a href={s.scryfall_uri} target="_blank" rel="noopener noreferrer"
                        className="text-gray-400 hover:text-amber-400 transition-colors">
                        View on Scryfall →
                      </a>
                    )}
                    <Link to="/cards" className="text-gray-400 hover:text-amber-400 transition-colors">Cards Index →</Link>
                  </div>
                </div>

                {/* Card details */}
                <div className="flex flex-col gap-5 min-w-0">
                  {isMultiFace ? (
                    <>
                      <h1 className="hidden md:block text-2xl font-bold text-gray-100">{card.name}</h1>
                      {faces.map((face, i) => (
                        <div key={i}>
                          {i > 0 && <div className="border-t border-gray-700 mb-5" />}
                          <FaceDetails face={face} />
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="hidden md:flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-gray-100">{card.name}</h1>
                        {s?.mana_cost && <ManaCost cost={s.mana_cost} />}
                      </div>
                      {s?.type_line && <span className="text-gray-300 text-sm">{s.type_line}</span>}
                      {s?.oracle_text && (
                        <RulesText text={s.oracle_text}
                          className="text-sm text-gray-200 leading-relaxed bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 space-y-1" />
                      )}
                      {s?.flavor_text && (
                        <p className="text-xs text-gray-400 italic leading-relaxed">{s.flavor_text}</p>
                      )}
                    </>
                  )}

                  {/* Artist + set */}
                  {(s?.artist || s?.set_name) && (
                    <p className="text-xs text-gray-500">
                      {s.artist && <>Illustrated by <span className="text-gray-400">{s.artist}</span></>}
                      {s.artist && s.set_name && <span className="mx-2">·</span>}
                      {s.set_name && <span className="text-gray-400">{s.set_name}</span>}
                    </p>
                  )}

                  {/* First and last decklists playing it */}
                  {card.first_appearance && (
                    <div className="space-y-2">
                      <AppearanceRow label="First played:" appearance={card.first_appearance}
                        note={card.first_on_record && '— our decklists start here: it may have been played earlier'} />
                      <AppearanceRow label="Last played:" appearance={card.last_appearance} />
                    </div>
                  )}
                  <PlayedIn decks={decks} />
                </div>
              </div>

              <section>
                <CardDecksSection decks={decks} />
              </section>
            </>
          )
        })()}
      </div>
    </Layout>
  )
}
