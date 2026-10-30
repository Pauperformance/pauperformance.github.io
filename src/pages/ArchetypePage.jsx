import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Layout from '../components/Layout'
import { useCardPreview } from '../components/CardPreview'
import { AppearanceRow, MetagameBadge } from '../components/Metagame'
import MtgoButtons from '../components/MtgoButtons'
import { cardLinkSlug, useCardPages } from '../utils/cardPages'
import { nameToSlug, pilotToSlug } from '../utils/slugs'
import { formatShortDate } from '../utils/dates'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
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

function ManaIcon({ color }) {
  return (
    <img src={`/images/mana/${color}.png`} alt={color}
      className="w-5 h-5 inline-block" />
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

// The typical list, computed by Myr from the archetype's recent decklists:
// for each card, how many copies the aggregate list plays and the share of
// decklists playing at least 1, 2, 3 and 4 copies.
const BASIC_LAND = /^(Snow-Covered )?(Plains|Island|Swamp|Mountain|Forest|Wastes)$/
const FEW_DECKS = 10
const COPIES_HEADERS = ['1+', '2+', '3+', '4']

function percent(share) {
  return `${Math.round(share * 100)}%`
}

function joinNames(names) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function CopiesCell({ share }) {
  return (
    <td className="px-0.5 py-1">
      <div className="relative h-6 rounded bg-gray-800 overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-amber-400/25" style={{ width: percent(share) }} />
        <span className={`relative flex h-full items-center justify-center text-xs tabular-nums ${share >= 0.5 ? 'text-gray-100' : 'text-gray-400'}`}>
          {percent(share)}
        </span>
      </div>
    </td>
  )
}

// A row of the typical list's table. No hover preview: the card images
// beside the table have it.
function TypicalCardRow({ card, cardPages }) {
  const slug = cardLinkSlug(cardPages, card.name)
  // Cards with no page (e.g. banned ones) are shown but not linked.
  const name = slug
    ? <Link to={`/cards/${slug}`} className="truncate text-gray-200 hover:text-amber-400 transition-colors">{card.name}</Link>
    : <span className="truncate text-gray-200">{card.name}</span>
  // basics (and the like) are played in any number: their average says more
  const anyNumber = BASIC_LAND.test(card.name) || card.average > 4
  return (
    <tr className="hover:bg-gray-800/60">
      <td className="pl-3 pr-1 py-1 text-right tabular-nums font-semibold text-amber-400">{card.typical || '–'}</td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {name}
          {card.banned && (
            <span className="shrink-0 px-1.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-red-900/50 text-red-300 border border-red-800">Banned</span>
          )}
        </div>
      </td>
      {anyNumber
        ? <td colSpan={4} className="pr-3 py-1 text-center text-xs text-gray-400 tabular-nums">{card.average} on average, in {percent(card.at_least[0])}</td>
        : card.at_least.map((share, i) => <CopiesCell key={i} share={share} />)}
    </tr>
  )
}

// The groups of a visual decklist, by the card's (front face) type.
const CARD_GROUPS = [
  ['Creatures', t => t.includes('Creature')],
  ['Lands', t => t.includes('Land')],
  ['Spells', () => true],
]

function groupOf(card) {
  const front = (card.type_line || '').split(' // ')[0]
  return CARD_GROUPS.find(([, test]) => test(front))[0]
}

function TypicalCardImage({ card, cardPages, bindPreview }) {
  const slug = cardLinkSlug(cardPages, card.name)
  const img = (
    <img src={card.preview} alt={card.name} loading="lazy"
      className={`w-full aspect-[488/680] rounded-[4.75%/3.5%] border object-cover transition-colors ${card.banned ? 'border-red-700' : 'border-gray-700 group-hover:border-amber-400'}`} />
  )
  // the hover preview: the card's image (larger) and its Oracle text
  const handlers = bindPreview(card.name, { slug: slug || undefined, image: card.preview })
  return (
    <div className="relative">
      {/* Cards with no page (e.g. banned ones) are shown but not linked. */}
      {slug
        ? <Link to={`/cards/${slug}`} {...handlers} className="group block">{img}</Link>
        : <span {...handlers} className="group block">{img}</span>}
      {/* copies in the typical list; for the other options, how many decklists play it */}
      {card.typical > 0
        ? <span className="absolute left-1.5 bottom-1.5 min-w-6 px-1.5 py-0.5 rounded-md text-center text-xs font-bold tabular-nums bg-gray-900/90 text-amber-400 border border-gray-600">
            {card.typical}
          </span>
        : <span title={`In ${percent(card.at_least[0])} of decklists`}
            className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-md text-xs font-semibold tabular-nums bg-gray-900/90 text-gray-300 border border-gray-600">
            {percent(card.at_least[0])}
          </span>}
      {card.banned && (
        <span className="absolute right-1.5 bottom-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-red-900/90 text-red-200 border border-red-800">Banned</span>
      )}
    </div>
  )
}

// A board's cards as images: the typical list's, grouped by type (the
// sideboard's aren't), then the other options while the table shows them.
function TypicalGallery({ title, cards, grouped, showOthers, cardPages, bindPreview }) {
  const listed = cards.filter(c => c.typical > 0)
  const others = showOthers ? cards.filter(c => !c.typical) : []
  // creatures, then spells, then lands, as decklists usually go
  const groups = grouped
    ? ['Creatures', 'Spells', 'Lands'].map(name => [name, listed.filter(c => groupOf(c) === name)])
    : [[title, listed]]
  const copies = group => group.reduce((n, c) => n + c.typical, 0)
  return (
    <div className="space-y-3">
      {groups.filter(([, group]) => group.length).map(([name, group]) => (
        <GalleryGroup key={name} name={name} count={copies(group)} cards={group} cardPages={cardPages} bindPreview={bindPreview} />
      ))}
      {others.length > 0 && (
        <GalleryGroup name="Other options" count={`${others.length} card${others.length === 1 ? '' : 's'}`}
          cards={others} cardPages={cardPages} bindPreview={bindPreview} />
      )}
    </div>
  )
}

function GalleryGroup({ name, count, cards, cardPages, bindPreview }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {name} <span className="font-normal normal-case text-gray-500">({count})</span>
      </p>
      <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]">
        {cards.map(card => <TypicalCardImage key={card.name} card={card} cardPages={cardPages} bindPreview={bindPreview} />)}
      </div>
    </div>
  )
}

// A board of the typical list: its table, and beside it (below on phones)
// its cards as images. The table's toggle shows the other options in both.
function TypicalBoard({ title, cards, grouped, cardPages, bindPreview }) {
  const [showOthers, setShowOthers] = useState(false)
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] items-start">
      <TypicalTable title={title} cards={cards} cardPages={cardPages}
        showOthers={showOthers} onToggleOthers={() => setShowOthers(s => !s)} />
      <TypicalGallery title={title} cards={cards} grouped={grouped} showOthers={showOthers}
        cardPages={cardPages} bindPreview={bindPreview} />
    </div>
  )
}

function TypicalTable({ title, cards, cardPages, showOthers, onToggleOthers }) {
  const listed = cards.filter(c => c.typical > 0)
  const others = cards.filter(c => !c.typical)
  const total = listed.reduce((n, c) => n + c.typical, 0)
  const row = card => <TypicalCardRow key={card.name} card={card} cardPages={cardPages} />
  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full table-fixed text-sm bg-gray-900">
        <colgroup>
          <col className="w-9" />
          <col />
          {COPIES_HEADERS.map(h => <col key={h} className="w-11 sm:w-13" />)}
        </colgroup>
        <thead>
          <tr className="bg-gray-800 border-b border-gray-700">
            <th colSpan={2} className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {title} <span className="font-normal text-gray-500">({total})</span>
            </th>
            {COPIES_HEADERS.map(h => (
              <th key={h} className="py-2 text-center text-xs font-semibold text-gray-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {listed.map(row)}
          {showOthers && (
            <tr>
              <td colSpan={6} className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Other options</td>
            </tr>
          )}
          {showOthers && others.map(row)}
        </tbody>
      </table>
      {others.length > 0 && (
        <button onClick={onToggleOthers}
          className="w-full px-3 py-2 text-xs text-gray-400 hover:text-amber-400 bg-gray-800 border-t border-gray-700 transition-colors select-none">
          {showOthers ? 'Hide other options' : `Show ${others.length} other option${others.length === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  )
}

// A ban bounding the era the typical list comes from.
function EraBan({ bans, metagame }) {
  return (
    <>
      the ban of <span className="text-gray-200">{joinNames(bans)}</span>{' '}
      ({formatShortDate(metagame.date)}, <MetagameBadge metagame={metagame} />)
    </>
  )
}

// The era the typical list comes from: between the bans of cards the
// archetype was playing (see Myr's silver/typical_list.py).
function EraDescription({ list }) {
  const { era_start: start, era_end: end, started_by_bans: started, ended_by_bans: ended } = list
  if (start && end) return <>From <EraBan bans={started} metagame={start} /> to <EraBan bans={ended} metagame={end} />.</>
  if (start) return <>Since <EraBan bans={started} metagame={start} />.</>
  if (end) return <>From the first decklist to <EraBan bans={ended} metagame={end} />.</>
  return <>The whole history of the archetype: no ban hit the cards it played.</>
}

// The typical list as a decklist (its 60 and 15, without the other options),
// for the MTGO buttons.
function typicalDecklist(list) {
  const board = cards => cards.filter(c => c.typical > 0).map(c => ({ qty: c.typical, name: c.name }))
  return { main: board(list.main), side: board(list.side) }
}

function TypicalListSection({ name, list, bindPreview }) {
  const cardPages = useCardPages()
  if (!list?.decks) return <p className="text-gray-500 text-sm">No decklists recorded.</p>
  const dates = list.first_date === list.last_date
    ? `on ${formatShortDate(list.last_date)}`
    : `between ${formatShortDate(list.first_date)} and ${formatShortDate(list.last_date)}`
  return (
    <div className="space-y-3">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-2 text-sm text-gray-400">
        <div className="flex gap-2">
          <span className="w-24 shrink-0 text-gray-500">Era</span>
          <p className="leading-relaxed"><EraDescription list={list} /></p>
        </div>
        <div className="flex gap-2">
          <span className="w-24 shrink-0 text-gray-500">Metagames</span>
          <div className="flex flex-wrap gap-1.5">
            {list.metagames.map(m => <MetagameBadge key={m.metagame} metagame={m} count={m.decks} />)}
          </div>
        </div>
        <div className="flex gap-2">
          <span className="w-24 shrink-0 text-gray-500">Decklists</span>
          <p>
            <span className="text-gray-200">{list.decks} deck{list.decks === 1 ? '' : 's'}</span>, {dates}
            {list.decks < FEW_DECKS && <span className="text-gray-500"> · too few for reliable numbers</span>}
          </p>
        </div>
      </div>
      {list.ended_by_bans.length > 0 && (
        <p className="text-sm text-amber-200 bg-amber-900/20 border border-amber-800/50 rounded-lg px-3 py-2">
          {list.later_decks === 0
            ? <>{name} wasn't played after the ban of {joinNames(list.ended_by_bans)}</>
            : <>{name} was hardly played after the ban of {joinNames(list.ended_by_bans)} (only{' '}
                {list.later_decks} decklist{list.later_decks === 1 ? '' : 's'})</>}
          : this is how it was played before.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-400">
          Next to each card, the share of decklists playing at least 1, 2, 3 and 4 copies.
        </p>
        <div className="flex flex-wrap gap-2">
          <MtgoButtons decklist={typicalDecklist(list)} fileName={`${nameToSlug(name)}_typical_list.txt`} />
        </div>
      </div>
      <div className="space-y-6">
        <TypicalBoard title="Maindeck" cards={list.main} grouped cardPages={cardPages} bindPreview={bindPreview} />
        {list.side.length > 0 && (
          <TypicalBoard title="Sideboard" cards={list.side} cardPages={cardPages} bindPreview={bindPreview} />
        )}
      </div>
    </div>
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
        <p className="text-xs text-gray-400">{v.creator_name}</p>
        <div className="mt-auto pt-1.5 flex items-center justify-between gap-2">
          <span className="text-base leading-none shrink-0">{LANG_FLAG[v.language] ?? v.language}</span>
          <span className="text-xs text-gray-500 shrink-0">{formatShortDate(v.date)}</span>
        </div>
      </div>
    </div>
  )
}

function VideosSection({ videos: allVideos }) {
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
          <MonthPicker label="From:" value={filterDateFrom} onChange={v => setFilterDateFrom(v)} labelClass="w-16" />
          <MonthPicker label="To:" value={filterDateTo} onChange={v => setFilterDateTo(v)} labelClass={toWrapped ? 'w-16' : ''} />
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
              {visibleVideos.map(v => <VideoCard key={v.video_id || v.link} v={v} />)}
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

const LANG_CANONICAL = {
  en: 'en', eng: 'en', 'en-US': 'en', 'en-GB': 'en',
  it: 'it', ita: 'it', IT: 'it',
  pt: 'pt', 'pt-BR': 'pt', 'pt-PT': 'pt',
  de: 'de',
  es: 'es', 'es-419': 'es',
  fr: 'fr',
  hi: 'hi',
  pl: 'pl',
}
const LANG_DISPLAY = {
  en: '🇬🇧 English',
  it: '🇮🇹 Italian',
  pt: '🇵🇹 Portuguese',
  de: '🇩🇪 German',
  es: '🇪🇸 Spanish',
  fr: '🇫🇷 French',
  hi: '🇮🇳 Hindi',
  pl: '🇵🇱 Polish',
}

const DECKS_PAGE_SIZE = 20
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

function MonthPicker({ label, value, onChange, labelClass = '' }) {
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

function IntelDecksSection({ name }) {
  const [decks, setDecks] = useState(null)
  const [page, setPage] = useState(0)
  const paginationRef = useRef(null)
  const pageInitRef = useRef(true)
  const [filterTournament, setFilterTournament] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterPilot, setFilterPilot] = useState('')

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

  const totalPages = Math.ceil(filtered.length / DECKS_PAGE_SIZE)
  const page_decks = filtered.slice(page * DECKS_PAGE_SIZE, (page + 1) * DECKS_PAGE_SIZE)

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
          <MonthPicker label="From:" value={filterDateFrom} onChange={v => { setFilterDateFrom(v); setPage(0) }} />
          <MonthPicker label="To:" value={filterDateTo} onChange={v => { setFilterDateTo(v); setPage(0) }} />
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
      <div className="border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-base bg-gray-900">
          <thead>
            <tr className="bg-gray-800 border-b border-gray-700">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tournament</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Pilot</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Deck Date</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Result</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50 bg-gray-900">
            {page_decks.length === 0 && (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500 text-sm">No decklists match your filters.</td></tr>
            )}
            {page_decks.map((deck) => (
              <tr key={deck.id} className="bg-gray-900 hover:bg-gray-800 transition-colors cursor-pointer"
                onAuxClick={(e) => { if (e.button === 1) window.open(`/decks/${deck.id}`, '_blank') }}>
                <td className="px-4 py-2.5 text-gray-300">{deck.tournament_name}</td>
                <td className="px-4 py-2.5 hidden md:table-cell">
                  {deck.pilot
                    ? <Link to={`/players/${pilotToSlug(deck.pilot)}`} className="text-gray-400 hover:text-amber-400 transition-colors">{deck.pilot}</Link>
                    : <span className="text-gray-600">Anonymous</span>}
                </td>
                <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{formatShortDate(deck.tournament_date)}</td>
                <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell">{deck.place}</td>
                <td className="px-4 py-2.5">
                  <Link to={`/decks/${deck.id}`}
                    className="text-amber-400 hover:underline text-xs">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

function ResourcesSection({ resources, discord, sideboards }) {
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
                      className="text-amber-400 hover:underline font-medium">{s.author || 'Guide'}</a>
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
                      className="text-amber-400 hover:underline">{r.name}</a>
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
  const { bind: bindPreview, preview } = useCardPreview()
  const [data, setData] = useState(null)
  const [notFound, setNotFound] = useState(false)

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
            {data.first_appearance && (
              <AppearanceRow label="First played:" appearance={data.first_appearance} />
            )}
            {data.last_appearance && (
              <AppearanceRow label="Last played:" appearance={data.last_appearance} />
            )}
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

        {/* Typical list */}
        <section id="typical-list">
          <SectionHeader>Typical list</SectionHeader>
          <TypicalListSection name={data.name} list={data.typical_list} bindPreview={bindPreview} />
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
