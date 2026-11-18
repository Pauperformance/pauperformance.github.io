// 1 to 4 stars for the size of a tournament: up to 8 players 1, up to 16 2, up to 32 3, more 4
export function sizeStars(players) {
  return players <= 8 ? 1 : players <= 16 ? 2 : players <= 32 ? 3 : 4
}

export default function SizeStars({ players, className = '' }) {
  const n = sizeStars(players)
  return (
    <span title={`${n} of 4 stars: ${players} players listed`} aria-label={`${n} of 4 stars`}
      className={`inline-block shrink-0 text-xs tracking-tighter text-amber-400 ${className}`}>
      {'★'.repeat(n)}<span className="text-gray-700">{'★'.repeat(4 - n)}</span>
    </span>
  )
}
