import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cardLinkSlug, loadCardPages } from '../utils/cardPages'

// Hover preview of a card: its image (both sides of a double-faced card)
// beside its current Oracle text, since the wording printed on the image can
// be outdated. Data comes from /data/card-details/<slug>.json, which already
// carries the card's Scryfall object; it is fetched on first hover only.
//
// Desktop only: on touch devices a tap on a card opens its card page, which
// shows the same information.
//
// Cards with no data (e.g. banned cards, which aren't in the card index)
// show no preview.

const OPEN_DELAY = 200
const CLOSE_DELAY = 100
const MARGIN = 12
// Layouts printed on two sides of the card, so with a back image to show.
const DOUBLE_FACED_LAYOUTS = ['transform', 'modal_dfc']

const cache = new Map()

// The slug of the card's page, which holds its data; null if it has none.
function slugFor(name) {
  return loadCardPages().then(pages => cardLinkSlug(pages, name))
}

function loadCard(slug) {
  if (!slug) return Promise.resolve(null)
  if (!cache.has(slug)) {
    cache.set(slug, fetch(`/data/card-details/${slug}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && d.scryfall ? toPreview(d.scryfall) : null)
      .catch(() => { cache.delete(slug); return null }))
  }
  return cache.get(slug)
}

function stats(face) {
  if (face.power != null && face.toughness != null) return `${face.power}/${face.toughness}`
  if (face.loyalty != null) return `Loyalty ${face.loyalty}`
  if (face.defense != null) return `Defense ${face.defense}`
  return null
}

function toPreview(s) {
  const faces = s.card_faces && s.card_faces.length > 0 ? s.card_faces : [s]
  const images = []
  if (s.image_uris) images.push(s.image_uris.normal)
  else if (faces[0].image_uris) images.push(faces[0].image_uris.normal)
  if (DOUBLE_FACED_LAYOUTS.includes(s.layout) && faces[1] && faces[1].image_uris) images.push(faces[1].image_uris.normal)
  return {
    images,
    faces: faces.map(f => ({
      name: f.name,
      manaCost: f.mana_cost,
      typeLine: f.type_line,
      text: f.oracle_text,
      stats: stats(f),
    })),
  }
}

// One mana or tap symbol ("{U}", "{2/W}", "{T}") as Scryfall's icon, falling
// back to the raw text if Scryfall has no icon by that name.
function ManaSymbol({ symbol }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span>{symbol}</span>
  const code = symbol.slice(1, -1).replace(/\//g, '')
  return (
    <img
      src={`https://svgs.scryfall.io/card-symbols/${encodeURIComponent(code)}.svg`}
      alt={symbol}
      title={symbol}
      className="inline-block w-[1.05em] h-[1.05em] align-[-0.15em] mx-px"
      onError={() => setFailed(true)}
    />
  )
}

function WithSymbols({ text }) {
  return text.split(/(\{[^}]+\})/).map((part, i) =>
    /^\{[^}]+\}$/.test(part) ? <ManaSymbol key={i} symbol={part} /> : <Fragment key={i}>{part}</Fragment>
  )
}

// Reminder text, the parenthesised bits, is italic on the printed card.
function RulesLine({ line }) {
  return (
    <p>
      {line.split(/(\([^)]*\))/).map((part, i) =>
        part.startsWith('(')
          ? <i key={i} className="text-gray-400"><WithSymbols text={part} /></i>
          : <WithSymbols key={i} text={part} />
      )}
    </p>
  )
}

// Oracle text with mana/tap symbols as icons, one paragraph per line.
export function RulesText({ text, className = 'space-y-1' }) {
  return (
    <div className={className}>
      {text.split('\n').map((line, i) => <RulesLine key={i} line={line} />)}
    </div>
  )
}

function OracleFace({ face }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-white">{face.name}</span>
        {face.manaCost && <span className="shrink-0 whitespace-nowrap"><WithSymbols text={face.manaCost} /></span>}
      </div>
      {face.typeLine && <div className="text-xs text-gray-400">{face.typeLine}</div>}
      {face.text && (
        <RulesText text={face.text} className="space-y-1 border-t border-gray-700 pt-1.5" />
      )}
      {face.stats && <div className="text-right font-semibold text-white">{face.stats}</div>}
    </div>
  )
}

// The card's preview data ({ images, faces }) for `name`: undefined while
// loading, null when the card has no data. Pass `slug` when known.
export function useCardData(name, slug) {
  // Tagged with the name it was loaded for, so a stale card is never shown.
  const [loaded, setLoaded] = useState({ name: null, card: undefined })

  useEffect(() => {
    if (!name) return
    let alive = true
    const resolved = slug ? Promise.resolve(slug) : slugFor(name)
    resolved.then(loadCard).then(card => { if (alive) setLoaded({ name, card }) })
    return () => { alive = false }
  }, [name, slug])

  if (!name) return null
  return loaded.name === name ? loaded.card : undefined
}

// The card's Oracle text, one block per face; a skeleton while loading.
export function OracleText({ card, className = '' }) {
  if (card === null) return null
  return (
    <div className={`space-y-3 text-sm leading-snug ${className}`}>
      {card ? card.faces.map((face, i) => (
        <Fragment key={i}>
          {i > 0 && <div className="border-t border-dashed border-gray-600" />}
          <OracleFace face={face} />
        </Fragment>
      )) : (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 w-3/4 rounded bg-gray-700" />
          <div className="h-3 w-1/2 rounded bg-gray-700" />
          <div className="h-12 w-full rounded bg-gray-700" />
        </div>
      )}
    </div>
  )
}

function PreviewPanel({ target }) {
  const card = useCardData(target.name, target.slug)
  const panelRef = useRef(null)
  const [pos, setPos] = useState(null)

  // Left of the trigger when there is room, otherwise right of it;
  // vertically centred on it, kept inside the viewport.
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const rect = target.el.getBoundingClientRect()
    const { width, height } = panel.getBoundingClientRect()
    let left = rect.left - width - MARGIN
    let origin = 'right'
    if (left < MARGIN) {
      left = rect.right + MARGIN
      origin = 'left'
    }
    left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, window.innerWidth - width - MARGIN))
    let top = rect.top + rect.height / 2 - height / 2
    top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, window.innerHeight - height - MARGIN))
    setPos({ left, top, origin })
  }, [target, card])

  if (card === null) return null
  const images = !target.showImage ? [] : card ? card.images : [null]
  return createPortal(
    <div
      ref={panelRef}
      style={{
        left: pos ? pos.left : 0,
        top: pos ? pos.top : 0,
        visibility: pos ? 'visible' : 'hidden',
        transformOrigin: pos ? `${pos.origin} center` : undefined,
      }}
      className="card-preview-in pointer-events-none fixed z-50 flex items-start gap-3 p-2 max-w-[calc(100vw-24px)] rounded-xl border border-gray-700 bg-gray-800 text-gray-200 shadow-2xl shadow-black/60">
      {images.length > 0 && <div className="flex shrink-0 gap-2">
        {images.map((src, i) => (
          src
            ? <img key={src} src={src} alt={i === 0 ? target.name : `${target.name} (back face)`}
                className="w-[200px] aspect-[63/88] rounded-[4.5%/3.2%] bg-gray-900 object-cover" />
            : <div key={i} className="w-[200px] aspect-[63/88] rounded-[4.5%/3.2%] bg-gray-900" />
        ))}
      </div>}
      <OracleText card={card} className="w-[260px] py-1 pr-1" />
    </div>,
    document.body
  )
}

// Returns `bind(name, options)`, to spread on each trigger element, and the
// `preview` element to render once anywhere in the page. Options:
//   slug       the card's slug, when known (otherwise looked up from the name)
//   showImage  false to show the Oracle text only, when the trigger is
//              already the card's image
export function useCardPreview() {
  const [target, setTarget] = useState(null)
  const openTimer = useRef(null)
  const closeTimer = useRef(null)
  const shownRef = useRef(false)
  const [hoverCapable] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches)

  shownRef.current = target !== null

  const hide = useCallback(() => {
    clearTimeout(openTimer.current)
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setTarget(null), CLOSE_DELAY)
  }, [])

  const show = useCallback(target => {
    clearTimeout(openTimer.current)
    clearTimeout(closeTimer.current)
    // Already showing another card: switch right away, so moving down a
    // list doesn't flicker; otherwise wait, so sweeping across it doesn't
    // flash previews.
    if (shownRef.current) setTarget(target)
    else openTimer.current = setTimeout(() => setTarget(target), OPEN_DELAY)
  }, [])

  useEffect(() => {
    if (!target) return
    const close = () => { clearTimeout(openTimer.current); setTarget(null) }
    const onKey = e => { if (e.key === 'Escape') close() }
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [target])

  useEffect(() => () => {
    clearTimeout(openTimer.current)
    clearTimeout(closeTimer.current)
  }, [])

  const bind = useCallback((name, { slug, showImage = true } = {}) => hoverCapable ? {
    onMouseEnter: e => show({ el: e.currentTarget, name, slug, showImage }),
    onMouseLeave: hide,
  } : {}, [hoverCapable, show, hide])

  const preview = target && <PreviewPanel target={target} />
  return { bind, preview }
}
