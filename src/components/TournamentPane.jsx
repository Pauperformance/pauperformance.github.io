import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import MetaPie from './MetaPie'
import TournamentDecks from './TournamentDecks'
import { MetagameBadge } from './Metagame'
import { pilotToSlug } from '../utils/slugs'
import { formatDate } from '../utils/dates'
import { sourceLabel } from '../utils/sources'
import { metagameShares, sourceComparison } from '../utils/tournament'

// A tournament in brief, for the tournaments page on wide screens: who played
// and won it, its metagame, how the sources compare, then its decks (the list
// of them and the decklist of the one selected, as on the page of the tournament),
// unless showDecks is off (on phones, where the page of the tournament has them).
// t: the tournament's details (undefined while loading, null if they could not be loaded).
export default function TournamentPane({ t, showDecks = true }) {
  const { shares, classified } = useMemo(() => metagameShares(t), [t])
  const { overlap, notes } = useMemo(() => sourceComparison(t), [t])

  if (t === undefined) return <p className="text-gray-400 text-sm py-8 text-center">Loading tournament…</p>
  if (t === null) return <p className="text-gray-500 text-sm py-8 text-center">This tournament could not be loaded.</p>

  const winner = t.decks.find(d => d.place === '1st')

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-xl font-bold text-white">{t.name || `Tournament #${t.id}`}</h2>
          <Link to={`/tournaments/${t.id}`} className="text-sm text-amber-400 hover:text-amber-300 whitespace-nowrap">Tournament page →</Link>
        </div>
        <p className="text-gray-400 text-sm">Played on {formatDate(t.date)}</p>
        {t.metagame && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
            <span>Metagame:</span>
            <MetagameBadge metagame={t.metagame} />
            {t.metagame.name !== t.metagame.label && <span>{t.metagame.name}</span>}
          </p>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div title="The different decks the sources list for the event, usually the top finishers rather than every entrant">
            <span className="text-gray-500">Players </span>
            <span className="font-medium text-gray-200">{t.decks.length}</span>
          </div>
          {winner && (
            <div>
              <span className="text-gray-500">Winner </span>
              <span className="font-medium text-gray-200">
                {winner.pilot && winner.archetype
                  ? <Link to={`/players/${pilotToSlug(winner.pilot)}`} className="text-amber-400 hover:text-amber-300">{winner.pilot}</Link>
                  : (winner.pilot || 'Anonymous')}
                <span className="text-gray-400 font-normal"> · </span>
                <Link to={`/decks/${winner.id}`} className="text-amber-400 hover:text-amber-300 font-normal">
                  {winner.archetype || 'Decklist'}
                </Link>
              </span>
            </div>
          )}
          <div>
            <span className="text-gray-500">{t.sources.length > 1 ? 'Sources ' : 'Source '}</span>
            <span className="font-medium text-gray-200 inline-flex flex-wrap gap-x-3">
              {t.sources.map(src => (
                <a key={src.source + src.id} href={src.url} target="_blank" rel="noopener noreferrer"
                  title={`${src.name} · ${src.decks} deck${src.decks !== 1 ? 's' : ''}`}
                  className="text-amber-400 hover:text-amber-300">
                  {sourceLabel(src.source)} →
                </a>
              ))}
            </span>
          </div>
        </div>
      </div>

      {shares.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-white mb-3">Metagame</h3>
          <MetaPie shares={shares} listClassName="grid grid-cols-2 2xl:grid-cols-3 gap-x-4 gap-y-1.5 content-start" />
          {classified < t.decks.length && (
            <p className="mt-2 text-xs text-gray-500">
              {t.decks.length - classified} of {t.decks.length} decks are not classified in an archetype yet and are left out.
            </p>
          )}
        </section>
      )}

      {(overlap.length > 0 || notes.length > 0) && (
        <details className="rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm">
          <summary className="cursor-pointer select-none text-base font-semibold text-white">
            How the sources compare
            {notes.length > 0 && <span className="ml-2 text-xs font-normal text-amber-500">⚠ {notes.length}</span>}
          </summary>
          <div className="mt-2 space-y-2">
            <ul className="text-gray-300">
              {t.sources.map(src => (
                <li key={src.source + src.id}>
                  {sourceLabel(src.source)}: {src.decks} deck{src.decks !== 1 ? 's' : ''}, “{src.name}”, {formatDate(src.date)}
                </li>
              ))}
            </ul>
            {overlap.length > 0 && <p className="text-gray-300">{overlap.join(' · ')}.</p>}
            {notes.length > 0 && (
              <ul className="list-disc pl-5 text-amber-500 space-y-0.5">
                {notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            )}
          </div>
        </details>
      )}

      {showDecks && <section>
        <h3 className="text-lg font-semibold text-white mb-3">Decks</h3>
        {t.decks.length === 0 ? (
          <p className="text-gray-500 text-sm">The source lists no decks for this tournament.</p>
        ) : (
          <TournamentDecks key={t.id} decks={t.decks} several={t.sources.length > 1} />
        )}
      </section>}
    </div>
  )
}
