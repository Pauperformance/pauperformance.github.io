import { useState, useEffect } from 'react'
import Layout from '../components/Layout'

const TWITCH_ICON = 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z'
const YOUTUBE_ICON = 'M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z'

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

function CreatorCard({ creator }) {
  const mtgoNames = [creator.mtgo_name, creator.mtgo_name2].filter(Boolean)

  return (
    <div className="min-w-0 bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col gap-3 hover:border-gray-500 transition-colors">
      <div className="font-semibold text-amber-400 text-sm leading-tight break-words">{creator.name}</div>

      {mtgoNames.length > 0 && (
        <div className="flex flex-col gap-1">
          {mtgoNames.map(n => (
            <span key={n} className="flex items-center gap-1 text-xs min-w-0">
              <span className="text-gray-500 font-medium shrink-0">MTGO:</span>
              <span className="text-gray-400 bg-gray-750 px-2 py-0.5 rounded">{n}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-auto">
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
      </div>
    </div>
  )
}

export default function Creators() {
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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
          <h1 className="text-2xl font-bold text-white">Pauper Creators</h1>
          <p className="mt-2 text-gray-400 text-sm">
            {creators.length} content creators in the Pauper community
          </p>
        </div>

        <input
          type="search"
          placeholder="Search by name or MTGO username…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
        />

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
