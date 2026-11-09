import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import MetaPie from '../components/MetaPie'
import TournamentDecks from '../components/TournamentDecks'
import { MetagameBadge } from '../components/Metagame'
import { pilotToSlug } from '../utils/slugs'
import { formatDate } from '../utils/dates'

const SOURCE_LABEL = { mtggoldfish: 'MTGGoldfish', waybackmachine: 'Wayback Machine' }

export default function TournamentPage() {
  const { id } = useParams()
  // undefined while loading, null when there is no such tournament
  const [t, setT] = useState(undefined)

  useEffect(() => {
    setT(undefined)
    let cancelled = false
    fetch(`/data/tournament-details/${encodeURIComponent(id)}.json`)
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(data => { if (!cancelled) setT(data) })
    return () => { cancelled = true }
  }, [id])

  // The archetypes of the classified decks, most played first. Decks no
  // archetype claims (yet) are left out of the pie, and counted apart.
  const { shares, classified } = useMemo(() => {
    const counts = new Map()
    let classified = 0
    for (const d of t?.decks || []) {
      if (!d.archetype) continue
      classified++
      counts.set(d.archetype, (counts.get(d.archetype) || 0) + 1)
    }
    const shares = [...counts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([archetype_name, n]) => ({ archetype_name, meta_share: (n / classified) * 100 }))
    return { shares, classified }
  }, [t])

  if (t === undefined) {
    return <Layout><p className="text-gray-400 text-sm py-8 text-center">Loading tournament…</p></Layout>
  }

  if (t === null) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-4xl font-bold text-gray-600 mb-4">404</p>
          <p className="text-gray-400 mb-6">There is no tournament with id {id}.</p>
          <Link to="/tournaments" className="text-amber-400 hover:underline text-sm">← All tournaments</Link>
        </div>
      </Layout>
    )
  }

  const title = t.name || `Tournament #${t.id}`
  const winner = t.decks.find(d => d.place === '1st')

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-2 text-gray-400">Played on {formatDate(t.date)}</p>
          {t.metagame && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-400">
              <span>Metagame:</span>
              <MetagameBadge metagame={t.metagame} />
              {t.metagame.name !== t.metagame.label && <span>{t.metagame.name}</span>}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <div title="The decks the source lists for the event, usually the top finishers rather than every entrant">
            <p className="text-base text-gray-500 mb-0.5">Players</p>
            <p className="font-medium text-gray-200">{t.decks.length}</p>
          </div>
          {winner && (
            <div>
              <p className="text-base text-gray-500 mb-0.5">Winner</p>
              <p className="font-medium text-gray-200">
                {/* player pages exist for the decks of an archetype only */}
                {winner.pilot && winner.archetype
                  ? <Link to={`/players/${pilotToSlug(winner.pilot)}`} className="text-amber-400 hover:text-amber-300">{winner.pilot}</Link>
                  : (winner.pilot || 'Anonymous')}
                <span className="text-gray-400 font-normal"> · </span>
                <Link to={`/decks/${winner.id}`} className="text-amber-400 hover:text-amber-300 font-normal">
                  {winner.archetype || 'Decklist'}
                </Link>
              </p>
            </div>
          )}
          <div>
            <p className="text-base text-gray-500 mb-0.5">Source</p>
            <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
              {SOURCE_LABEL[t.source] || t.source} →
            </a>
          </div>
        </div>

        {shares.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Metagame</h2>
            <MetaPie shares={shares}
              listClassName="grid grid-cols-2 gap-x-4 gap-y-1.5 content-start" />
            {classified < t.decks.length && (
              <p className="mt-2 text-xs text-gray-500">
                {t.decks.length - classified} of {t.decks.length} decks are not classified in an archetype yet and are left out.
              </p>
            )}
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Decks</h2>
          {t.decks.length === 0 ? (
            <p className="text-gray-500 text-sm">The source lists no decks for this tournament.</p>
          ) : (
            <TournamentDecks key={t.id} decks={t.decks} />
          )}
        </section>
      </div>
    </Layout>
  )
}
