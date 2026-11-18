import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSettings } from '../utils/settings'
import { registerPreviewCard } from '../utils/videoPreviews'
import { probeLive, knownLive, isProbeable } from '../utils/liveProbe'
import { nameToSlug } from '../utils/slugs'
import { formatShortDate } from '../utils/dates'
import { Avatar } from './LiveStreams'
import { creatorAvatars } from '../utils/creatorAvatars'
import { LANG_FLAG, LANG_CANONICAL, LANG_NAME } from '../utils/languages'

// How long the mouse rests on a thumbnail before its preview starts, and how
// long a preview plays at most
const PREVIEW_HOVER_MS = 200
const PREVIEW_MAX_MS = 15000

// The embedded player, muted and without controls, from the beginning of the video
function previewUrl(v) {
  const params = new URLSearchParams({
    autoplay: '1', mute: '1', controls: '0', playsinline: '1', disablekb: '1', fs: '0',
    modestbranding: '1', rel: '0', iv_load_policy: '3',
    loop: '1', playlist: v.video_id,
  })
  return `https://www.youtube.com/embed/${v.video_id}?${params}`
}

// A live stream's state: 'live', 'offline' or 'unknown' (null for what isn't one, and
// while it is being checked). Only recent ones are checked (utils/liveProbe.js).
function useLiveStatus(v) {
  const probed = isProbeable(v)
  const [status, setStatus] = useState(() => (probed ? knownLive(v.video_id) : null))
  useEffect(() => {
    if (!probed) return
    let alive = true
    probeLive(v.video_id).then(s => { if (alive) setStatus(s) })
    return () => { alive = false }
  }, [probed, v.video_id])
  return status
}

// The creator's picture, when the card shows it (null otherwise, and until it is known)
function useCreatorAvatar(name, enabled) {
  const [avatar, setAvatar] = useState(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    creatorAvatars().then(avatars => { if (alive) setAvatar(avatars[name] || null) })
    return () => { alive = false }
  }, [name, enabled])
  return avatar
}

// A video: its player, title, creator, language, archetype (unless
// showArchetype is false, on the archetype's own page), decklist and date.
// A podcast never shows the archetype or the decklist: it isn't about one deck.
// previews: whether the video previews on hover (see below); the visitor's
// settings when not given. withAvatar: the creator's picture beside their name.
export default function VideoCard({ v, showArchetype = true, previews, withAvatar = false }) {
  const [playing, setPlaying] = useState(false)
  const containerRef = useRef(null)
  const liveStatus = useLiveStatus(v)
  const avatar = useCreatorAvatar(v.creator_name, withAvatar)

  // The preview: the video playing muted over its thumbnail, without pressing play.
  // On hover (after a short rest of the mouse) on desktop; on touch screens for the
  // card in the middle of the screen (utils/videoPreviews.js). Off when `previews`
  // is false (the visitor's settings when the page doesn't say), with reduced
  // motion, or with Save-Data.
  const [previewing, setPreviewing] = useState(false)
  const [previewReady, setPreviewReady] = useState(false)
  const [capable] = useState(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
    if (navigator.connection && navigator.connection.saveData) return null
    return window.matchMedia('(hover: none)').matches ? 'touch' : 'hover'
  })
  const [fromSettings] = useState(() => getSettings().videos.previews)
  const mode = (previews === undefined ? fromSettings : previews) ? capable : null
  const hoverTimer = useRef(null)

  // switched off while a preview plays
  useEffect(() => { if (!mode) setPreviewing(false) }, [mode])

  useEffect(() => {
    if (mode !== 'touch' || playing) return
    return registerPreviewCard(containerRef.current, setPreviewing)
  }, [mode, playing])

  // a preview doesn't go on for ever: back to the thumbnail after a while
  useEffect(() => {
    if (!previewing) { setPreviewReady(false); return }
    const t = setTimeout(() => setPreviewing(false), PREVIEW_MAX_MS)
    return () => clearTimeout(t)
  }, [previewing])

  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  const onEnter = () => {
    if (mode !== 'hover' || playing) return
    hoverTimer.current = setTimeout(() => setPreviewing(true), PREVIEW_HOVER_MS)
  }
  const onLeave = () => {
    clearTimeout(hoverTimer.current)
    if (mode === 'hover') setPreviewing(false)
  }

  function handlePlay() {
    setPreviewing(false)
    setPlaying(true)
    if (containerRef.current && containerRef.current.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {})
    }
  }

  return (
    <div className="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-amber-400/50 transition-all flex flex-col">
      <div ref={containerRef} onMouseEnter={onEnter} onMouseLeave={onLeave} className="relative aspect-video bg-gray-900 overflow-hidden">
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
        {v.is_live === true && (
          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold pointer-events-none ${
            liveStatus === 'live' ? 'bg-red-600 text-white' : 'bg-black/70 text-gray-200'}`}>
            {liveStatus === 'live' ? '● LIVE NOW' : liveStatus === 'offline' ? 'Live stream ended' : 'Live stream'}
          </span>
        )}
        {/* the preview, above the thumbnail but not catching the clicks: they still play the video */}
        {previewing && !playing && (
          <iframe
            src={previewUrl(v)}
            title=""
            aria-hidden="true"
            tabIndex={-1}
            allow="autoplay; encrypted-media"
            onLoad={() => setPreviewReady(true)}
            className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300 ${previewReady ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <a href={v.link} target="_blank" rel="noreferrer"
          className="text-sm font-medium text-gray-200 hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
          {v.title}
        </a>
        {withAvatar && v.creator_name ? (
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <Avatar src={avatar} name={v.creator_name} className="h-5 w-5 shrink-0 text-[10px]" />
            <span className="truncate">{v.creator_name}</span>
          </p>
        ) : (
          <p className="text-xs text-gray-400">{v.creator_name}</p>
        )}
        <div className="mt-auto pt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-gray-300 bg-gray-700 shrink-0">
              <span className="text-base leading-none">{LANG_FLAG[v.language] ?? v.language}</span>
              {LANG_NAME[LANG_CANONICAL[v.language]]}
            </span>
            {showArchetype && !v.is_podcast && (
              <Link
                to={`/archetypes/${nameToSlug(v.archetype)}`}
                className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-700 text-amber-400 hover:bg-gray-600 transition-colors truncate">
                {v.archetype}
              </Link>
            )}
            {v.deck_url && !v.is_podcast && (
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
