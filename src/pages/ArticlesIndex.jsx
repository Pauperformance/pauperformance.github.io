import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import ArticleCard from '../components/ArticleCard'
import { FilterPanel } from '../components/FilterSheet'
import { useSearchShortcut, searchShortcutLabel } from '../utils/useSearchShortcut'

const PAGE_SIZE = 48

// The tags every article has, or that say nothing about its subject
const PLAIN_TAGS = new Set(['mtg', 'magic: the gathering', 'pauper'])
// A tag becomes a filter once this many articles carry it
const MIN_TAG_ARTICLES = 10

// YYYY-MM-DD of a Date in the visitor's own time zone (toISOString would be UTC).
function localIso(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const RANGES = [
  { label: 'Last month', back: d => d.setMonth(d.getMonth() - 1) },
  { label: 'Last 3 months', back: d => d.setMonth(d.getMonth() - 3) },
  { label: 'Last year', back: d => d.setFullYear(d.getFullYear() - 1) },
]

const inputClass = 'bg-gray-900 border border-gray-600 rounded-lg px-3 py-1 text-sm text-gray-300 hover:border-gray-400 focus:outline-none focus:border-amber-400'

// The tags of an article, lowercased ("Deck" and "deck" are one), without the plain ones
function topics(article) {
  return [...new Set((article.tags || []).map(t => t.trim().toLowerCase()))].filter(t => t && !PLAIN_TAGS.has(t))
}

export default function ArticlesIndex() {
  const [articles, setArticles] = useState(null)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [author, setAuthor] = useState('')
  const [tags, setTags] = useState([])
  const [shown, setShown] = useState(PAGE_SIZE)
  const searchRef = useSearchShortcut()

  useEffect(() => {
    fetch('/data/articles.json').then(r => r.json()).then(setArticles).catch(() => setArticles([]))
  }, [])

  // the authors, most published first, and the most common tags
  const { authors, tagOptions } = useMemo(() => {
    const byAuthor = new Map()
    const byTag = new Map()
    for (const a of articles || []) {
      byAuthor.set(a.author, (byAuthor.get(a.author) || 0) + 1)
      for (const t of topics(a)) byTag.set(t, (byTag.get(t) || 0) + 1)
    }
    return {
      authors: [...byAuthor].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])),
      tagOptions: [...byTag].filter(([, n]) => n >= MIN_TAG_ARTICLES).sort((x, y) => y[1] - x[1]),
    }
  }, [articles])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (articles || []).filter(a => {
      if (from && a.date < from) return false
      if (to && a.date > to) return false
      if (author && a.author !== author) return false
      if (tags.length && !topics(a).some(t => tags.includes(t))) return false
      return !q || [a.title, a.author, a.summary, ...(a.tags || [])].some(t => t && t.toLowerCase().includes(q))
    })
  }, [articles, search, from, to, author, tags])

  // a new set of results starts from the first page again
  useEffect(() => { setShown(PAGE_SIZE) }, [search, from, to, author, tags])

  const applyRange = back => {
    const d = new Date()
    back(d)
    setFrom(localIso(d))
    setTo('')
  }
  const toggleTag = t => setTags(cur => (cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]))
  const clearFilters = () => { setSearch(''); setFrom(''); setTo(''); setAuthor(''); setTags([]) }
  const activeCount = (search ? 1 : 0) + (from || to ? 1 : 0) + (author ? 1 : 0) + (tags.length ? 1 : 0)
  const count = `${filtered.length.toLocaleString()} article${filtered.length === 1 ? '' : 's'}`

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Articles</h1>
          <p className="mt-2 text-gray-400 text-sm">
            Pauper articles from around the web: deck techs, sideboard guides, set reviews and more.
          </p>
        </div>

        <FilterPanel activeCount={activeCount} onClear={clearFilters} summary={count}>
          <div className="relative">
            <input ref={searchRef} type="search" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
              placeholder={`Search articles by title, author or tag… (${searchShortcutLabel})`}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 [&::-webkit-search-cancel-button]:hidden" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label="Clear search">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 w-14 shrink-0">Date:</span>
            <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)}
              aria-label="From date" className={inputClass} />
            <span className="text-gray-500 text-sm">to</span>
            <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)}
              aria-label="To date" className={inputClass} />
            {RANGES.map(({ label, back }) => (
              <button key={label} onClick={() => applyRange(back)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="article-author" className="text-sm text-gray-500 w-14 shrink-0">Author:</label>
            <select id="article-author" value={author} onChange={e => setAuthor(e.target.value)} className={`${inputClass} max-w-full`}>
              <option value="">All authors</option>
              {authors.map(([name, n]) => <option key={name} value={name}>{name} ({n})</option>)}
            </select>
          </div>

          {tagOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500 w-14 shrink-0">Topic:</span>
              {tagOptions.map(([t, n]) => (
                <button key={t} onClick={() => toggleTag(t)} aria-pressed={tags.includes(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${tags.includes(t)
                    ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                    : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}>
                  {t} <span className="text-gray-500">{n}</span>
                </button>
              ))}
            </div>
          )}

          {activeCount > 0 && (
            <div className="flex">
              <button onClick={clearFilters} className="ml-auto text-xs text-gray-400 hover:text-amber-400 transition-colors">
                Clear filters
              </button>
            </div>
          )}
        </FilterPanel>

        {!articles ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading...</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">{count}</p>
            {filtered.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-12">No articles match your filters.</p>
            ) : (
              <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.slice(0, shown).map(a => <ArticleCard key={a.link} article={a} />)}
              </div>
            )}
            {shown < filtered.length && (
              <div className="flex justify-center">
                <button onClick={() => setShown(n => n + PAGE_SIZE)}
                  className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-sm text-gray-300 hover:border-amber-400/50 hover:text-amber-400 transition-colors">
                  Show more articles
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
