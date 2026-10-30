export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// A slower, eased scroll than the browser's own smooth scroll: 0.7s for a
// short way, up to 1.4s for a long one. Scrolling or touching the page while
// it runs hands control back to the reader.
export function scrollGently(to) {
  const from = window.scrollY
  const distance = to - from
  if (Math.abs(distance) < 1) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return window.scrollTo(0, to)
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
    window.scrollTo(0, from + distance * easeInOut(t))
    if (t < 1) frame = requestAnimationFrame(step)
    else stop()
  }
  frame = requestAnimationFrame(step)
}
