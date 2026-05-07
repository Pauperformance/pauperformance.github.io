import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
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

  return (
    <>
      <a
        href={card.url} target="_blank" rel="noreferrer"
        onMouseEnter={show} onMouseMove={move} onMouseLeave={hide}
        className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
          highlighted
            ? 'bg-amber-400/10 border-amber-400/40 text-amber-300 hover:bg-amber-400/20'
            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-amber-400/50 hover:text-amber-300'
        }`}>
        {card.name}
      </a>
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

function SetEntry({ set, searchQuery, defaultOpen, isLast }) {
  const [open, setOpen] = useState(defaultOpen)

  const visibleCards = useMemo(() => {
    if (!searchQuery) return set.cards
    const q = searchQuery.toLowerCase()
    return set.cards.filter(c => c.name.toLowerCase().includes(q))
  }, [set.cards, searchQuery])

  if (searchQuery && visibleCards.length === 0) return null

  return (
    <div className="flex">
      {/* date column */}
      <div className="w-28 shrink-0 text-right pr-5 pt-2">
        <span className="text-xs text-gray-500 font-mono">{set.date}</span>
      </div>

      {/* timeline spine */}
      <div className="shrink-0 flex flex-col items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-600 border border-gray-500 mt-2 shrink-0 z-10" />
        {!isLast && <div className="w-px flex-1 bg-gray-700 mt-1" />}
      </div>

      {/* content */}
      <div className="flex-1 pl-5 pb-8">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-3 text-left w-full group">
          <span className="font-semibold text-white group-hover:text-amber-300 transition-colors">{set.name}</span>
          <span className="font-mono text-xs text-amber-400 shrink-0">#{set.code}</span>
          <span className="text-xs text-gray-500 shrink-0">
            {searchQuery ? `${visibleCards.length} / ${set.cards.length}` : set.cards.length} cards
          </span>
          <span className="text-gray-600 text-xs shrink-0">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="mt-3 flex flex-wrap gap-2">
            {visibleCards.map(card => (
              <CardLink key={card.url} card={card} highlighted={!!searchQuery} />
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
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/data/pauper_pool.json')
      .then(r => r.json())
      .then(data => { setPool(data); setLoading(false) })
  }, [])

  const totalCards = useMemo(() => pool.reduce((s, set) => s + set.cards.length, 0), [pool])
  const isSearching = search.trim().length > 0

  const visibleSets = useMemo(() => {
    if (!isSearching) return pool
    const q = search.toLowerCase()
    return pool.filter(set => set.cards.some(c => c.name.toLowerCase().includes(q)))
  }, [pool, search, isSearching])

  const matchCount = useMemo(() => {
    if (!isSearching) return 0
    const q = search.toLowerCase()
    return pool.reduce((sum, set) => sum + set.cards.filter(c => c.name.toLowerCase().includes(q)).length, 0)
  }, [pool, search, isSearching])

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pauper Pool</h1>
          <p className="mt-2 text-gray-400 text-sm leading-relaxed">
            Common cards introduced in the format over time — new cards and downshifts, excluding reprints.
            Currently <span className="text-white font-medium">{totalCards.toLocaleString()}</span> cards across{' '}
            <span className="text-white font-medium">{pool.length}</span> sets.
            Hover over any card to preview it.
          </p>
        </div>

        <input
          type="text"
          placeholder="Search for a card..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
        />

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
              <p className="text-center text-gray-500 text-sm py-12">No cards match your search.</p>
            ) : (
              <div>
                {visibleSets.map((set, i) => (
                  <SetEntry
                    key={set.code}
                    set={set}
                    searchQuery={isSearching ? search.trim() : ''}
                    defaultOpen={isSearching}
                    isLast={i === visibleSets.length - 1}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
