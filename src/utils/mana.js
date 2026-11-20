// Mana icons: an archetype or family of all five colours (WUBRG) shows one rainbow icon
// instead of five; colourless (C) stays beside it.
const FIVE = ['W', 'U', 'B', 'R', 'G']

// colors: a list of mana codes, in the order to show. Returns the icons to show.
export function displayMana(colors) {
  if (!FIVE.every(c => colors.includes(c))) return colors
  return ['WUBRG', ...colors.filter(c => !FIVE.includes(c))]
}

export const manaSrc = code => (code === 'WUBRG' ? '/images/mana/WUBRG.svg' : `/images/mana/${code}.png`)
export const manaLabel = code => (code === 'WUBRG' ? 'All five colors' : code)
