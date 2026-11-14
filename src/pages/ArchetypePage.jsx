import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Layout from '../components/Layout'
import { useCardPreview } from '../components/CardPreview'
import { AppearanceRow, MetagameBadge } from '../components/Metagame'
import CardPopularityChart, { PopularityTrend, useMetagames } from '../components/CardPopularityChart'
import TournamentDecks, { useIsDesktop } from '../components/TournamentDecks'
import { displayPlace } from '../utils/places'
import TypicalListSection from '../components/TypicalListSection'
import { cardLinkSlug, useCardPages } from '../utils/cardPages'
import { nameToSlug, pilotToSlug } from '../utils/slugs'
import { firstYearOf, formatShortDate } from '../utils/dates'
import { LANG_FLAG } from '../utils/languages'
import VideosSection, { MonthPicker } from '../components/VideosSection'

const POPULARITY_METAGAMES = '/data/archetype-popularity-metagames.json'
const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
function ManaIcon({ color }) {
  return (
    <img src={`/images/mana/${color}.png`} alt={color}
      className="w-5 h-5 inline-block" />
  )
}

function Rank({ rank }) {
  return <span className="font-semibold text-amber-400 tabular-nums">#{rank.toLocaleString('en-US')}</span>
}

// The archetype's popularity rank over all the tournament decks, then in the
// latest metagame (a link to the chart) with its share and trend.
function PopularityRow({ popularity, metagames }) {
  const { all_time_rank: allTime, series } = popularity
  const last = series[series.length - 1]
  const bySlug = Object.fromEntries((metagames || []).map(m => [m.slug, m]))
  const current = bySlug[last[0]]
  if (!current) return null
  const share = m => +(100 * m[1] / bySlug[m[0]].decks).toFixed(2)
  const previous = series.length > 1 && bySlug[series[series.length - 2][0]] ? share(series[series.length - 2]) : 0
  const metagame = { metagame: current.slug.split('.')[0], label: current.label, date: current.date, name: current.name }
  return (
    <div className="flex items-baseline gap-x-1.5 text-sm text-gray-300">
      <span className="w-24 shrink-0 text-gray-500">Popularity:</span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        <Rank rank={allTime} /><span className="text-gray-400">all time</span>
        <span className="text-gray-600">·</span>
        {last[2] != null
          ? <a href="#popularity" className="hover:underline"><Rank rank={last[2]} /></a>
          : <span className="text-gray-500">Not played</span>}
        <span className="text-gray-400">in</span>
        <MetagameBadge metagame={metagame} />
        <span className="tabular-nums">{share(last).toFixed(1)}% of decks</span>
        <PopularityTrend share={share(last)} previous={previous} />
      </div>
    </div>
  )
}

function SectionHeader({ children }) {
  return <h2 className="text-lg font-semibold text-white mb-3 pt-4 border-t border-gray-700">{children}</h2>
}

// Scrolls to a section of the page, clear of the sticky header.
function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  const headerHeight = document.querySelector('header')?.offsetHeight ?? 64
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - headerHeight - 8, behavior: 'smooth' })
}

// The page's table of contents: sections: [{ id, label, count }].
function TableOfContents({ sections }) {
  return (
    <nav aria-label="On this page" className="bg-gray-800 border border-gray-700 rounded-xl p-4 md:w-60 shrink-0">
      <p className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">On this page</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 md:flex-col">
        {sections.map(({ id, label, count }) => (
          <li key={id}>
            <a href={`#${id}`} onClick={e => { e.preventDefault(); scrollToSection(id) }}
              className="text-sm text-gray-300 hover:text-amber-400 transition-colors">
              {label}
              {count != null && <span className="ml-1.5 text-xs text-gray-500 tabular-nums">{count.toLocaleString('en-US')}</span>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function DecksTable({ decks, referenceNames }) {
  if (!decks?.length) return <p className="text-gray-500 text-sm">No decks recorded.</p>

  const ref = decks.filter(d => d.is_reference)
  const other = decks.filter(d => !d.is_reference)

  return (
    <div className="space-y-4">
      {ref.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Reference decks</p>
          <DeckRows decks={ref} />
        </div>
      )}
      {other.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Other decks</p>
          <DeckRows decks={other} />
        </div>
      )}
    </div>
  )
}

function DeckRows({ decks }) {
  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900">
      <table className="w-full text-base bg-gray-900 table-fixed">
        <thead>
          <tr className="bg-gray-800 border-b border-gray-700">
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-[40%]">Name</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell w-28">Set Date</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell w-48">Set</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">Legal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50 bg-gray-900">
          {decks.map(deck => (
            <tr key={deck.name} className="bg-gray-900 hover:bg-gray-800 transition-colors">
              <td className="px-4 py-2.5 truncate">
                <a href={deck.url} target="_blank" rel="noreferrer"
                  className="text-amber-400 hover:underline font-medium">{deck.name}</a>
              </td>
              <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{formatShortDate(deck.set_date)}</td>
              <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{deck.set_name}</td>
              <td className="px-4 py-2.5">
                {deck.legal
                  ? <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  : <span className="text-xs font-semibold text-red-400 tracking-wide">BAN</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const DECKS_PAGE_SIZE = 20

function IntelDecksSection({ name }) {
  const [decks, setDecks] = useState(null)
  const [page, setPage] = useState(0)
  const paginationRef = useRef(null)
  const pageInitRef = useRef(true)
  const [filterTournament, setFilterTournament] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterPilot, setFilterPilot] = useState('')
  const isDesktop = useIsDesktop()

  useEffect(() => {
    fetch(`/data/intel-decks/${name}.json`)
      .then(r => r.ok ? r.json() : [])
      .then(setDecks)
  }, [name])

  useEffect(() => {
    if (pageInitRef.current) { pageInitRef.current = false; return }
    const el = paginationRef.current
    if (!el) return
    const headerHeight = document.querySelector('header')?.offsetHeight ?? 64
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - headerHeight - 16, behavior: 'smooth' })
  }, [page])

  const filtered = useMemo(() => {
    if (!decks) return []
    return decks.filter(d => {
      if (filterTournament && !(d.tournament_name || '').toLowerCase().includes(filterTournament.toLowerCase())) return false
      if (filterDateFrom && (d.tournament_date || '').slice(0, 7) < filterDateFrom) return false
      if (filterDateTo && (d.tournament_date || '').slice(0, 7) > filterDateTo) return false
      if (filterPilot && !(d.pilot || '').toLowerCase().includes(filterPilot.toLowerCase())) return false
      return true
    })
  }, [decks, filterTournament, filterDateFrom, filterDateTo, filterPilot])

  const firstYear = useMemo(() => firstYearOf(decks, 'tournament_date'), [decks])

  const setFilter = (setter) => (e) => { setter(e.target.value); setPage(0) }

  const toYM = (d) => d.toISOString().slice(0, 7)
  const applyRange = (daysAgo) => {
    const to = new Date()
    const from = new Date()
    if (daysAgo === 7) from.setDate(from.getDate() - 7)
    else if (daysAgo === 30) from.setMonth(from.getMonth() - 1)
    else from.setFullYear(from.getFullYear() - 1)
    setFilterDateFrom(toYM(from))
    setFilterDateTo(toYM(to))
    setPage(0)
  }

  if (!decks) return <p className="text-gray-500 text-sm">Loading decklists…</p>
  if (!decks.length) return <p className="text-gray-500 text-sm">No decklists recorded.</p>

  // Desktop: the decks a page at a time, in a list beside the decklist. Phones
  // swipe from deck to deck, through all of them, so there are no pages.
  const totalPages = isDesktop ? Math.ceil(filtered.length / DECKS_PAGE_SIZE) : 1
  const page_decks = isDesktop ? filtered.slice(page * DECKS_PAGE_SIZE, (page + 1) * DECKS_PAGE_SIZE) : filtered
  const browsed = page_decks.map(d => ({
    id: d.id,
    pilot: d.pilot,
    archetype: name,
    place: displayPlace(d.place),
    lead: formatShortDate(d.tournament_date),
    detail: d.tournament_name,
  }))

  return (
    <div className="space-y-3">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
        <div className="relative">
          <input
            type="search" placeholder="Search tournaments…" value={filterTournament} onChange={setFilter(setFilterTournament)}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 [&::-webkit-search-cancel-button]:hidden" />
          {filterTournament && (
            <button onClick={() => { setFilterTournament(''); setPage(0) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label="Clear search">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type="search" placeholder="Search pilots…" value={filterPilot} onChange={setFilter(setFilterPilot)}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 [&::-webkit-search-cancel-button]:hidden" />
          {filterPilot && (
            <button onClick={() => { setFilterPilot(''); setPage(0) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label="Clear search">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <MonthPicker label="From:" value={filterDateFrom} onChange={v => { setFilterDateFrom(v); setPage(0) }} firstYear={firstYear} />
          <MonthPicker label="To:" value={filterDateTo} onChange={v => { setFilterDateTo(v); setPage(0) }} firstYear={firstYear} />
          <div className="flex gap-1.5">
            {[['Last week', 7], ['Last month', 30], ['Last year', 365]].map(([label, days]) => (
              <button key={label} onClick={() => applyRange(days)}
                className="px-2.5 py-1 text-xs rounded-md border border-gray-600 text-gray-400 hover:border-amber-400/50 hover:text-amber-400 transition-colors">
                {label}
              </button>
            ))}
            {(filterDateFrom || filterDateTo) && (
              <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setPage(0) }}
                className="px-2.5 py-1 text-xs rounded-md border border-gray-600 text-gray-400 hover:border-amber-400/50 hover:text-amber-400 transition-colors">
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        {filtered.length !== decks.length ? `${filtered.length} of ${decks.length}` : decks.length} decklists
      </p>
      {totalPages > 1 && (
        <div ref={paginationRef} className="flex items-center justify-center gap-3">
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
      )}
      {browsed.length === 0 ? (
        <p className="px-4 py-8 text-center text-gray-500 text-sm">No decklists match your filters.</p>
      ) : (
        <TournamentDecks key={`${page}:${browsed[0].id}:${browsed.length}`} decks={browsed} showArchetype={false} />
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
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
      )}
    </div>
  )
}

const isOwnEntry = r => /pauperformance/i.test(r.author || '')
// our own entries always come first (stable sort keeps the rest in order)
const ownFirst = list => [...(list || [])].sort((a, b) => isOwnEntry(b) - isOwnEntry(a))

function ResourcesSection({ resources: rawResources, discord, sideboards: rawSideboards }) {
  const resources = ownFirst(rawResources)
  const sideboards = ownFirst(rawSideboards)
  const hasAny = resources?.length || discord?.length || sideboards?.length

  if (!hasAny) return <p className="text-gray-500 text-sm">No resources listed.</p>

  return (
    <div className="space-y-4">
      {sideboards?.length > 0 && (
        <div className="border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-base bg-gray-900">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">📋 Sideboard Guide</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Price</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50 bg-gray-900">
              {sideboards.map(s => (
                <tr key={s.link} className="bg-gray-900 hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-2.5">
                    <a href={s.link} target="_blank" rel="noreferrer"
                      className="text-amber-400 hover:underline font-medium">{isOwnEntry(s) && '⭐ '}{s.author || 'Guide'}</a>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{s.price || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{s.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {discord?.length > 0 && discord.map(d => (
        <a key={d.link} href={d.link} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 text-sm text-amber-400 hover:underline">
          💬 {d.name}
        </a>
      ))}
      {resources?.length > 0 && (
        <div className="border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-base bg-gray-900">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">🗣️</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Author</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50 bg-gray-900">
              {resources.map(r => (
                <tr key={r.link} className="bg-gray-900 hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-2.5 text-base">{LANG_FLAG[r.language] ?? r.language}</td>
                  <td className="px-4 py-2.5">
                    <a href={r.link} target="_blank" rel="noreferrer"
                      className="text-amber-400 hover:underline">{isOwnEntry(r) && '⭐ '}{r.name}</a>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{r.author}</td>
                  <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{formatShortDate(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function ArchetypePage() {
  const { name } = useParams()
  const navigate = useNavigate()
  const { bind: bindPreview, preview } = useCardPreview({ sheet: true })
  const [data, setData] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [popularity, setPopularity] = useState(null)
  const cardPages = useCardPages()
  const popularityMetagames = useMetagames(POPULARITY_METAGAMES)

  // the archetype's share of each metagame (missing for the never-played ones)
  useEffect(() => {
    let cancelled = false
    setPopularity(null)
    fetch(`/data/archetype-popularity/${name}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) setPopularity(d?.series?.length ? d : null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [name])

  useEffect(() => {
    let cancelled = false
    setData(null)
    setNotFound(false)
    fetch(`/data/archetype-details/${name}.json`)
      .then(r => {
        if (!r.ok) throw new Error('not-found')
        return r.json()
      })
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => {
        fetch('/data/archetype-alias-map.json')
          .then(r => r.ok ? r.json() : {})
          .then(aliasMap => {
            if (!cancelled) {
              if (aliasMap[name]) navigate(`/archetypes/${aliasMap[name]}`, { replace: true })
              else setNotFound(true)
            }
          })
          .catch(() => { if (!cancelled) setNotFound(true) })
      })
    return () => { cancelled = true }
  }, [name])

  if (notFound) return (
    <Layout>
      <div className="text-center py-20">
        <p className="text-gray-400">Archetype <strong className="text-white">{name}</strong> not found.</p>
        <Link to="/archetypes" className="mt-4 inline-block text-amber-400 hover:underline text-sm">← Back to index</Link>
      </div>
    </Layout>
  )

  if (!data) return (
    <Layout>
      <div className="text-center py-20 text-gray-500 text-sm">Loading...</div>
    </Layout>
  )

  const resourceCount = (data.resources?.length || 0) + (data.resources_discord?.length || 0)
    + (data.resource_sideboards?.length || 0)
  const sections = [
    popularity && { id: 'popularity', label: 'Popularity' },
    { id: 'typical-list', label: 'Typical list' },
    { id: 'resources', label: 'Resources', count: resourceCount },
    data.decks?.length > 0 && { id: 'reference-decks', label: 'Reference decks', count: data.decks.length },
    { id: 'decks', label: 'Decks', count: data.intel_deck_count ?? null },
    { id: 'videos', label: 'Videos', count: data.videos?.length || 0 },
  ].filter(Boolean)

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header, with the table of contents beside it */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-5 min-w-0">
        {/* The representative card, top left */}
        {data.representative_card?.preview && (() => {
          const card = data.representative_card
          const slug = cardLinkSlug(cardPages, card.name)
          const img = (
            <img src={card.preview} alt={card.name}
              className="w-44 shrink-0 aspect-[488/680] rounded-[4.75%/3.5%] border border-gray-700 group-hover:border-amber-400 transition-colors object-cover" />
          )
          return slug
            ? <Link to={`/cards/${slug}`} title={card.name} className="group hidden sm:block shrink-0">{img}</Link>
            : <span title={card.name} className="group hidden sm:block shrink-0">{img}</span>
        })()}
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-white">{data.name}</h1>
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-24 shrink-0 text-sm text-gray-500">Color:</span>
              {MANA_ORDER.filter(m => data.dominant_mana.includes(m)).map(m => (
                <ManaIcon key={m} color={m} />
              ))}
            </div>
            {data.aliases?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-24 shrink-0 text-sm text-gray-500">Aliases:</span>
                {data.aliases.map(alias => (
                  <span key={alias} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600">{alias}</span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-24 shrink-0 text-sm text-gray-500">Type:</span>
              {data.game_type.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600">{t}</span>
              ))}
            </div>
            {data.family && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-24 shrink-0 text-sm text-gray-500">Family:</span>
                <Link to={`/families/${nameToSlug(data.family)}`}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-amber-400 border border-gray-600 hover:border-amber-400 transition-colors">
                  {data.family}
                </Link>
              </div>
            )}
            {popularity && <PopularityRow popularity={popularity} metagames={popularityMetagames} />}
            {data.first_appearance && (
              <AppearanceRow label="First played:" appearance={data.first_appearance} />
            )}
            {data.last_appearance && (
              <AppearanceRow label="Last played:" appearance={data.last_appearance} />
            )}
          </div>
        </div>
        </div>
        <TableOfContents sections={sections} />
        </div>

        {/* Description */}
        {data.description && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown components={{ a: ({ node, ...props }) => <a {...props} className="text-amber-400 hover:underline" target="_blank" rel="noreferrer" /> }}>{data.description}</ReactMarkdown>
          </div>
        )}

        {/* Popularity over the metagames */}
        {popularity && (
          <section id="popularity">
            <SectionHeader>Popularity</SectionHeader>
            <CardPopularityChart series={popularity.series}
              metagamesUrl={POPULARITY_METAGAMES} subject="archetype"
              caption="Share of the tournament decks in each metagame since the archetype first appeared. Hover a metagame for its rank; click to open it." />
          </section>
        )}

        {/* Typical list */}
        <section id="typical-list">
          <SectionHeader>Typical list</SectionHeader>
          <TypicalListSection key={data.name} name={data.name} list={data.typical_list} bindPreview={bindPreview}
            currentMetagame={popularityMetagames?.at(-1)?.slug.split('.')[0]} />
        </section>

        {/* Resources */}
        <section id="resources">
          <SectionHeader>Resources</SectionHeader>
          <ResourcesSection
            resources={data.resources}
            discord={data.resources_discord}
            sideboards={data.resource_sideboards}
          />
        </section>

        {/* Reference decks */}
        {data.decks?.length > 0 && (
          <section id="reference-decks">
            <SectionHeader>Reference decks</SectionHeader>
            <DecksTable decks={data.decks} />
          </section>
        )}

        {/* Decklists */}
        <section id="decks">
          <SectionHeader>Decks</SectionHeader>
          <IntelDecksSection name={name} />
        </section>

        {/* Videos */}
        <section id="videos">
          <SectionHeader>Videos</SectionHeader>
          <VideosSection videos={data.videos} />
        </section>
      </div>
      {preview}
    </Layout>
  )
}
