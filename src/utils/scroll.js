export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// A slower, eased scroll than the browser's own smooth scroll: 0.7s for a
// short way, up to 1.4s for a long one. Scrolling or touching the page while
// it runs hands control back to the reader.
// `to` can be a function giving the position: it is asked again on every frame,
// so that content loading on the way (which moves the target) doesn't make the
// scroll land short or long.
export function scrollGently(target) {
  const to = typeof target === 'function' ? target : () => target
  const from = window.scrollY
  const distance = to() - from
  if (Math.abs(distance) < 1) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return window.scrollTo(0, to())
  const duration = Math.min(1400, 700 + Math.abs(distance) / 3)
  const start = performance.now()
  let frame
  const stop = () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('wheel', stop)
    window.removeEventListener('touchstart', stop)
  }
  window.addEventListener('wheel', stop, { passive: true })
  window.addEventListener('touchstart', stop, { passive: true })
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1)
    window.scrollTo(0, from + (to() - from) * easeInOut(t))
    if (t < 1) frame = requestAnimationFrame(step)
    else {
      stop()
      // content that came in just now: one last correction
      setTimeout(() => { if (Math.abs(to() - window.scrollY) > 4) window.scrollTo({ top: to(), behavior: 'smooth' }) }, 250)
    }
  }
  frame = requestAnimationFrame(step)
}

// Call from a Previous / Next button at the end of a sidebar list: brings the
// start of that list back into view, gently. The sidebar is either its own
// scrolling box (the wide index pages) or a block of the page marked with
// data-sidebar (the decks of a tournament, an archetype, a player...).
export function scrollSidebarToTop(button) {
  if (!button) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const behavior = reduced ? 'auto' : 'smooth'
  for (let el = button.parentElement; el && el !== document.body; el = el.parentElement) {
    if (el.scrollHeight > el.clientHeight && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) {
      if (el.scrollTop > 0) el.scrollTo({ top: 0, behavior })
      return
    }
  }
  const block = button.closest('[data-sidebar]')
  if (!block) return
  const top = block.getBoundingClientRect().top
  if (top < 96) scrollGently(window.scrollY + top - 96)
}
