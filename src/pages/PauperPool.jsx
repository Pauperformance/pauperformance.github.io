import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

function CardLink({ card, highlighted }) {
  const [pos, setPos] = useState(null)
  const timerRef = useRef(null)

  const match = card.url.match(/scryfall\.com\/card\/([^/]+)\/([^/]+)\//)
  const imgSrc = match
    ? `https://api.scryfall.com/cards/${match[1]}/${match[2]}?format=image&version=normal`
    : null

  const show = (e) => {
    if (!imgSrc) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setPos({ x: e.clientX, y: e.clientY }), 150)
  }

  const move = (e) => {
    if (pos) setPos({ x: e.clientX, y: e.clientY })
  }

  const hide = () => {
    clearTimeout(timerRef.current)
    setPos(null)
  }

  const imgStyle = pos ? {
    left: pos.x + 220 > window.innerWidth ? pos.x - 220 : pos.x + 16,
    top: Math.max(8, Math.min(pos.y - 80, window.innerHeight - 320)),
  } : null

  const slug = card.name.toLowerCase().replace(/ \/\/ /g, '_').replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '')

  return (
    <>
      <Link
        to={`/cards/${slug}`}
        onMouseEnter={show} onMouseMove={move} onMouseLeave={hide}
        className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
          highlighted
            ? 'bg-amber-400/10 border-amber-400/40 text-amber-300 hover:bg-amber-400/20'
            : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-amber-400/50 hover:text-amber-300'
        }`}>
        {card.name}
      </Link>
      {pos && imgSrc && createPortal(
        <img
          src={imgSrc}
          alt={card.name}
          className="fixed z-50 w-48 rounded-xl shadow-2xl border border-gray-700 pointer-events-none"
          style={imgStyle}
        />,
        document.body
      )}
    </>
  )
}

function SetEntry({ set, searchQuery, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const [hovered, setHovered] = useState(false)
  const hasCards = set.cards.length > 0

  useEffect(() => { if (hasCards) setOpen(!!searchQuery) }, [searchQuery, hasCards])

  const setNameMatch = useMemo(() => {
    if (!searchQuery) return false
    const q = searchQuery.toLowerCase()
    return set.name.toLowerCase().includes(q) || set.scryfall.toLowerCase().includes(q) || String(set.code).includes(q)
  }, [set.name, set.scryfall, set.code, searchQuery])

  const visibleCards = useMemo(() => {
    if (!searchQuery) return set.cards
    if (setNameMatch) return set.cards
    const q = searchQuery.toLowerCase()
    return set.cards.filter(c => c.name.toLowerCase().includes(q))
  }, [set.cards, searchQuery, setNameMatch])

  if (searchQuery && visibleCards.length === 0 && !setNameMatch) return null

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
          onClick={() => hasCards && setOpen(v => !v)}
          className={`w-full text-left flex items-center gap-3 flex-wrap ${hasCards ? '' : 'cursor-default'}`}>
          <span className="text-amber-400 font-semibold text-base">{set.date}</span>
          <span className={`font-medium transition-colors ${hovered ? 'text-amber-300' : 'text-white'}`}>{set.name}</span>
          <span className="text-sm text-gray-500 ml-auto shrink-0 flex items-center gap-3">
            <span>Scryfall: <span className="text-amber-400 font-mono">{set.scryfall}</span></span>
            <span>Pauperformance: <span className="text-amber-400 font-mono">#{set.code}</span></span>
            <span>New Cards: <span className="text-amber-400 font-mono">{set.cards.length}</span></span>
            {hasCards && <span className="text-gray-600">{open ? '▲' : '▼'}</span>}
          </span>
        </button>

        {open && hasCards && (
          <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-2">
            {visibleCards.map(card => (
              <CardLink key={card.url} card={card} highlighted={!!searchQuery && !setNameMatch} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PauperPool() {
  const [pool, setPool] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('relevant')
  const [search, setSearch] = useState('')

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
  const isSearching = search.trim().length >= 2

  const basePool = useMemo(() =>
    filter === 'relevant' ? pool.filter(s => s.pauper_pool) : pool
  , [pool, filter])

  const visibleSets = useMemo(() => {
    if (!isSearching) return basePool
    const q = search.toLowerCase()
    return basePool.filter(set =>
      set.name.toLowerCase().includes(q) ||
      set.scryfall.toLowerCase().includes(q) ||
      String(set.code).includes(q) ||
      set.cards.some(c => c.name.toLowerCase().includes(q))
    )
  }, [basePool, search, isSearching])

  const matchCount = useMemo(() => {
    if (!isSearching) return 0
    const q = search.toLowerCase()
    return visibleSets.reduce((sum, set) => {
      if (set.name.toLowerCase().includes(q) || set.scryfall.toLowerCase().includes(q) || String(set.code).includes(q)) return sum + set.cards.length
      return sum + set.cards.filter(c => c.name.toLowerCase().includes(q)).length
    }, 0)
  }, [visibleSets, search, isSearching])

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
          <input
            type="text"
            placeholder="Search for a card, set name, Scryfall or Pauperformance code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
          />
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
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-700" />
                <div className="space-y-6">
                  {visibleSets.map((set) => (
                    <SetEntry
                      key={set.code}
                      set={set}
                      searchQuery={isSearching ? search.trim() : ''}
                      defaultOpen={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
