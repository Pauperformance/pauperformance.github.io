import { Link } from 'react-router-dom'
import { useCardPages, cardLinkSlug } from '../utils/cardPages'

const TONES = {
  default: 'border-gray-700',
  banned: 'border-red-900/60',
  unbanned: 'border-green-900/60',
}

// How much a card is played, from the number of decklists playing it.
export const STAPLE_DECKS = 100
export const PLAYED_DECKS = 10
export function playTier(decks) {
  if (decks >= STAPLE_DECKS) return 'staple'
  if (decks >= PLAYED_DECKS) return 'played'
  return 'unplayed'
}

// Chip colours by play tier: staples stand out, unplayed cards fade.
const PLAY_TEXT = {
  staple: 'text-white font-semibold',
  played: 'text-gray-200',
  unplayed: 'text-gray-500',
}
const PLAY_BORDERS = {
  staple: 'border-sky-400/60',
  played: 'border-sky-800/80',
  unplayed: 'border-gray-800',
}

// A card chip: links to the card's page and previews it on hover (image and
// Oracle text) through bindPreview, from useCardPreview (components/CardPreview).
// card: { name, url?, banned?, decks? }. Cards with no data preview only their
// image, from the card's Scryfall URL, or from its name when it has none.
// slug: the card page to link (default: the card's page, if it has one); null
// for a card without a page, shown as plain text. card.decks (the decklists
// playing it, on the Sets page) styles the chip by how much it is played.
export default function CardLink({ card, highlighted, slug, tone = 'default', bindPreview }) {
  const pages = useCardPages()

  const match = card.url && card.url.match(/scryfall\.com\/card\/([^/]+)\/([^/]+)\//)
  const imgSrc = match
    ? `https://api.scryfall.com/cards/${match[1]}/${match[2]}?format=image&version=normal`
    : `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=normal`

  const pageSlug = slug === undefined ? cardLinkSlug(pages, card.name) : slug
  // cards banned today (card.banned, from Myr) look like the banned ones of B&Rs
  const cardTone = tone === 'default' && card.banned ? 'banned' : tone
  const hasPlays = card.decks !== undefined
  // a ban's red border wins over the play tier's, which still sets the text
  const tier = hasPlays ? playTier(card.decks) : null
  const tierTone = tier ? PLAY_TEXT[tier] : 'text-gray-300'
  const borderTone = tier && cardTone === 'default' ? PLAY_BORDERS[tier] : TONES[cardTone]
  const className = `px-2.5 py-1 rounded-md text-xs border transition-colors ${
    highlighted
      ? 'bg-amber-400/10 border-amber-400/40 text-amber-300 hover:bg-amber-400/20'
      : `bg-gray-900 ${tierTone} ${borderTone} ${pageSlug ? 'hover:border-amber-400/50 hover:text-amber-300' : ''}`
  }`
  const handlers = {
    ...bindPreview(card.name, { slug: pageSlug || undefined, image: imgSrc }),
    title: card.banned ? 'Banned in Pauper' : undefined,
  }

  return pageSlug
    ? <Link to={`/cards/${pageSlug}`} {...handlers} className={className}>{card.name}</Link>
    : <span {...handlers} className={className}>{card.name}</span>
}
