import { sizeStars } from './SizeStars'

// The filter for the size of a tournament: at least 2 to 4 stars (see SizeStars),
// again to clear. value: the least stars (0 for any).
const RANGES = [[2, '9+ players'], [3, '17+ players'], [4, '33+ players']]

// Whether a tournament of this many players (undefined when unknown) is big enough.
export function bigEnough(players, minStars) {
  return !minStars || (players !== undefined && sizeStars(players) >= minStars)
}

export default function SizeFilter({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-400 shrink-0">Size:</span>
      <div className="flex gap-1.5">
        {RANGES.map(([n, label]) => {
          const active = value === n
          return (
            <button key={n} onClick={() => onChange(active ? 0 : n)} aria-pressed={active}
              title={`Tournaments with ${label}`}
              className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${active
                ? 'bg-amber-400 border-amber-400 text-gray-900 font-semibold'
                : 'border-gray-600 text-gray-400 hover:border-amber-400/50 hover:text-amber-400'}`}>
              <span className={active ? '' : 'text-amber-400'}>{'★'.repeat(n)}</span><span className="ml-1">+</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
