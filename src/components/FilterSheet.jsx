import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../utils/useMediaQuery'

// Mobile filters: a round button floats at the bottom of the screen and opens
// the filters in a sheet above it. The button closes the sheet again, and the
// results behind it are already up to date.
export default function FilterSheet({ activeCount = 0, summary, onClear, children }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

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
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-amber-400 text-gray-900 shadow-lg shadow-black/50 flex items-center justify-center active:scale-95 transition-transform">
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
export function FilterPanel({ activeCount, onClear, summary, children }) {
  const phone = useMediaQuery('(max-width: 1023px)')
  if (phone) return <FilterSheet activeCount={activeCount} onClear={onClear} summary={summary}>{children}</FilterSheet>
  return <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">{children}</div>
}
