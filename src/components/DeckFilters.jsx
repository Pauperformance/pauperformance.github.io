// The pieces of a decks list shared by the archetype and metagame pages.

const INPUT = 'w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400'

// A search box with a button clearing it.
export function SearchInput({ value, onChange, onClear, placeholder }) {
  return (
    <div className="relative">
      <input type="search" placeholder={placeholder} value={value} onChange={onChange}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
        className={`${INPUT} pr-8 [&::-webkit-search-cancel-button]:hidden`} />
      {value && (
        <button onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label="Clear search">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  )
}

export function SelectInput({ value, onChange, children }) {
  return <select value={value} onChange={onChange} className={INPUT}>{children}</select>
}

const PAGER_BUTTON = 'px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

// Previous / Next buttons over the pages (0-based page) of a list.
export function Pager({ page, totalPages, onPage, innerRef }) {
  if (totalPages <= 1) return null
  return (
    <div ref={innerRef} className="flex items-center justify-center gap-3">
      <button onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0} className={PAGER_BUTTON}>← Previous</button>
      <span className="text-sm text-gray-400">Page {page + 1} of {totalPages}</span>
      <button onClick={() => onPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1} className={PAGER_BUTTON}>Next →</button>
    </div>
  )
}
