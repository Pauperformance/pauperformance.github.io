import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { nameToSlug } from '../utils/slugs'
import { formatShortDate } from '../utils/dates'
import { LANG_FLAG, LANG_CANONICAL, LANG_NAME } from '../utils/languages'

// A video: its player, title, creator, language, archetype (unless
// showArchetype is false, on the archetype's own page), decklist and date.
export default function VideoCard({ v, showArchetype = true }) {
  const [playing, setPlaying] = useState(false)
  const containerRef = useRef(null)

  function handlePlay() {
    setPlaying(true)
    if (containerRef.current && containerRef.current.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {})
    }
  }

  return (
    <div className="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-amber-400/50 transition-all flex flex-col">
      <div ref={containerRef} className="relative aspect-video bg-gray-900 overflow-hidden">
        {playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${v.video_id}?autoplay=1`}
            title={v.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          />
        ) : (
          <button onClick={handlePlay} className="relative w-full h-full block">
            <img
              src={`https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`}
              alt={v.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center group-hover:bg-amber-400/90 transition-colors">
                <svg className="w-9 h-9 text-white fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M5 4.623V19.38a1.5 1.5 0 002.26 1.29L22 12 7.26 3.33A1.5 1.5 0 005 4.623Z" />
                </svg>
              </div>
            </div>
          </button>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <a href={v.link} target="_blank" rel="noreferrer"
          className="text-sm font-medium text-gray-200 hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
          {v.title}
        </a>
        <p className="text-xs text-gray-400">{v.creator_name}</p>
        <div className="mt-auto pt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-gray-300 bg-gray-700 shrink-0">
              <span className="text-base leading-none">{LANG_FLAG[v.language] ?? v.language}</span>
              {LANG_NAME[LANG_CANONICAL[v.language]]}
            </span>
            {showArchetype && (
              <Link
                to={`/archetypes/${nameToSlug(v.archetype)}`}
                className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-700 text-amber-400 hover:bg-gray-600 transition-colors truncate">
                {v.archetype}
              </Link>
            )}
            {v.deck_url && (
              <a href={v.deck_url} target="_blank" rel="noreferrer" title="Decklist"
                className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-700 text-amber-400 hover:bg-gray-600 transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12h-5M15 8h-5M19 17V5a2 2 0 0 0-2-2H4M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/></svg>
                Deck
              </a>
            )}
          </div>
          <span className="text-xs text-gray-500 shrink-0">{formatShortDate(v.date)}</span>
        </div>
      </div>
    </div>
  )
}
