import { Link } from 'react-router-dom'
import { useCardPages, cardLinkSlug } from '../utils/cardPages'

const TONES = {
  default: 'border-gray-700',
  banned: 'border-red-900/60',
  unbanned: 'border-green-900/60',
}

// A card chip: links to the card's page and previews it on hover (image and
// Oracle text) through bindPreview, from useCardPreview (components/CardPreview).
// card: { name, url? }. Cards with no data preview only their image, from the
// card's Scryfall URL, or from its name when it has none. slug: the card page
// to link (default: the card's page, if it has one); null for a card without
// a page, shown as plain text.
export default function CardLink({ card, highlighted, slug, tone = 'default', bindPreview }) {
  const pages = useCardPages()

  const match = card.url && card.url.match(/scryfall\.com\/card\/([^/]+)\/([^/]+)\//)
  const imgSrc = match
    ? `https://api.scryfall.com/cards/${match[1]}/${match[2]}?format=image&version=normal`
    : `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=normal`

  const pageSlug = slug === undefined ? cardLinkSlug(pages, card.name) : slug
  // cards banned today (card.banned, from Myr) look like the banned ones of B&Rs
  const cardTone = tone === 'default' && card.banned ? 'banned' : tone
  const className = `px-2.5 py-1 rounded-md text-xs border transition-colors ${
    highlighted
      ? 'bg-amber-400/10 border-amber-400/40 text-amber-300 hover:bg-amber-400/20'
      : `bg-gray-900 ${TONES[cardTone]} text-gray-300 ${pageSlug ? 'hover:border-amber-400/50 hover:text-amber-300' : ''}`
  }`
  const handlers = {
    ...bindPreview(card.name, { slug: pageSlug || undefined, image: imgSrc }),
    title: card.banned ? 'Banned in Pauper' : undefined,
  }

  return pageSlug
    ? <Link to={`/cards/${pageSlug}`} {...handlers} className={className}>{card.name}</Link>
    : <span {...handlers} className={className}>{card.name}</span>
}
