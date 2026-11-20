import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../utils/useMediaQuery'

// Several sheets on one page (the archetype page has one for its decks, one for
// its videos) would float their buttons in the same corner. A sheet given a
// scope (a ref to the element of its section) only shows its button while that
// section is the one most in view.
const scopes = new Map() // element -> setActive
let scopeFrame = null

function updateScopes() {
  scopeFrame = null
  let best = null
  let bestShown = 0
  for (const el of scopes.keys()) {
    const r = el.getBoundingClientRect()
    const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)
    if (shown > bestShown) { best = el; bestShown = shown }
  }
  for (const [el, setActive] of scopes) setActive(el === best)
}

function scheduleScopes() {
  if (scopeFrame === null) scopeFrame = requestAnimationFrame(updateScopes)
}

// Whether the sheet shows: always, without a scope
function useScopeActive(scopeRef) {
  const [active, setActive] = useState(!scopeRef)
  useEffect(() => {
    const el = scopeRef && scopeRef.current
    if (!el) return
    if (!scopes.size) {
      window.addEventListener('scroll', scheduleScopes, { passive: true })
      window.addEventListener('resize', scheduleScopes)
    }
    scopes.set(el, setActive)
    // the section grows and shrinks (results load, filters apply)
    const observer = new ResizeObserver(scheduleScopes)
    observer.observe(el)
    scheduleScopes()
    return () => {
      observer.disconnect()
      scopes.delete(el)
      if (!scopes.size) {
        window.removeEventListener('scroll', scheduleScopes)
        window.removeEventListener('resize', scheduleScopes)
      }
      scheduleScopes()
    }
  }, [scopeRef])
  return active
}

// Mobile filters: a round button floats at the bottom of the screen and opens
// the filters in a sheet above it. The button closes the sheet again, and the
// results behind it are already up to date.
// scopeRef: see useScopeActive above.
export default function FilterSheet({ activeCount = 0, summary, onClear, scopeRef, children }) {
  const [open, setOpen] = useState(false)
  const active = useScopeActive(scopeRef)

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // out of its section's reach, and closed: nothing floats
  if (!active && !open) return null

  // Rendered in <body>: inside a page's `space-y-*` stack it would pick up the
  // stack's margins and float above the bottom edge of the screen.
  return createPortal(
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      <div
        role="dialog"
        aria-label="Filters"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[75dvh] overflow-y-auto overscroll-contain bg-gray-800 border-t border-gray-600 rounded-t-2xl px-4 pt-4 pb-5 transition-[transform,visibility,box-shadow] duration-300 ease-out ${open ? 'translate-y-0 visible shadow-2xl' : 'translate-y-full invisible shadow-none'}`}>
        <div className="space-y-3">{children}</div>
        <div className="mt-3 h-14 pr-16 flex items-center gap-3 text-sm">
          {activeCount > 0 && (
            <button onClick={onClear} className="shrink-0 px-2 text-amber-400 hover:text-amber-300 font-semibold">Clear</button>
          )}
          <button onClick={() => setOpen(false)} className="flex-1 h-12 rounded-xl border border-amber-400 text-amber-400 font-semibold">
            Show {summary}
          </button>
        </div>
      </div>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close filters' : 'Open filters'}
        aria-expanded={open}
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-5 right-4 md:right-5 z-50 w-12 h-12 rounded-full bg-amber-400 text-gray-900 shadow-lg shadow-black/50 flex items-center justify-center active:scale-95 transition-transform">
        {open ? (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        ) : (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" /></svg>
        )}
        {!open && activeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-gray-900 text-amber-400 border border-amber-400 text-xs font-bold flex items-center justify-center">{activeCount}</span>
        )}
      </button>
    </>,
    document.body
  )
}

// The filters of an index page: the usual box above the results, or on phones
// (the same width the swipe cards use) the floating sheet.
export function FilterPanel({ activeCount, onClear, summary, scopeRef, children }) {
  const phone = useMediaQuery('(max-width: 1023px)')
  if (phone) return <FilterSheet activeCount={activeCount} onClear={onClear} summary={summary} scopeRef={scopeRef}>{children}</FilterSheet>
  return <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">{children}</div>
}
