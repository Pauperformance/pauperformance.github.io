import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import MetaPie from '../components/MetaPie'
import TournamentDecks from '../components/TournamentDecks'
import { MetagameBadge } from '../components/Metagame'
import { pilotToSlug } from '../utils/slugs'
import { formatDate } from '../utils/dates'
import { sourceLabel } from '../utils/sources'
import { distinctSources, listedSources, metagameShares, sourceComparison } from '../utils/tournament'


export default function TournamentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  // undefined while loading, null when there is no such tournament
  const [t, setT] = useState(undefined)

  useEffect(() => {
    setT(undefined)
    let cancelled = false
    fetch(`/data/tournament-details/${encodeURIComponent(id)}.json`)
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(async data => {
        if (data) return data
        // the copy of an event that a source lists twice has no page: its old
        // link leads to the tournament that was kept
        const aliases = await fetch('/data/tournament-aliases.json')
          .then(r => (r.ok ? r.json() : {}))
          .catch(() => ({}))
        if (aliases[id]) {
          navigate(`/tournaments/${encodeURIComponent(aliases[id])}`, { replace: true })
          return undefined
        }
        return null
      })
      .then(data => { if (!cancelled && data !== undefined) setT(data) })
    return () => { cancelled = true }
  }, [id, navigate])

  const { shares, classified } = useMemo(() => metagameShares(t), [t])
  const { overlap, notes } = useMemo(() => sourceComparison(t), [t])

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
          <div title="The different decks the sources list for the event, usually the top finishers rather than every entrant">
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
            <p className="text-base text-gray-500 mb-0.5">{distinctSources(t).length > 1 ? 'Sources' : 'Source'}</p>
            <p className="font-medium text-gray-200 flex flex-wrap gap-x-4">
              {listedSources(t).map(src => (
                <a key={src.source + src.id} href={src.url} target="_blank" rel="noopener noreferrer"
                  title={`${src.name} · ${src.decks} deck${src.decks !== 1 ? 's' : ''}`}
                  className="text-amber-400 hover:text-amber-300">
                  {sourceLabel(src.source)} →
                </a>
              ))}
            </p>
          </div>
        </div>

        {(overlap.length > 0 || notes.length > 0) && (
          <details className="rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm">
            <summary className="cursor-pointer select-none text-base font-semibold text-white">
              How the sources compare
              {notes.length > 0 && <span className="ml-2 text-xs font-normal text-amber-500">⚠ {notes.length}</span>}
            </summary>
            <div className="mt-2 space-y-2">
              <ul className="list-disc pl-5 text-gray-300 text-sm space-y-0.5">
                {t.sources.map(src => (
                  <li key={src.source + src.id}>
                    {sourceLabel(src.source)}: {src.decks} deck{src.decks !== 1 ? 's' : ''}, “{src.name}”, {formatDate(src.date)}
                    {src.duplicate && ' (a second listing of the same event, not counted)'}
                  </li>
                ))}
              </ul>
              {overlap.length > 0 && (
                <ul className="text-gray-300 text-sm space-y-0.5">
                  {overlap.map((o, i) => <li key={i}>{o}.</li>)}
                </ul>
              )}
              {notes.length > 0 && (
                <ul className="text-amber-500 space-y-0.5">
                  {notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              )}
            </div>
          </details>
        )}

        {shares.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Metagame</h2>
            {/* on wide screens the card is as wide as its content, the list's two columns at most 40rem each,
                so that a name and its share stay next to each other */}
            <div className="sm:w-fit max-w-full">
              <MetaPie shares={shares}
                listClassName="grid grid-cols-2 gap-x-10 gap-y-1.5 content-start sm:min-w-[28rem] sm:max-w-[48rem]" />
            </div>
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
            <TournamentDecks key={t.id} decks={t.decks} several={distinctSources(t).length > 1} />
          )}
        </section>
      </div>
    </Layout>
  )
}
