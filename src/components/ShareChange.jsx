// How the archetype's share moved since the previous metagame: nothing when
// that one has no decks, "New" when the archetype wasn't played there.
export default function ShareChange({ share, previous }) {
  if (previous == null) return null
  if (previous === 0) {
    return <span className="text-xs font-medium text-amber-300" title="Not played in the previous metagame">New</span>
  }
  const change = share - previous
  const title = `${previous.toFixed(1)}% in the previous metagame`
  if (Math.abs(change) < 0.05) return <span className="text-xs text-gray-500 tabular-nums" title={title}>= 0.0%</span>
  return (
    <span title={title} className={`text-xs tabular-nums ${change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
      {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
    </span>
  )
}
