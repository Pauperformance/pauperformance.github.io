import { useState, useRef, useEffect } from 'react'

// Pixels a finger must travel sideways, and mostly sideways, to count as a swipe.
const SWIPE_DISTANCE = 80

const NAV_BUTTON = 'px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

// One card at a time out of a list, swiped (or stepped, or moved with the arrow
// keys) to the next or previous one, as the decklists of a tournament are on
// phones (the same gestures as the Swap view of components/TournamentDecks.jsx).
// index/count: the card shown and how many there are; onChange(index): another
// card was asked for; label: what is shown between the buttons; hint: the
// line under the card; cardKey: tells one card from the next, for the
// animation; children: the card.
export default function SwipeCards({ index, count, onChange, label, hint, cardKey, children }) {
  // which way the last step went, for the card to slide in from that side
  const [direction, setDirection] = useState(0)
  const areaRef = useRef(null)
  const panelRef = useRef(null)
  const swipeStart = useRef(null)
  const dragging = useRef(false)

  const step = n => {
    const to = index + n
    if (to < 0 || to >= count) return
    // the card keeps its height until the next one is in: the page below it doesn't move meanwhile
    if (areaRef.current) areaRef.current.style.minHeight = `${areaRef.current.offsetHeight}px`
    setDirection(n)
    onChange(to)
  }
  const stepRef = useRef(step)
  stepRef.current = step

  // the next card is in: it needn't hold its place any more
  useEffect(() => {
    if (areaRef.current) areaRef.current.style.minHeight = ''
  }, [cardKey])

  // the arrow keys step too, unless the visitor is typing or choosing something
  useEffect(() => {
    const onKey = e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowRight') stepRef.current(1)
      if (e.key === 'ArrowLeft') stepRef.current(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The card follows the finger and fades as it is dragged. Let go past
  // SWIPE_DISTANCE and it leaves the way it was going (the next or previous card
  // comes in from the other side); let go before, or at the first or last card,
  // and it settles back. It is moved directly, not through state.
  const settle = (el, transform, opacity, ms = 200) => {
    el.style.transition = `transform ${ms}ms ease-out, opacity ${ms}ms ease-out`
    el.style.transform = transform
    el.style.opacity = opacity
  }
  // how far the card is dragged for a finger that moved dx: at the ends it only gives a little
  const dragged = dx => ((dx > 0 && index === 0) || (dx < 0 && index >= count - 1) ? dx * 0.25 : dx)
  const onTouchStart = e => {
    const t = e.touches[0]
    swipeStart.current = { x: t.clientX, y: t.clientY }
    dragging.current = false
  }
  const onTouchMove = e => {
    const start = swipeStart.current
    const el = panelRef.current
    if (!start || !el) return
    const t = e.touches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (!dragging.current) {
      // mostly sideways: ours; otherwise the page scrolls
      if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy) * 1.5) return
      dragging.current = true
    }
    const d = dragged(dx)
    el.style.animation = 'none'
    el.style.transition = 'none'
    el.style.transform = `translateX(${d}px) rotate(${d / 60}deg)`
    el.style.opacity = String(1 - Math.min(Math.abs(d) / (window.innerWidth * 0.9), 0.85))
  }
  const onTouchEnd = e => {
    const start = swipeStart.current
    swipeStart.current = null
    const el = panelRef.current
    if (!start || !dragging.current || !el) return
    dragging.current = false
    const dx = e.changedTouches[0].clientX - start.x
    const to = dx < 0 ? 1 : -1 // a swipe left shows the next card, a swipe right the previous one
    if (Math.abs(dx) >= SWIPE_DISTANCE && index + to >= 0 && index + to < count) {
      // it keeps going the way it was dragged, fading out, then the next card comes in
      settle(el, `translateX(${dx < 0 ? '-' : ''}${window.innerWidth}px) rotate(${dx < 0 ? '-' : ''}6deg)`, '0', 120)
      setTimeout(() => stepRef.current(to), 100)
    } else {
      settle(el, 'none', '1')
    }
  }
  const onTouchCancel = () => {
    swipeStart.current = null
    if (dragging.current && panelRef.current) settle(panelRef.current, 'none', '1')
    dragging.current = false
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <button onClick={() => step(-1)} disabled={index <= 0} className={NAV_BUTTON}>‹ Previous</button>
        <span className="text-sm text-gray-400 text-center">{label}</span>
        <button onClick={() => step(1)} disabled={index >= count - 1} className={NAV_BUTTON}>Next ›</button>
      </div>
      {/* sideways swipes are ours, vertical ones still scroll the page */}
      <div ref={areaRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel} style={{ touchAction: 'pan-y' }}>
        <div key={cardKey} ref={panelRef} className={direction > 0 ? 'swap-from-right' : direction < 0 ? 'swap-from-left' : ''}>
          {children}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-gray-500">
        {hint}
      </p>
    </div>
  )
}
