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

  const slug = card.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

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

  useEffect(() => { setOpen(!!searchQuery) }, [searchQuery])

  const visibleCards = useMemo(() => {
    if (!searchQuery) return set.cards
    const q = searchQuery.toLowerCase()
    return set.cards.filter(c => c.name.toLowerCase().includes(q))
  }, [set.cards, searchQuery])

  if (searchQuery && visibleCards.length === 0) return null

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
          onClick={() => setOpen(v => !v)}
          className="w-full text-left flex items-center gap-3 flex-wrap">
          <span className="text-amber-400 font-semibold text-base">{set.date}</span>
          <span className="font-medium text-white">{set.name}</span>
          <span className="text-sm text-gray-500 ml-auto shrink-0 flex items-center gap-3">
            <span>Code: <span className="text-amber-400 font-mono">#{set.code}</span></span>
            <span>New Cards: <span className="text-amber-400 font-mono">{set.cards.length}</span></span>
            <span className="text-gray-600">{open ? '▲' : '▼'}</span>
          </span>
        </button>

        {open && (
          <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-2">
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
      .then(data => { setPool([...data].reverse()); setLoading(false) })
  }, [])

  const totalCards = useMemo(() => pool.reduce((s, set) => s + set.cards.length, 0), [pool])
  const isSearching = search.trim().length >= 2

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
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-700" />
                <div className="space-y-6">
                  {visibleSets.map((set, i) => (
                    <SetEntry
                      key={set.code}
                      set={set}
                      searchQuery={isSearching ? search.trim() : ''}
                      defaultOpen={isSearching}
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
