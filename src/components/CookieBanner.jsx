import { useState } from 'react'

const KEY = 'cookie-consent'

function readChoice() {
  try { return localStorage.getItem(KEY) } catch { return null }
}

function choose(value) {
  try { localStorage.setItem(KEY, value) } catch { /* private mode: choice lasts for this page only */ }
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', { analytics_storage: value })
  }
}

// Asks once whether Google Analytics may set cookies. The tag in index.html
// starts with analytics_storage denied (Consent Mode v2) and is switched on here.
export default function CookieBanner() {
  const [choice, setChoice] = useState(readChoice)
  if (choice) return null

  const pick = (value) => { choose(value); setChoice(value) }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-lg border border-gray-600 bg-gray-800 p-4 shadow-2xl md:w-max md:max-w-full md:flex md:items-center md:gap-5"
    >
      <p className="text-sm text-gray-200">
        We use cookies to count visits and see which pages are useful.
        They are only set if you accept.
      </p>
      <div className="mt-3 flex shrink-0 justify-end gap-2 md:mt-0">
        <button
          type="button"
          onClick={() => pick('denied')}
          className="rounded border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => pick('granted')}
          className="rounded bg-amber-400 px-3 py-1.5 text-sm font-semibold text-gray-950 hover:bg-amber-200"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
