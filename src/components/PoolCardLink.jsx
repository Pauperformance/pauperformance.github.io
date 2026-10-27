import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useCardPages, cardLinkSlug } from '../utils/cardPages'

const TONES = {
  default: 'border-gray-700',
  banned: 'border-red-900/60',
  unbanned: 'border-green-900/60',
}

// A card chip: links to the card's page and previews its image on hover.
// card: { name, url? }. The image comes from the card's Scryfall URL, or from
// its name when it has none. slug: the card page to link (default: the card's
// page, if it has one); null for a card without a page, shown as plain text.
export default function CardLink({ card, highlighted, slug, tone = 'default' }) {
  const [pos, setPos] = useState(null)
  const timerRef = useRef(null)
  const pages = useCardPages()

  const match = card.url && card.url.match(/scryfall\.com\/card\/([^/]+)\/([^/]+)\//)
  const imgSrc = match
    ? `https://api.scryfall.com/cards/${match[1]}/${match[2]}?format=image&version=normal`
    : `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=normal`

  const show = (e) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setPos({ x: e.clientX, y: e.clientY }), 150)
  }

  const move = (e) => {
    if (pos) setPos({ x: e.clientX, y: e.clientY })
  }

  const hide = () => {
    clearTimeout(timerRef.current)
    setPos(null)
  }

  const imgStyle = pos ? {
    left: pos.x + 220 > window.innerWidth ? pos.x - 220 : pos.x + 16,
    top: Math.max(8, Math.min(pos.y - 80, window.innerHeight - 320)),
  } : null

  const pageSlug = slug === undefined ? cardLinkSlug(pages, card.name) : slug
  // cards banned today (card.banned, from Myr) look like the banned ones of B&Rs
  const cardTone = tone === 'default' && card.banned ? 'banned' : tone
  const className = `px-2.5 py-1 rounded-md text-xs border transition-colors ${
    highlighted
      ? 'bg-amber-400/10 border-amber-400/40 text-amber-300 hover:bg-amber-400/20'
      : `bg-gray-900 ${TONES[cardTone]} text-gray-300 ${pageSlug ? 'hover:border-amber-400/50 hover:text-amber-300' : ''}`
  }`
  const handlers = {
    onMouseEnter: show, onMouseMove: move, onMouseLeave: hide,
    title: card.banned ? 'Banned in Pauper' : undefined,
  }

  return (
    <>
      {pageSlug
        ? <Link to={`/cards/${pageSlug}`} {...handlers} className={className}>{card.name}</Link>
        : <span {...handlers} className={className}>{card.name}</span>}
      {pos && createPortal(
        <img
          src={imgSrc}
          alt={card.name}
          className="fixed z-50 w-48 rounded-xl shadow-2xl border border-gray-700 pointer-events-none"
          style={imgStyle}
        />,
        document.body
      )}
    </>
  )
}
