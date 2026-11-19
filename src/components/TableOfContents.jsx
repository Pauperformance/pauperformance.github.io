// Scrolls to a section of the page, clear of the sticky header.
function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  const headerHeight = document.querySelector('header')?.offsetHeight ?? 64
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - headerHeight - 8, behavior: 'smooth' })
}

// The page's table of contents: sections: [{ id, label, count }].
export default function TableOfContents({ sections }) {
  return (
    <nav aria-label="On this page" className="bg-gray-800 border border-gray-700 rounded-xl p-4 md:w-60 shrink-0">
      <p className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">On this page</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 md:flex-col">
        {sections.map(({ id, label, count }) => (
          <li key={id}>
            <a href={`#${id}`} onClick={e => { e.preventDefault(); scrollToSection(id) }}
              className="text-sm text-gray-300 hover:text-amber-400 transition-colors">
              {label}
              {count != null && <span className="ml-1.5 text-xs text-gray-500 tabular-nums">{count.toLocaleString('en-US')}</span>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
