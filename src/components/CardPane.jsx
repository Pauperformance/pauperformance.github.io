import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RulesText } from './CardPreview'
import ManaCost from './ManaCost'
import { AppearanceRow, MetagameBadge } from './Metagame'
import CardPopularityChart, { PopularityTrend } from './CardPopularityChart'
import { nameToSlug } from '../utils/slugs'
import { decodeCardDecks } from '../utils/cardDecks'
import { useArtwork, withArtwork } from '../utils/artwork'

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

// Beside the card's name, if it's banned today.
function BannedBadge({ card }) {
  if (!card.banned) return null
  return (
    <span title="Banned in Pauper"
      className="px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wide bg-red-900/50 text-red-300 border border-red-800">
      Banned
    </span>
  )
}

// the label column of the card's rows (first and last played, popularity,
// played in): wide enough for "First played:"
const LABEL_WIDTH = 'w-20'

function Rank({ rank }) {
  return <span className="font-semibold text-amber-400 tabular-nums">#{rank.toLocaleString('en-US')}</span>
}

// The card's popularity rank over all the tournament decks, then in the
// current metagame (as on /cards; a link to its popularity chart) with its
// trend: both from Myr.
function PopularityRow({ card }) {
  const allTime = card.popularity_all_time_rank, current = card.popularity_rank
  if (allTime == null && current == null) return null
  return (
    <div className="flex items-baseline gap-x-1.5 text-sm text-gray-300">
      <span className={`${LABEL_WIDTH} shrink-0 text-gray-500`}>Popularity:</span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        {allTime != null && <><Rank rank={allTime} /><span className="text-gray-400">all time</span></>}
        {allTime != null && current != null && <span className="text-gray-600">·</span>}
        {current != null && (
          <>
            {card.popularity ? <a href="#popularity" className="hover:underline"><Rank rank={current} /></a> : <Rank rank={current} />}
            <span className="text-gray-400">in</span>
            {card.popularity_metagame && <MetagameBadge metagame={card.popularity_metagame} />}
            <PopularityTrend share={card.popularity_share} previous={card.popularity_previous_share} />
            {!card.popularity_decks && <span className="text-gray-500">(not played)</span>}
          </>
        )}
      </div>
    </div>
  )
}

// The decklists playing the card (null while loading), from
// /data/card-decks/<slug>.json.
export function useCardDecks(slug) {
  const [decks, setDecks] = useState(null)
  useEffect(() => {
    setDecks(null)
    if (!slug) return
    let cancelled = false
    fetch(`/data/card-decks/${slug}.json`)
      .then(r => r.ok ? r.json().then(decodeCardDecks) : [])
      .then(d => { if (!cancelled) setDecks(d) })
      .catch(() => { if (!cancelled) setDecks([]) })
    return () => { cancelled = true }
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
    <div className="flex items-baseline gap-1.5 text-sm">
      <span className={`${LABEL_WIDTH} shrink-0 text-gray-500`}>Played in:</span>
      {/* the badges wrap in their own column, under the first one */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
    </div>
  )
}

// The card's page without its decklists: images, rules, first and last played,
// popularity (rank and chart) and the archetypes playing it. Used by the card's
// page (CardPage) and beside or as the swipe card of the Cards Index.
// card: the details from /data/card-details (null while they load); name: shown
// meanwhile; decks: the decklists playing it (for the archetypes); titleAs: the
// heading's tag; pageLink: a link to the card's own page, under the images.
export default function CardPane({ card, name, decks, titleAs: Title = 'h2', pageLink = false }) {
  const artwork = useArtwork()
  if (!card) return <p className="text-gray-500 text-sm">{name ? `${name}: ` : ''}Loading…</p>
  // the print of the visitor's artwork: its image, set, rarity and artist
  const s = withArtwork(card.scryfall, card.first_print, artwork)
  const faces = s?.card_faces || null
  // DFC: card_faces present but no top-level image (each face has its own image)
  // Split: card_faces present with a top-level image (one image, multiple text halves)
  const isDFC = !!faces && !s?.image_uris
  const isMultiFace = !!faces

  return (
    <div className="space-y-8">
      <div>
        <div className="md:hidden flex items-center gap-3 flex-wrap mb-2">
          <Title className="text-2xl font-bold text-gray-100">{card.name}</Title>
          {!isMultiFace && s?.mana_cost && <ManaCost cost={s.mana_cost} />}
          <BannedBadge card={card} />
        </div>
              <div className="flex flex-col md:flex-row gap-8 mb-10">
                {/* Images; on phones as wide as the images, not the page, so
                    the links under them end at the card's right edge */}
                <div className={`shrink-0 flex flex-col gap-3 self-start md:self-stretch`}>
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
                    {pageLink
                      ? <Link to={`/cards/${card.slug || nameToSlug(card.name)}`} className="text-gray-400 hover:text-amber-400 transition-colors">Card page →</Link>
                      : <Link to="/cards" className="text-gray-400 hover:text-amber-400 transition-colors">Cards Index →</Link>}
                  </div>
                </div>

                {/* Card details */}
                <div className="flex flex-col gap-5 min-w-0">
                  {isMultiFace ? (
                    <>
                      <div className="hidden md:flex items-center gap-3 flex-wrap">
                        <Title className="text-2xl font-bold text-gray-100">{card.name}</Title>
                        <BannedBadge card={card} />
                      </div>
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
                        <Title className="text-2xl font-bold text-gray-100">{card.name}</Title>
                        {s?.mana_cost && <ManaCost cost={s.mana_cost} />}
                        <BannedBadge card={card} />
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
                      {s.set_name && <span className="text-gray-400">{s.set_name}{s.rarity && <span className="capitalize">, {s.rarity}</span>}</span>}
                    </p>
                  )}

                  {/* First and last decklists playing it, its popularity and
                      archetypes: rows as close as each other */}
                  <div className="space-y-2">
                    {card.first_appearance && (
                      <>
                        <AppearanceRow label="First played:" appearance={card.first_appearance} labelWidth={LABEL_WIDTH}
                          note={card.first_on_record && '— our decklists start here: it may have been played earlier'} />
                        <AppearanceRow label="Last played:" appearance={card.last_appearance} labelWidth={LABEL_WIDTH} />
                      </>
                    )}
                    <PopularityRow card={card} />
                    <PlayedIn decks={decks} />
                  </div>
                </div>
              </div>
      </div>
      {card.popularity && (
        <section id="popularity" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-gray-700">Popularity</h2>
          <CardPopularityChart series={card.popularity} />
        </section>
      )}
    </div>
  )
}
