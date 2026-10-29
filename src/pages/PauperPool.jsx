import { useState, useEffect, useMemo, useDeferredValue, useLayoutEffect, useRef } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import Layout from '../components/Layout'
import CardLink from '../components/PoolCardLink'
import { useCardPreview } from '../components/CardPreview'
import { useSearchShortcut, searchShortcutLabel } from '../utils/useSearchShortcut'
import { formatDate } from '../utils/dates'

// q: a lowercase query
function setNameMatches(set, q) {
  return set.name.toLowerCase().includes(q) || set.scryfall.toLowerCase().includes(q) || String(set.code).includes(q)
}

function SetEntry({ set, searchQuery, open, onToggle, bindPreview }) {
  const [hovered, setHovered] = useState(false)
  const hasCards = set.cards.length > 0
  const q = searchQuery.toLowerCase()
  const setNameMatch = !!q && setNameMatches(set, q)

  const visibleCards = useMemo(() => {
    if (!q || setNameMatch) return set.cards
    return set.cards.filter(c => c.name.toLowerCase().includes(q))
  }, [set.cards, q, setNameMatch])

  return (
    <div className="relative pl-10">
      {/* dot */}
      <div className={`absolute left-0 top-1.5 w-7 h-7 rounded-full bg-gray-800 border-2 flex items-center justify-center transition-colors ${hovered ? 'border-amber-300' : 'border-amber-400'}`}>
        <div className={`w-2 h-2 rounded-full transition-colors ${hovered ? 'bg-amber-300' : 'bg-amber-400'}`} />
      </div>

      {/* box */}
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl p-5"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}>
        <button
          onClick={() => hasCards && onToggle()}
          className={`w-full text-left flex items-center gap-3 flex-wrap ${hasCards ? '' : 'cursor-default'}`}>
          <span className="text-amber-400 font-semibold text-base">{formatDate(set.date)}</span>
          <span className={`font-medium transition-colors ${hovered ? 'text-amber-300' : 'text-white'}`}>{set.name}</span>
          {/* wraps on narrow screens rather than running off the box */}
          <span className="text-sm text-gray-500 ml-auto min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Scryfall: <span className="text-amber-400 font-mono">{set.scryfall}</span></span>
            <span>Pauperformance: <span className="text-amber-400 font-mono">#{set.code}</span></span>
            <span>New Cards: <span className="text-amber-400 font-mono">{set.cards.length}</span></span>
            {hasCards && <span className="text-gray-600">{open ? '▲' : '▼'}</span>}
          </span>
        </button>

        {open && hasCards && (
          <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-2">
            {visibleCards.map(card => (
              <CardLink key={card.url} card={card} highlighted={!!q && !setNameMatch} bindPreview={bindPreview} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PauperPool() {
  const [pool, setPool] = useState([])
  const { bind: bindPreview, preview } = useCardPreview()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('relevant')
  const [search, setSearch] = useState('')
  const searchRef = useSearchShortcut()

  useEffect(() => {
    Promise.all([
      fetch('/data/pauper_pool.json').then(r => r.json()),
      fetch('/data/sets.json').then(r => r.json()),
    ]).then(([poolData, setsData]) => {
      const poolMap = new Map(poolData.map(s => [s.code, s]))
      const today = new Date().toISOString().slice(0, 10)
      const merged = [...setsData].reverse()
        .filter(s => s.date <= today)
        .map(s => ({
          ...s,
          cards: poolMap.has(s.code) ? poolMap.get(s.code).cards : [],
        }))
      setPool(merged)
      setLoading(false)
    })
  }, [])

  const totalCards = useMemo(() => pool.filter(s => s.pauper_pool).reduce((s, set) => s + set.cards.length, 0), [pool])
  const totalRelevantSets = useMemo(() => pool.filter(s => s.pauper_pool).length, [pool])

  const basePool = useMemo(() =>
    filter === 'relevant' ? pool.filter(s => s.pauper_pool) : pool
  , [pool, filter])

  // The input updates immediately; filtering and rendering lag behind it.
  const query = useDeferredValue(search.trim().length >= 2 ? search.trim() : '')
  const isSearching = !!query

  const visibleSets = useMemo(() => {
    if (!isSearching) return basePool
    const q = query.toLowerCase()
    return basePool.filter(set => setNameMatches(set, q) || set.cards.some(c => c.name.toLowerCase().includes(q)))
  }, [basePool, query, isSearching])

  const matchCount = useMemo(() => {
    if (!isSearching) return 0
    const q = query.toLowerCase()
    return visibleSets.reduce((sum, set) => {
      if (setNameMatches(set, q)) return sum + set.cards.length
      return sum + set.cards.filter(c => c.name.toLowerCase().includes(q)).length
    }, 0)
  }, [visibleSets, query, isSearching])

  // Sets with cards are open while searching, closed otherwise; toggled ones
  // flip that. Kept here: rows unmount when scrolled out of view.
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
  }, [loading, visibleSets.length, isSearching])
  const virtualizer = useWindowVirtualizer({
    count: visibleSets.length,
    estimateSize: () => 96,
    overscan: 5,
    scrollMargin,
    getItemKey: i => visibleSets[i].code,
  })
  const rows = virtualizer.getVirtualItems()
  const paddingTop = rows.length > 0 ? rows[0].start - scrollMargin : 0
  const paddingBottom = rows.length > 0 ? virtualizer.getTotalSize() - (rows[rows.length - 1].end - scrollMargin) : 0

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sets Index</h1>
          <p className="mt-2 text-gray-400 text-sm leading-relaxed">
            Common cards introduced in the format over time — new cards and downshifts, excluding reprints.
            Currently <span className="text-white font-medium">{totalCards.toLocaleString()}</span> cards across{' '}
            <span className="text-white font-medium">{totalRelevantSets}</span> sets.
            Hover over any card to preview it.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              ref={searchRef}
              type="search"
              placeholder={`Search for a card, set name, Scryfall or Pauperformance code... (${searchShortcutLabel})`}
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
          <div className="inline-flex rounded-xl border border-gray-600 overflow-hidden text-sm font-semibold shrink-0">
            <button
              onClick={() => setFilter('relevant')}
              className={`px-4 py-2 transition-colors ${filter === 'relevant' ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
              Relevant
            </button>
            <div className="w-px bg-gray-600" />
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 transition-colors ${filter === 'all' ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
              All
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading...</p>
        ) : (
          <>
            {isSearching && (
              <p className="text-xs text-gray-500">
                {matchCount} result{matchCount !== 1 ? 's' : ''} across {visibleSets.length} set{visibleSets.length !== 1 ? 's' : ''}
              </p>
            )}
            {isSearching && visibleSets.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-12">No results match your search.</p>
            ) : (
              <div ref={listRef} className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-700" />
                <div style={{ paddingTop, paddingBottom }}>
                  {rows.map(row => {
                    const set = visibleSets[row.index]
                    return (
                      <div key={set.code} data-index={row.index} ref={virtualizer.measureElement} className="pb-6">
                        <SetEntry
                          set={set}
                          searchQuery={query}
                          open={set.cards.length > 0 && isSearching !== toggled.has(set.code)}
                          onToggle={() => toggle(set.code)}
                          bindPreview={bindPreview}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {preview}
    </Layout>
  )
}
