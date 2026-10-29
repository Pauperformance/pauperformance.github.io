import { useState, useEffect, useMemo, useDeferredValue, useLayoutEffect, useRef } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import Layout from '../components/Layout'
import CardLink from '../components/PoolCardLink'
import { useCardPreview } from '../components/CardPreview'
import { useSearchShortcut, searchShortcutLabel } from '../utils/useSearchShortcut'
import { formatDate } from '../utils/dates'

// Metagames: one per event that changed the Pauper card pool (sets introducing
// new Pauper cards, B&R announcements), from Myr's metagame index. Codes below
// 000 are the sets released before the format's launch, kept for history.

// The metagame's sets, the one giving it its label first.
function orderedSets(m) {
  return [...m.sets].sort((a, b) => (b.scryfall_code === m.label) - (a.scryfall_code === m.label))
}

// Every event of the metagame: its sets, then its B&R announcements.
function metagameTitle(m) {
  return [...orderedSets(m).map(s => s.name), ...m.bans.map(b => b.subtitle)].join(' + ')
}

function newCards(m) {
  return m.sets.reduce((sum, s) => sum + s.cards.length, 0)
}

function matchesText(m, q) {
  return `${m.p13m}.${m.label}`.toLowerCase().includes(q) ||
    m.sets.some(s => s.name.toLowerCase().includes(q) || s.scryfall_code.toLowerCase().includes(q)) ||
    m.bans.some(b => b.subtitle.toLowerCase().includes(q))
}

function matchesCard(name, q) {
  return name.toLowerCase().includes(q)
}

// q: a lowercase query
function matches(m, q) {
  return matchesText(m, q) ||
    m.sets.some(s => s.cards.some(c => matchesCard(c.name, q))) ||
    m.bans.some(b => b.banned.some(n => matchesCard(n, q)) || b.unbanned.some(n => matchesCard(n, q)))
}

// A banned or unbanned card: previewed on hover (with the printing that brought
// it into the pool, from poolUrls), linked to its card page when it has one.
function BanCard({ name, poolUrls, tone, highlighted, bindPreview }) {
  return <CardLink card={{ name, url: poolUrls.get(name) }} tone={tone} highlighted={highlighted} bindPreview={bindPreview} />
}

function MetagameEntry({ metagame, searchQuery, poolUrls, open, onToggle, bindPreview }) {
  const [hovered, setHovered] = useState(false)
  const q = searchQuery.toLowerCase()
  const textMatch = !!q && matchesText(metagame, q)

  const sets = useMemo(() => metagame.sets.map(s => ({
    ...s,
    visible: !q || textMatch ? s.cards : s.cards.filter(c => matchesCard(c.name, q)),
  })), [metagame.sets, q, textMatch])

  const bans = useMemo(() => metagame.bans.map(b => ({
    ...b,
    visibleBanned: !q || textMatch ? b.banned : b.banned.filter(n => matchesCard(n, q)),
    visibleUnbanned: !q || textMatch ? b.unbanned : b.unbanned.filter(n => matchesCard(n, q)),
  })), [metagame.bans, q, textMatch])

  // several sets, or sets and B&Rs, released on the same day: label each part
  const mixed = metagame.sets.length + metagame.bans.length > 1
  const banned = metagame.bans.reduce((sum, b) => sum + b.banned.length, 0)
  const unbanned = metagame.bans.reduce((sum, b) => sum + b.unbanned.length, 0)
  const highlight = !!q && !textMatch

  return (
    <div className="relative pl-10">
      <div className={`absolute left-0 top-1.5 w-7 h-7 rounded-full bg-gray-800 border-2 flex items-center justify-center transition-colors ${hovered ? 'border-amber-300' : 'border-amber-400'}`}>
        <div className={`w-2 h-2 rounded-full transition-colors ${hovered ? 'bg-amber-300' : 'bg-amber-400'}`} />
      </div>

      <div
        className="bg-gray-800 border border-gray-700 rounded-xl p-5"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}>
        <button onClick={onToggle} className="w-full text-left flex items-center gap-3 flex-wrap">
          <span className="text-amber-400 font-semibold text-base">{formatDate(metagame.date)}</span>
          <span className={`font-medium transition-colors ${hovered ? 'text-amber-300' : 'text-white'}`}>{metagameTitle(metagame)}</span>
          {/* wraps on narrow screens rather than running off the box */}
          <span className="text-sm text-gray-500 ml-auto min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
            {metagame.sets.length > 0 && <span>Scryfall: <span className="text-amber-400 font-mono">{orderedSets(metagame).map(s => s.scryfall_code).join(', ')}</span></span>}
            <span>Pauperformance: <span className="text-amber-400 font-mono">{metagame.p13m}.{metagame.label}</span></span>
            {metagame.sets.length > 0 && <span>New Cards: <span className="text-amber-400 font-mono">{newCards(metagame)}</span></span>}
            {banned > 0 && <span>Banned: <span className="text-amber-400 font-mono">{banned}</span></span>}
            {unbanned > 0 && <span>Unbanned: <span className="text-amber-400 font-mono">{unbanned}</span></span>}
            <span className="text-gray-600">{open ? '▲' : '▼'}</span>
          </span>
        </button>

        {open && (
          <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
            {sets.filter(s => !q || textMatch || s.visible.length).map(s => (
              <div key={s.scryfall_code}>
                {/* the header already names a lone set */}
                {mixed && <p className="text-sm text-white mb-2">{s.name}</p>}
                <div className="flex flex-wrap gap-2">
                  {s.visible.map(card => <CardLink key={card.url} card={card} highlighted={highlight} bindPreview={bindPreview} />)}
                </div>
              </div>
            ))}
            {bans.filter(b => !q || textMatch || b.visibleBanned.length || b.visibleUnbanned.length).map(b => (
              <div key={b.announced}>
                {(mixed || b.announced !== metagame.date) && (
                  <p className="text-sm text-gray-400 mb-2">
                    {mixed && <span className="text-white">{b.subtitle}</span>}
                    {mixed && b.announced !== metagame.date && ' · '}
                    {b.announced !== metagame.date && <>Announced <span className="text-amber-400 font-mono">{formatDate(b.announced)}</span></>}
                  </p>
                )}
                {b.visibleBanned.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    <span className="text-xs text-gray-500 w-16">Banned</span>
                    {b.visibleBanned.map(n => <BanCard key={n} name={n} poolUrls={poolUrls} tone="banned" highlighted={highlight} bindPreview={bindPreview} />)}
                  </div>
                )}
                {b.visibleUnbanned.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-gray-500 w-16">Unbanned</span>
                    {b.visibleUnbanned.map(n => <BanCard key={n} name={n} poolUrls={poolUrls} tone="unbanned" highlighted={highlight} bindPreview={bindPreview} />)}
                  </div>
                )}
                {!b.banned.length && !b.unbanned.length && (
                  <p className="text-xs text-gray-500">Changed which cards are legal in the format.</p>
                )}
                {b.refs.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1">
                    {b.refs.map(ref => (
                      <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer"
                        className="text-xs text-gray-500 hover:text-amber-400 transition-colors">
                        ↗ {ref.text}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MetagameIndex() {
  const [metagames, setMetagames] = useState([])
  const { bind: bindPreview, preview } = useCardPreview()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/data/metagame_index.json')
      .then(r => r.json())
      .then(data => { setMetagames([...data].reverse()); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  const launched = useMemo(() => metagames.filter(m => m.code >= 0).length, [metagames])
  // the Scryfall URL of each card's printing in the set that introduced it
  const poolUrls = useMemo(() => {
    const urls = new Map()
    for (const m of metagames) for (const s of m.sets) for (const c of s.cards) {
      urls.set(c.name, c.url)
      urls.set(c.name.split(' // ')[0], c.url)  // timeline names use the front face
    }
    return urls
  }, [metagames])
  const history = metagames.length - launched
  const searchRef = useSearchShortcut()

  // The input updates immediately; filtering and rendering lag behind it.
  const query = useDeferredValue(search.trim().length >= 2 ? search.trim() : '')
  const shown = useMemo(() => {
    const q = query.toLowerCase()
    return q ? metagames.filter(m => matches(m, q)) : metagames
  }, [metagames, query])

  // Boxes are open while searching, closed otherwise; toggled ones flip that.
  // Kept here: rows unmount when scrolled out of view.
  const [toggled, setToggled] = useState(() => new Set())
  useEffect(() => { setToggled(new Set()) }, [query])
  const toggle = code => setToggled(prev => {
    const next = new Set(prev)
    if (!next.delete(code)) next.add(code)
    return next
  })

  // Only the boxes near the viewport are rendered; the page itself scrolls.
  const listRef = useRef(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => {
    if (listRef.current) setScrollMargin(listRef.current.getBoundingClientRect().top + window.scrollY)
  }, [loading, shown.length])
  const virtualizer = useWindowVirtualizer({
    count: shown.length,
    estimateSize: () => 96,
    overscan: 5,
    scrollMargin,
    getItemKey: i => shown[i].code,
  })
  const rows = virtualizer.getVirtualItems()
  const paddingTop = rows.length > 0 ? rows[0].start - scrollMargin : 0
  const paddingBottom = rows.length > 0 ? virtualizer.getTotalSize() - (rows[rows.length - 1].end - scrollMargin) : 0

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Metagame Index</h1>
          <p className="mt-2 text-gray-400 text-sm leading-relaxed">
            A new metagame starts whenever the pool of Pauper cards changes: a set introducing new commons, or a
            banned and restricted announcement. Metagame <span className="text-white font-mono">000</span> is the
            format's launch on Magic Online; earlier sets have negative codes and are kept for history.
            Currently <span className="text-white font-medium">{launched}</span> metagames since the launch, and{' '}
            <span className="text-white font-medium">{history}</span> before it.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              ref={searchRef}
              type="search"
              placeholder={`Search for a card, set name, metagame or Scryfall code... (${searchShortcutLabel})`}
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
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading...</p>
        ) : error ? (
          <p className="text-gray-400 text-sm py-8 text-center">The metagame index could not be loaded.</p>
        ) : (
          shown.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-12">No results match your search.</p>
          ) : (
            <div ref={listRef} className="relative">
              <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-700" />
              <div style={{ paddingTop, paddingBottom }}>
                {rows.map(row => {
                  const m = shown[row.index]
                  return (
                    <div key={m.code} data-index={row.index} ref={virtualizer.measureElement} className="pb-6">
                      <MetagameEntry
                        metagame={m}
                        searchQuery={query}
                        poolUrls={poolUrls}
                        open={!!query !== toggled.has(m.code)}
                        onToggle={() => toggle(m.code)}
                        bindPreview={bindPreview}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        )}
      </div>
      {preview}
    </Layout>
  )
}
