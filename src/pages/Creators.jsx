import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useSearchShortcut, searchShortcutLabel } from '../utils/useSearchShortcut'
import { TWITCH_ICON, YOUTUBE_ICON, METAFY_ICON } from '../utils/socialIcons'

const PLAYER_ICON = 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'

function SocialLink({ href, icon, label, color }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded transition-colors ${color}`}
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-current">
        <path d={icon} />
      </svg>
      {label}
    </a>
  )
}

// The creator's picture: their Twitch profile picture, else their YouTube
// channel's (fetched when the site is built), else their initial
function CreatorAvatar({ creator }) {
  const src = creator.twitch_avatar_url || creator.youtube_avatar_url
  // a picture that fails to load (or none) gives way to the initial
  const [failed, setFailed] = useState(null)
  return src && failed !== src
    // no referrer: some of YouTube's picture addresses refuse the ones of other sites
    ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(src)}
        className="h-10 w-10 shrink-0 rounded-full bg-gray-900 object-cover" />
    : <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-gray-300">
        {creator.name.slice(0, 1).toUpperCase()}
      </span>
}

function CreatorCard({ creator }) {
  const mtgoEntries = [
    { name: creator.mtgo_name, slug: creator.player_slug },
    { name: creator.mtgo_name2, slug: creator.player_slug2 },
  ].filter(e => e.name)

  return (
    <div className="min-w-0 bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col gap-3 hover:border-gray-500 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <CreatorAvatar creator={creator} />
        <div className="font-semibold text-amber-400 text-sm leading-tight break-words min-w-0">{creator.name}</div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {creator.youtube_channel_url && (
          <SocialLink
            href={creator.youtube_channel_url}
            icon={YOUTUBE_ICON}
            label="YouTube"
            color="bg-red-900/40 text-red-300 hover:bg-red-800/60"
          />
        )}
        {creator.twitch_channel_url && (
          <SocialLink
            href={creator.twitch_channel_url}
            icon={TWITCH_ICON}
            label="Twitch"
            color="bg-purple-900/40 text-purple-300 hover:bg-purple-800/60"
          />
        )}
        {creator.metafy_url && (
          <SocialLink
            href={creator.metafy_url}
            icon={METAFY_ICON}
            label="Metafy"
            color="bg-sky-900/40 text-sky-300 hover:bg-sky-800/60"
          />
        )}
      </div>

      {mtgoEntries.length > 0 && (
        <div className="flex flex-col gap-1">
          {mtgoEntries.map(({ name: n, slug }) => (
            <span key={n} className="flex items-center gap-1 text-xs min-w-0">
              <span className="text-gray-500 font-medium shrink-0">MTGO:</span>
              <span className="text-gray-400 bg-gray-750 px-2 py-0.5 rounded">{n}</span>
              {slug && (
                <Link
                  to={`/players/${slug}`}
                  title="Players"
                  className="flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded transition-colors bg-amber-950/60 text-amber-400 hover:bg-amber-900/60 shrink-0"
                >
                  <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0 fill-current">
                    <path d={PLAYER_ICON} />
                  </svg>
                  <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7M7 7h10v10"/>
                  </svg>
                </Link>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Creators() {
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useSearchShortcut()

  useEffect(() => {
    fetch('/data/creators.json')
      .then(r => r.json())
      .then(data => { setCreators(data); setLoading(false) })
  }, [])

  const filtered = search
    ? creators.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.mtgo_name && c.mtgo_name.toLowerCase().includes(search.toLowerCase())) ||
        (c.mtgo_name2 && c.mtgo_name2.toLowerCase().includes(search.toLowerCase()))
      )
    : creators

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Creators Index</h1>
          <p className="mt-2 text-gray-400 text-sm">
            {creators.length} content creators in the Pauper community
          </p>
        </div>

        <div className="relative">
          <input
            ref={searchRef}
            type="search"
            placeholder={`Search by name or MTGO username… (${searchShortcutLabel})`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 pr-8 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label="Clear search">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-sm">No creators found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filtered.map(c => <CreatorCard key={c.name} creator={c} />)}
          </div>
        )}
      </div>
    </Layout>
  )
}
