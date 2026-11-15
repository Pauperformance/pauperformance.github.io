// Previews of videos on touch screens (components/VideoCard.jsx): there is no
// hover there, so the preview plays for the one video card that is in the
// middle of the screen once the scrolling stops, as on YouTube. Only one at a time.

// element -> setActive(boolean), for the cards that take part
const cards = new Map()
let current = null
let timer = null

// A card counts when most of it is on the screen; the closest to the middle wins.
function pick() {
  const middle = window.innerHeight / 2
  let best = null
  let bestDistance = Infinity
  for (const el of cards.keys()) {
    const r = el.getBoundingClientRect()
    const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)
    if (shown < r.height * 0.8) continue
    const distance = Math.abs((r.top + r.bottom) / 2 - middle)
    if (distance < bestDistance) { best = el; bestDistance = distance }
  }
  if (best === current) return
  if (current && cards.has(current)) cards.get(current)(false)
  current = best
  if (best) cards.get(best)(true)
}

// waits for the scrolling to settle
const schedule = () => {
  clearTimeout(timer)
  timer = setTimeout(pick, 200)
}

// el: the card's thumbnail; setActive: called with true when its preview should
// play, false when it should stop. Returns the function that unregisters it.
export function registerPreviewCard(el, setActive) {
  if (!cards.size) {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
  }
  cards.set(el, setActive)
  schedule()
  return () => {
    cards.delete(el)
    if (current === el) current = null
    if (!cards.size) {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      clearTimeout(timer)
    }
  }
}
