// How the archetype's share moved since the previous metagame: nothing when
// that one has no decks, "New" when the archetype wasn't played there.
// size: the text size class (small by default, for the lists).
export default function ShareChange({ share, previous, debut, size = 'text-xs' }) {
  if (previous == null) return null
  if (previous === 0) {
    return debut
      ? <span className={`${size} font-medium text-amber-300`} title="Played for the first time">New</span>
      : <span className={`${size} font-medium text-sky-300`} title="Not played in the previous metagame, but in earlier ones">Comeback</span>
  }
  const change = share - previous
  const title = `${previous.toFixed(1)}% in the previous metagame`
  if (Math.abs(change) < 0.05) return <span className={`${size} text-gray-500 tabular-nums`} title={title}>= 0.0%</span>
  return (
    <span title={title} className={`${size} tabular-nums ${change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
      {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
    </span>
  )
}
