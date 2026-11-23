import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import ArticleCard, { SOURCE_NAMES } from '../components/ArticleCard'
import { FilterPanel } from '../components/FilterSheet'
import { LANG_CANONICAL, LANG_FLAG, LANG_NAME } from '../utils/languages'
import { getSettings } from '../utils/settings'
import { useSearchShortcut, searchShortcutLabel } from '../utils/useSearchShortcut'

const PAGE_SIZE = 48

// YYYY-MM-DD of a Date in the visitor's own time zone (toISOString would be UTC).
function localIso(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const RANGES = [
  { label: 'Last week', back: d => d.setDate(d.getDate() - 7) },
  { label: 'Last month', back: d => d.setMonth(d.getMonth() - 1) },
  { label: 'Last 3 months', back: d => d.setMonth(d.getMonth() - 3) },
]

// The language code of an article (the sources write it as "ENG", "ITA"...)
const languageOf = a => a.language && (LANG_CANONICAL[a.language] ?? LANG_CANONICAL[a.language.toLowerCase()])

const inputClass = 'bg-gray-900 border border-gray-600 rounded-lg px-3 py-1 text-sm text-gray-300 hover:border-gray-400 focus:outline-none focus:border-amber-400'

export default function ArticlesIndex() {
  const [articles, setArticles] = useState(null)
  const [search, setSearch] = useState('')
  // the date chip picked (its label), or none for any date
  const [range, setRange] = useState('')
  // the languages picked (none: all)
  const [languages, setLanguages] = useState(() => new Set())
  const [author, setAuthor] = useState('')
  const [source, setSource] = useState('')
  const [shown, setShown] = useState(PAGE_SIZE)
  const searchRef = useSearchShortcut()

  useEffect(() => {
    fetch('/data/articles.json').then(r => r.json()).then(data => {
      // starts with the languages picked in the Settings, those the articles are in (none: all of them)
      const present = new Set(data.map(languageOf).filter(Boolean))
      setLanguages(new Set(getSettings().content.languages.filter(l => present.has(l))))
      setArticles(data)
    }).catch(() => setArticles([]))
  }, [])

  // the authors, most published first, and the sources
  const { authors, sources, languageOptions } = useMemo(() => {
    const byAuthor = new Map()
    const bySource = new Map()
    const byLanguage = new Map()
    for (const a of articles || []) {
      const l = languageOf(a)
      if (l) byLanguage.set(l, (byLanguage.get(l) || 0) + 1)
      byAuthor.set(a.author, (byAuthor.get(a.author) || 0) + 1)
      bySource.set(a.source, (bySource.get(a.source) || 0) + 1)
    }
    return {
      languageOptions: [...byLanguage].sort((x, y) => y[1] - x[1]),
      sources: [...bySource].sort((x, y) => y[1] - x[1]),
      authors: [...byAuthor].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])),
    }
  }, [articles])

  // the first day of the date chip picked
  const from = useMemo(() => {
    const r = RANGES.find(x => x.label === range)
    if (!r) return ''
    const d = new Date()
    r.back(d)
    return localIso(d)
  }, [range])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (articles || []).filter(a => {
      if (from && a.date < from) return false
      if (author && a.author !== author) return false
      if (languages.size > 0 && !languages.has(languageOf(a))) return false
      if (source && a.source !== source) return false
      return !q || [a.title, a.author, a.summary, ...(a.tags || [])].some(t => t && t.toLowerCase().includes(q))
    })
  }, [articles, search, from, languages, author, source])

  // a new set of results starts from the first page again
  useEffect(() => { setShown(PAGE_SIZE) }, [search, from, languages, author, source])

  const clearFilters = () => { setSearch(''); setRange(''); setLanguages(new Set()); setAuthor(''); setSource('') }
  const activeCount = (search ? 1 : 0) + (range ? 1 : 0) + (languages.size ? 1 : 0) + (author ? 1 : 0) + (source ? 1 : 0)
  const count = `${filtered.length.toLocaleString()} article${filtered.length === 1 ? '' : 's'}`

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Articles</h1>
          <p className="mt-2 text-gray-400 text-sm">
            Pauper articles from around the web: deck techs, sideboard guides, set reviews and more.
            For the classic strategy writing that applies to any format, see <Link to="/theory" className="text-amber-400 hover:underline">Theory</Link>.
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
            <span className="text-sm text-gray-500 w-20 shrink-0">Date:</span>
            {RANGES.map(({ label }) => (
              <button key={label} onClick={() => setRange(r => (r === label ? '' : label))} aria-pressed={range === label}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${range === label
                  ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                  : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 w-20 shrink-0">Language:</span>
            {languageOptions.map(([code, n]) => {
              const on = languages.has(code)
              return (
                <button key={code} aria-pressed={on}
                  onClick={() => setLanguages(cur => { const next = new Set(cur); next.has(code) ? next.delete(code) : next.add(code); return next })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${on
                    ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                    : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}>
                  {LANG_FLAG[code]} {LANG_NAME[code] || code} <span className="text-gray-500">{n}</span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="article-author" className="text-sm text-gray-500 w-20 shrink-0">Author:</label>
            <select id="article-author" value={author} onChange={e => setAuthor(e.target.value)} className={`${inputClass} max-w-full`}>
              <option value="">All authors</option>
              {authors.map(([name, n]) => <option key={name} value={name}>{name} ({n})</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="article-source" className="text-sm text-gray-500 w-20 shrink-0">Source:</label>
            <select id="article-source" value={source} onChange={e => setSource(e.target.value)} className={`${inputClass} max-w-full`}>
              <option value="">All sources</option>
              {sources.map(([key, n]) => <option key={key} value={key}>{SOURCE_NAMES[key] || key} ({n})</option>)}
            </select>
          </div>
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
