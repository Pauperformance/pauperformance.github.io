import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const MANA_ICONS = new Set(['W', 'U', 'B', 'R', 'G', 'C'])

function ManaCost({ cost }) {
  if (!cost) return null
  const tokens = [...cost.matchAll(/\{([^}]+)\}/g)].map(m => m[1])
  if (!tokens.length) return null
  return (
    <span className="inline-flex items-center gap-0.5">
      {tokens.map((t, i) =>
        MANA_ICONS.has(t) ? (
          <img key={i} src={`/images/mana/${t}.png`} alt={t} className="w-5 h-5 inline-block" />
        ) : (
          <span key={i} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-600 text-gray-200 text-xs font-bold leading-none">
            {t}
          </span>
        )
      )}
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
        <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
          {face.oracle_text}
        </p>
      )}
      {face.flavor_text && (
        <p className="text-xs text-gray-400 italic leading-relaxed">{face.flavor_text}</p>
      )}
    </div>
  )
}

const PAGE_SIZE = 20

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-1.5 py-0.5 rounded-full text-xs font-semibold transition-colors border ${
        active
          ? 'bg-amber-400 text-gray-900 border-amber-400'
          : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400 hover:text-gray-200'
      }`}>
      {children}
    </button>
  )
}

function CardDecksSection({ slug }) {
  const [decks, setDecks] = useState(null)
  const [page, setPage] = useState(0)
  const [activeArchetypes, setActiveArchetypes] = useState(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`/data/card-decks/${slug}.json`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setDecks(d); setActiveArchetypes(new Set()) })
      .catch(() => setDecks([]))
  }, [slug])

  const archetypeNames = useMemo(() => {
    if (!decks) return []
    return [...new Set(decks.map(d => d.archetype))].sort()
  }, [decks])

  function toggleArchetype(a) {
    setActiveArchetypes(prev => prev.has(a) ? new Set() : new Set([a]))
  }

  const visibleDecks = useMemo(() => {
    if (!decks) return []
    if (activeArchetypes.size === 0) return decks
    return decks.filter(d => activeArchetypes.has(d.archetype))
  }, [decks, activeArchetypes])

  useEffect(() => { setPage(0) }, [activeArchetypes])

  if (!decks) return <p className="text-gray-500 text-sm">Loading decklists…</p>
  if (!decks.length) return <p className="text-gray-500 text-sm">No decklists recorded.</p>

  const totalPages = Math.ceil(visibleDecks.length / PAGE_SIZE)
  const paginated = visibleDecks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Archetypes
        </h2>
        <p className="text-sm text-gray-400">
          Played in <span className="text-gray-200 font-medium">{archetypeNames.length}</span> {archetypeNames.length === 1 ? 'archetype' : 'archetypes'}.
        </p>
      </div>
      {archetypeNames.length > 1 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 shrink-0">Archetype:</span>
          {archetypeNames.map(a => (
            <FilterButton key={a} active={activeArchetypes.has(a)} onClick={() => toggleArchetype(a)}>{a}</FilterButton>
          ))}
        </div>
      )}
      {archetypeNames.length > 1 && (
        <p className="text-xs text-gray-500 italic">Click an archetype to filter the decklists.</p>
      )}
      <p className="text-xs text-gray-500">{visibleDecks.length} decklists</p>
      <div className="border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 border-b border-gray-700">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Archetype</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Tournament</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Pilot</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Place</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {paginated.map(deck => (
              <tr key={deck.id}
                onClick={() => navigate(`/decks/${deck.id}`)}
                onAuxClick={e => { if (e.button === 1) window.open(`/#/decks/${deck.id}`, '_blank') }}
                className="bg-gray-900 hover:bg-gray-800 transition-colors cursor-pointer">
                <td className="px-4 py-2.5 text-amber-400 text-xs">{deck.archetype}</td>
                <td className="px-4 py-2.5 text-gray-300 hidden sm:table-cell">{deck.tournament_name}</td>
                <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{deck.tournament_date}</td>
                <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell">{deck.pilot}</td>
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

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setCard(null)
    fetch(`/data/card-details/${slug}.json`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setCard(data); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
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
                </div>

                {/* Card details */}
                <div className="flex flex-col gap-5 min-w-0">
                  {isMultiFace ? (
                    <>
                      <h1 className="text-2xl font-bold text-gray-100">{card.name}</h1>
                      {faces.map((face, i) => (
                        <div key={i}>
                          {i > 0 && <div className="border-t border-gray-700 mb-5" />}
                          <FaceDetails face={face} />
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-gray-100">{card.name}</h1>
                        {s?.mana_cost && <ManaCost cost={s.mana_cost} />}
                      </div>
                      {s?.type_line && <span className="text-gray-300 text-sm">{s.type_line}</span>}
                      {s?.oracle_text && (
                        <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
                          {s.oracle_text}
                        </p>
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

                  {/* Scryfall link */}
                  {s?.scryfall_uri && (
                    <a href={s.scryfall_uri} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-amber-400 transition-colors w-fit">
                      View on Scryfall →
                    </a>
                  )}

                  <Link to="/cards" className="text-xs text-gray-500 hover:text-amber-400 transition-colors w-fit">Cards Index →</Link>
                </div>
              </div>

              <section>
                <CardDecksSection slug={slug} />
              </section>
            </>
          )
        })()}
      </div>
    </Layout>
  )
}
