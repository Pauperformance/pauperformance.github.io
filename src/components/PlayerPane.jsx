import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import TournamentDecks from './TournamentDecks'
import MetaPie from './MetaPie'
import { metagameShares } from '../utils/tournament'
import { useTournamentSizes, playersOf } from '../utils/tournamentSizes'
import { displayPlace } from '../utils/places'
import { formatDate, formatShortDate } from '../utils/dates'

const LATEST_DECKS = 20

// A player in brief, for the players page on wide screens: the statistics of the player, the archetypes
// played most and the latest decks (the list of them and the decklist of the one selected, as on the
// page of the player).
// p: the player's row of the index; data: the player's decks (undefined while loading, null if they
// could not be loaded).
export default function PlayerPane({ p, data }) {
  const sizes = useTournamentSizes()
  const { shares, classified, browsed } = useMemo(() => {
    if (!data) return { shares: [], classified: 0, browsed: [] }
    // the share of each archetype in the player's decks, as for the decks of a tournament
    const { shares, classified } = metagameShares(data)
    const browsed = data.decks.slice(0, LATEST_DECKS).map(d => ({
      id: d.id,
      pilot: data.name,
      pilotOriginal: d.pilot_original,
      archetype: d.archetype,
      place: displayPlace(d.place),
      lead: formatShortDate(d.tournament_date),
      detail: d.tournament_name,
      listTitle: d.archetype,
      listDetail: d.tournament_name,
      listPlace: displayPlace(d.place),
      players: playersOf(sizes, d),
    }))
    return { shares, classified, browsed }
  }, [data, sizes])

  const stat = (value, label) => (
    <span><span className="text-white font-medium">{value.toLocaleString('en-US')}</span> {label}</span>
  )

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-xl font-bold text-white">{p.name}</h2>
          <Link to={`/players/${p.slug}`} className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-amber-400 text-gray-900 text-sm font-semibold hover:bg-amber-300 transition-colors whitespace-nowrap">Player page</Link>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
          {stat(p.deckCount, 'decks')}
          {stat(p.archetypeCount, 'archetypes')}
          {stat(p.events || 0, 'events')}
          {stat(p.wins || 0, 'wins')}
          {stat(p.top8 || 0, 'Top8s')}
          {stat(p.resources || 0, 'resources')}
          {p.firstSeen && <span>First seen: <span className="text-white font-medium">{formatDate(p.firstSeen)}</span></span>}
          {p.lastSeen && <span>Last seen: <span className="text-white font-medium">{formatDate(p.lastSeen)}</span></span>}
        </div>
      </div>

      {data === undefined ? (
        <p className="text-gray-400 text-sm py-8 text-center">Loading player…</p>
      ) : data === null ? (
        <p className="text-gray-500 text-sm py-8 text-center">This player could not be loaded.</p>
      ) : (
        <>
          {shares.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Most played</h3>
              <MetaPie shares={shares} listClassName="columns-2 2xl:columns-3 gap-x-4" rowClassName="break-inside-avoid mb-1.5" />
              {classified < data.decks.length && (
                <p className="mt-2 text-xs text-gray-500">
                  {data.decks.length - classified} of {data.decks.length} decks are not classified in an archetype yet and are left out.
                </p>
              )}
            </section>
          )}

          {browsed.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Latest decks</h3>
              <TournamentDecks key={data.slug} decks={browsed} wideList stackCard />
              {data.deckCount > LATEST_DECKS && (
                <p className="mt-3 text-xs text-gray-500">
                  The latest {LATEST_DECKS} of {data.deckCount.toLocaleString('en-US')} decks. <Link to={`/players/${p.slug}`} className="text-amber-400 hover:text-amber-300">All of them on the player page →</Link>
                </p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
