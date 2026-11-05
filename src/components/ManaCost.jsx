// The icons of the mana symbols we have in /images/mana, by symbol without
// its braces and slash ("{2/W}" is "2W").
const MANA_ICONS = new Set([
  'W', 'U', 'B', 'R', 'G', 'C',
  'WU', 'WB', 'BR', 'BG', 'UB', 'UR', 'RG', 'RW', 'GW', 'GU',
  'GUP', 'GWP',
  'CW', 'CU', 'CB', 'CR', 'CG',
  '2W', '2U', '2B', '2R', '2G',
  'WP', 'UP', 'BP', 'RP', 'GP',
  'X', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '10', '11', '12', '13', '14', '15', '16',
])

// A mana cost ("{1}{U}{U}") as its symbols; the cost of a card with two
// halves ("{1}{R} // {1}{U}") as the two, set apart. size: the symbols'
// width and height classes.
export default function ManaCost({ cost, size = 'w-5 h-5' }) {
  if (!cost) return null
  const halves = cost.split(' // ').map(half => [...half.matchAll(/\{([^}]+)\}/g)].map(m => m[1])).filter(t => t.length)
  if (!halves.length) return null
  return (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap" title={cost}>
      {halves.map((tokens, h) => (
        <span key={h} className="inline-flex items-center gap-0.5">
          {h > 0 && <span className="mx-0.5 text-gray-500 text-xs">//</span>}
          {tokens.map((t, i) => {
            const key = t.replace('/', '')
            if (MANA_ICONS.has(key)) return <img key={i} src={`/images/mana/${key}.png`} alt={`{${t}}`} className={`${size} inline-block`} />
            return (
              <span key={i} className={`inline-flex items-center justify-center ${size} rounded-full bg-gray-600 text-gray-200 text-xs font-bold leading-none`}>
                {t}
              </span>
            )
          })}
        </span>
      ))}
    </span>
  )
}
