import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { FilterPanel } from '../components/FilterSheet'
import { useSearchShortcut, searchShortcutLabel } from '../utils/useSearchShortcut'

const THEORY_COLOR = '#8b7bd8'

// the two labels the articles carry besides their topic
const COLLECTIONS = [
  { label: 'Foundational Theory', hint: 'the ideas the rest of Magic theory builds on' },
  { label: 'Must-read', hint: 'picked out as essential reading' },
]

const inputClass = 'bg-gray-900 border border-gray-600 rounded-lg px-3 py-1 text-sm text-gray-300 hover:border-gray-400 focus:outline-none focus:border-amber-400'

// The topic of an article: its tags that aren't one of the two labels
const topicOf = a => (a.tags || []).find(t => !COLLECTIONS.some(c => c.label === t))
const isArchived = a => a.link.includes('web.archive.org')

function TheoryCard({ article: a }) {
  const topic = topicOf(a)
  const labels = (a.tags || []).filter(t => COLLECTIONS.some(c => c.label === t))
  return (
    <a href={a.link} target="_blank" rel="noopener noreferrer"
      className="relative flex flex-col gap-1.5 pl-5 pr-4 py-3.5 rounded-xl border border-gray-700 bg-gray-800 overflow-hidden hover:border-amber-400/40 transition-colors group">
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: THEORY_COLOR }} />
      <div className="flex flex-wrap items-center gap-1.5">
        {labels.map(l => (
          <span key={l} className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: THEORY_COLOR, background: `${THEORY_COLOR}26` }}>{l}</span>
        ))}
        {topic && <span className="text-xs text-gray-500">{topic}</span>}
      </div>
      <div className="text-base font-semibold text-white group-hover:text-amber-400 transition-colors leading-snug">{a.title}</div>
      <div className="text-sm text-gray-400">
        by {a.author}{a.date && <span className="text-gray-500"> · {a.date.slice(0, 4)}</span>}
        {isArchived(a) && <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-700 text-[10px] uppercase tracking-wider text-gray-300" title="The original page is gone: this opens a copy in the Internet Archive">Archived</span>}
      </div>
      {a.summary && <p className="text-sm text-gray-500 line-clamp-3">{a.summary}</p>}
    </a>
  )
}

export default function TheoryIndex() {
  const [articles, setArticles] = useState(null)
  const [search, setSearch] = useState('')
  const [collection, setCollection] = useState('')
  const [topic, setTopic] = useState('')
  const searchRef = useSearchShortcut()

  useEffect(() => {
    fetch('/data/theory.json').then(r => r.json()).then(setArticles).catch(() => setArticles([]))
  }, [])

  // the topics, the most written about first
  const topics = useMemo(() => {
    const by = new Map()
    for (const a of articles || []) {
      const t = topicOf(a)
      if (t) by.set(t, (by.get(t) || 0) + 1)
    }
    return [...by].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
  }, [articles])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (articles || []).filter(a => {
      if (collection && !(a.tags || []).includes(collection)) return false
      if (topic && topicOf(a) !== topic) return false
      return !q || [a.title, a.author, a.summary, ...(a.tags || [])].some(t => t && t.toLowerCase().includes(q))
    })
  }, [articles, search, collection, topic])

  const clearFilters = () => { setSearch(''); setCollection(''); setTopic('') }
  const activeCount = (search ? 1 : 0) + (collection ? 1 : 0) + (topic ? 1 : 0)
  const count = `${filtered.length} article${filtered.length === 1 ? '' : 's'}`

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Theory</h1>
          <p className="mt-2 text-gray-400 text-sm">
            The classic Magic strategy writing, from Who's the Beatdown? to the Metagame Clock: how to
            choose a role, count tempo and card advantage, build and metagame. It isn't about Pauper,
            but it applies to it all the same. Oldest first, so that you can follow the ideas as they
            built on each other. Looking for Pauper articles? See <Link to="/articles" className="text-amber-400 hover:underline">Articles</Link>.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Picked from the Magic Articles Masterdoc by I_LOVE_AZORIUS. Many of the originals are gone,
            so some links open a copy in the Internet Archive.
          </p>
        </div>

        <FilterPanel activeCount={activeCount} onClear={clearFilters} summary={count}>
          <div className="relative">
            <input ref={searchRef} type="search" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
              placeholder={`Search by title, author or topic… (${searchShortcutLabel})`}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 [&::-webkit-search-cancel-button]:hidden" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label="Clear search">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 w-20 shrink-0">Label:</span>
            {COLLECTIONS.map(({ label, hint }) => (
              <button key={label} title={hint} aria-pressed={collection === label}
                onClick={() => setCollection(c => (c === label ? '' : label))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${collection === label
                  ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                  : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="theory-topic" className="text-sm text-gray-500 w-20 shrink-0">Topic:</label>
            <select id="theory-topic" value={topic} onChange={e => setTopic(e.target.value)} className={`${inputClass} max-w-full`}>
              <option value="">All topics</option>
              {topics.map(([name, n]) => <option key={name} value={name}>{name} ({n})</option>)}
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
                {filtered.map(a => <TheoryCard key={a.link} article={a} />)}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
