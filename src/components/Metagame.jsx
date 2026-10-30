import { Link } from 'react-router-dom'
import { formatShortDate } from '../utils/dates'

// A metagame: its p13m code and label (set code or BNR), linking to the
// metagames page; its start date on hover. count: the decks in it, if given.
export function MetagameBadge({ metagame, count }) {
  return (
    <Link to="/metagames" title={`Metagame ${metagame.metagame}, since ${formatShortDate(metagame.date)}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs bg-gray-700 border border-gray-600 text-gray-300 hover:border-amber-400/50 hover:text-amber-400 transition-colors whitespace-nowrap">
      <span className="font-semibold tabular-nums">{metagame.metagame}</span>
      <span className="uppercase text-gray-400">{metagame.label}</span>
      {count != null && <span className="text-amber-400 tabular-nums">· {count}</span>}
    </Link>
  )
}

// The first or last decklist playing an archetype or a card: its date and
// metagame (exported by Myr). note: shown after it, if given.
export function AppearanceRow({ label, appearance, note }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-gray-300">
      <span className="w-24 shrink-0 text-gray-500">{label}</span>
      {formatShortDate(appearance.date)}
      <MetagameBadge metagame={appearance.metagame} />
      <span className="text-gray-400">({appearance.metagame.name})</span>
      {note && <span className="text-xs text-gray-500">{note}</span>}
    </div>
  )
}
