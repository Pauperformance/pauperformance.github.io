import { RESULTS } from '../utils/places'

// The filter for the result of a deck: its place or record (see resultMatches), again to clear.
// value: the key of the result ('' for any).
export default function ResultFilter({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-400 shrink-0">Result:</span>
      <div className="flex flex-wrap gap-1.5">
        {RESULTS.map(([key, label]) => {
          const active = value === key
          return (
            <button key={key} onClick={() => onChange(active ? '' : key)} aria-pressed={active}
              title={key === 'undefeated' ? 'Records without a loss (5-0, 4-0, …)' : key === 'winner' ? 'First place' : `Placed ${label.toLowerCase()}`}
              className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${active
                ? 'bg-amber-400 border-amber-400 text-gray-900 font-semibold'
                : 'border-gray-600 text-gray-400 hover:border-amber-400/50 hover:text-amber-400'}`}>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
