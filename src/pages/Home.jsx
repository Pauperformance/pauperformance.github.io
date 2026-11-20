import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { computeTypicalList } from '../utils/typicalList'
import { nameToSlug, metagameSlug, pilotToSlug } from '../utils/slugs'
import { displayMana, manaSrc, manaLabel } from '../utils/mana'
import { cardLinkSlug, useCardPages } from '../utils/cardPages'
import { formatDate, formatShortDate } from '../utils/dates'
import { easeInOut, scrollGently } from '../utils/scroll'
import { useCardPreview } from '../components/CardPreview'
import { useImageFor } from '../utils/artwork'
import ShareChange from '../components/ShareChange'
import ArticleCard from '../components/ArticleCard'
import CalendarIcon from '../components/CalendarIcon'
import VideoCard from '../components/VideoCard'
import { LiveTile, YouTubeLiveTile, useLiveStreams, useLiveYouTube } from '../components/LiveStreams'
import { getSettings } from '../utils/settings'
import { useMediaQuery } from '../utils/useMediaQuery'
import { showsVideos, typeAllows } from '../utils/watchTypes'
import { LANG_CANONICAL, languageAllowed } from '../utils/languages'
import CardLink from '../components/PoolCardLink'
import SectionBar from '../components/SectionBar'
import MetaPie from '../components/MetaPie'
import { useSettings, updateSettings } from '../utils/settings'
import { TWITCH_ICON, YOUTUBE_ICON, METAFY_ICON } from '../utils/socialIcons'

function useCountUp(target, duration = 1600) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect() } },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started || !target) return
    let frame
    const startTime = performance.now()
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) frame = requestAnimationFrame(step)
      else setCount(target)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [started, target, duration])

  return { count, ref }
}

function StatCounter({ value, label }) {
  const { count, ref } = useCountUp(value)
  return (
    <div ref={ref} className="flex flex-col items-center gap-2 py-2">
      <span className="text-4xl sm:text-5xl font-bold text-amber-400 tabular-nums leading-none">
        {count.toLocaleString()}
      </span>
      <span className="text-xs sm:text-sm text-gray-400 uppercase tracking-widest text-center">{label}</span>
    </div>
  )
}

function StatsSection() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/data/archetypes.json').then(r => r.json()),
      fetch('/data/cards.json').then(r => r.json()),
      fetch('/data/pauper_pool.json').then(r => r.json()),
      fetch('/data/creators.json').then(r => r.json()),
      fetch('/data/stats.json').then(r => r.json()),
    ]).then(([archetypes, cards, sets, creators, statsData]) => {
      setStats({
        archetypes: archetypes.length,
        cards: cards.length,
        sets: sets.length,
        creators: creators.length,
        decks: statsData.classifiedDecks,
        videos: statsData.videos,
      })
    })
  }, [])

  if (!stats) return null

  return (
    <section id="stats" className="bg-gray-800 border border-gray-700 rounded-xl px-6 py-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 divide-y-0 sm:divide-x sm:divide-gray-700">
        <StatCounter value={stats.archetypes} label="Archetypes" />
        <StatCounter value={stats.cards} label="Common Cards" />
        <StatCounter value={stats.sets} label="Pauper Sets" />
        <StatCounter value={stats.decks} label="Classified Decks" />
        <StatCounter value={stats.creators} label="Content Creators" />
        <StatCounter value={stats.videos} label="Videos" />
      </div>
    </section>
  )
}

// A staple: links to its card page and previews it on hover (image and
// Oracle text); plain text for a card without a page.
function StapleLink({ card, cardPages, bindPreview }) {
  const slug = cardLinkSlug(cardPages, card.name)
  const imageFor = useImageFor()
  const handlers = bindPreview(card.name, { slug: slug || undefined, image: imageFor(card.name, card.preview) })
  const cls = 'px-2 py-0.5 rounded-md text-xs border bg-gray-800 border-gray-700 text-gray-300 whitespace-nowrap'
  return slug
    ? <Link to={`/cards/${slug}`} {...handlers} className={`${cls} hover:border-amber-400/50 hover:text-amber-400 transition-colors`}>{card.name}</Link>
    : <span {...handlers} className={cls}>{card.name}</span>
}

// The staples chips, wrapped over at most two rows: the chips that would start
// a third row are hidden (so also out of reach of the keyboard and the
// pointer). Measured, so it follows the width of the device.
const STAPLE_ROWS = 2
function StapleRows({ children }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      let row = 0
      let top = null
      for (const chip of el.children) {
        chip.style.visibility = ''
        if (top === null || chip.offsetTop > top) { row += 1; top = chip.offsetTop }
        if (row > STAPLE_ROWS) chip.style.visibility = 'hidden'
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    document.fonts?.ready.then(fit)
    return () => observer.disconnect()
  }, [children])

  return <div ref={ref} className="flex flex-wrap content-start gap-1 overflow-hidden h-12">{children}</div>
}

// The pie of the metagame goes in the empty cells at the end of the table's last row, where there are
// at least 3 of them (the grid has 2, 3, 4 and 5 columns on the screens it grows to); where there are
// fewer it takes a row of its own. The class names are written out for Tailwind to find them.
const PIE_SPAN = {
  base: { full: 'col-span-full', 3: 'col-span-3', 4: 'col-span-4' },
  sm: { full: 'sm:col-span-full', 3: 'sm:col-span-3', 4: 'sm:col-span-4' },
  md: { full: 'md:col-span-full', 3: 'md:col-span-3', 4: 'md:col-span-4' },
  lg: { full: 'lg:col-span-full', 3: 'lg:col-span-3', 4: 'lg:col-span-4' },
}
function pieSpanClasses(count) {
  return [['base', 2], ['sm', 3], ['md', 4], ['lg', 5]].map(([bp, columns]) => {
    const free = (columns - (count % columns)) % columns
    return PIE_SPAN[bp][free >= 3 ? free : 'full']
  }).join(' ')
}

function TopDecksSection() {
  const [decks, setDecks] = useState([])
  const cardPages = useCardPages()
  const imageFor = useImageFor()
  const { bind: bindPreview, preview } = useCardPreview({ sheet: true })

  useEffect(() => {
    fetch('/data/top_decks.json').then(r => r.json()).then(setDecks)
  }, [])

  if (!decks.length) return null

  return (
    <section>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {decks.map((deck, i) => (
          <div key={deck.archetype_name} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-amber-400/50 transition-all group">
            <Link to={`/archetypes/${nameToSlug(deck.archetype_name)}`} className="block">
              {/* as on the metagame's page: Scryfall's art crop (the artwork without its frame), up to the box's border */}
              <div className="relative aspect-[2/1] bg-gray-900 overflow-hidden">
                {deck.featured_image
                  ? <img src={imageFor(deck.featured_card, deck.featured_image).replace('/normal/', '/art_crop/')} alt={deck.archetype_name} loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  : <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs">No image</div>
                }
                {/* as on the metagame's page: the rank at the top left, the types at the top right */}
                <span className="absolute top-1.5 left-1.5 rounded-md bg-gray-900/85 px-1.5 py-0.5 text-xs font-bold font-mono text-gray-200">#{i + 1}</span>
                {deck.game_type.length > 0 && (
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    {deck.game_type.map(g => (
                      <span key={g} className="text-[10px] text-gray-100 bg-gray-900/85 rounded-md px-1.5 py-0.5 leading-none">{g}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-2.5 space-y-2">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-base font-semibold text-white leading-tight group-hover:text-amber-400 transition-colors line-clamp-2">{deck.archetype_name}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {displayMana(deck.dominant_mana).map(m => (
                      <img key={m} src={manaSrc(m)} alt={manaLabel(m)} className="w-3.5 h-3.5" />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400 font-mono">Meta: {deck.meta_share.toFixed(1)}%</span>
                  <ShareChange share={deck.meta_share} previous={deck.previous_share} debut={deck.debut} size="text-[11px]" />
                </div>
              </div>
            </Link>
            {deck.staples.length > 0 && (
              <div className="px-2.5 pb-2.5 flex flex-col gap-1 items-start">
                {deck.staples.slice(0, 5).map(card => (
                  <StapleLink key={card.name} card={card} cardPages={cardPages} bindPreview={bindPreview} />
                ))}
              </div>
            )}
          </div>
        ))}
        <div className={`${pieSpanClasses(decks.length)} min-w-0`}>
          <MetagameSection embedded />
        </div>
      </div>
      {preview}
    </section>
  )
}

function ManaSymbols({ mana, className }) {
  return (
    <div className={`${className} shrink-0 items-center gap-0.5`}>
      {displayMana(mana).map(m => <img key={m} src={manaSrc(m)} alt={manaLabel(m)} className="w-4 h-4" />)}
    </div>
  )
}

// The Brainstorm art split in two layers: the character stays put and the 16
// glyphs orbit her, one per top archetype. Sprite i is rank i: the largest
// glyph first, then its neighbours in the (mirrored) painting. Each next rank
// sits to the right of the front, so stepping through the ranks turns the
// ring clockwise.
const GLYPHS = 16
const STEP = (2 * Math.PI) / GLYPHS
// Ring geometry, as a fraction of the 1407×1118 painting
const RING = { cx: 0.505, cy: 0.493, rx: 0.45, ry: 0.383 }
const SPRITE = 200 / 1407
// Her headdress, cut out of the painting and drawn over the back of the ring
// so glyphs passing behind her head are hidden by it
const HEADDRESS = { left: 300 / 1407, width: 850 / 1407 }
const HEADDRESS_Z = 30

// Horizontal wheel feel: how long the ring takes to glide after the wheel
// while scrolling and while snapping (ms), how much scroll turns it by one
// archetype (px), and how long the wheel must pause before it snaps (ms)
const WHEEL_GLIDE_MS = 150
const WHEEL_SNAP_GLIDE_MS = 300
const WHEEL_PX_PER_GLYPH = 350
const WHEEL_SETTLE_MS = 350

const wrap = (i) => ((i % GLYPHS) + GLYPHS) % GLYPHS

// The hint wiggle: how far the ring rocks (in glyphs), how many full
// right-left swings, and how long it lasts (ms)
const WIGGLE = { amplitude: 0.3, swings: 2, duration: 3000 }

// The archetype boxes' tape: how far (degrees) the drum it's wound on turns
// from one box to the next, so the smaller the flatter, and how many box
// widths away it's seen from
const TAPE = { step: 30, perspective: 3 }

// A flick on the archetype box carries the tape on for as long as BOX_FLICK_MS
// at the flick's speed, but at most BOX_FLICK_MAX archetypes
const BOX_FLICK_MS = 150
const BOX_FLICK_MAX = 1

// Phones: short tabs centred on the card; wider: as tall as the card
const RING_ARROW = 'shrink-0 self-center h-20 w-7 rounded-lg text-2xl sm:self-stretch sm:h-auto sm:w-12 sm:rounded-xl sm:text-3xl flex items-center justify-center border border-gray-700 bg-gray-800 leading-none text-gray-400 hover:border-amber-400/50 hover:text-amber-400 transition-colors'

function BrainstormSection() {
  const [decks, setDecks] = useState([])
  const [rot, setRot] = useState(0)
  const rotRef = useRef(0)
  const targetRef = useRef(0)
  const frameRef = useRef(null)
  const dragRef = useRef(null)
  const draggedRef = useRef(false)
  const introRef = useRef(false)
  const interactedRef = useRef(false)
  const wheelingRef = useRef(false)
  const sceneRef = useRef(null)
  const boxRef = useRef(null)
  const [boxWidth, setBoxWidth] = useState(0)
  const cardPages = useCardPages()
  const imageFor = useImageFor()
  const { bind: bindPreview, preview } = useCardPreview({ sheet: true })

  useEffect(() => {
    fetch('/data/top_decks.json').then(r => r.json()).then(d => setDecks(d.slice(0, GLYPHS)))
  }, [])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  // The tape's drum is sized to the box
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(() => setBoxWidth(box.offsetWidth))
    observer.observe(box)
    return () => observer.disconnect()
  }, [decks.length])

  const setNow = (value) => {
    rotRef.current = value
    setRot(value)
  }

  // Turn the ring to the target angle, taking longer the further it goes.
  // Clicks and keys ease in and out; a released drag is already moving, so it
  // only eases out.
  const animateTo = (target, { fromDrag = false } = {}) => {
    targetRef.current = target
    cancelAnimationFrame(frameRef.current)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setNow(target)
    const from = rotRef.current
    const distance = target - from
    const duration = 350 + 160 * Math.abs(distance)
    const ease = fromDrag
      ? (t) => 1 - Math.pow(1 - t, 3)
      : easeInOut
    const start = performance.now()
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      setNow(from + distance * ease(t))
      if (t < 1) frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
  }

  // The ring rocks right and left in place, each swing smaller than the last,
  // as a hint that it can be turned
  const playWiggle = () => {
    introRef.current = true
    const start = performance.now()
    const frame = (now) => {
      if (!introRef.current) return
      const t = Math.min((now - start) / WIGGLE.duration, 1)
      // negative first: the front glyph sets off to the right
      setNow(-WIGGLE.amplitude * Math.sin(2 * Math.PI * WIGGLE.swings * t) * (1 - t))
      if (t < 1) frameRef.current = requestAnimationFrame(frame)
      else introRef.current = false
    }
    frameRef.current = requestAnimationFrame(frame)
  }

  // The wiggle plays the first time the ring comes into view
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      if (!interactedRef.current) playWiggle()
    }, { threshold: 0.5 })
    observer.observe(scene)
    return () => observer.disconnect()
  }, [decks.length])

  // Any interaction cancels the wiggle where it is
  const interrupt = () => {
    interactedRef.current = true
    if (!introRef.current) return
    introRef.current = false
    cancelAnimationFrame(frameRef.current)
    targetRef.current = Math.round(rotRef.current)
  }

  // Bring deck i to the front the short way round
  const focus = (i) => {
    interrupt()
    const base = targetRef.current
    let delta = wrap(i - base)
    if (delta > GLYPHS / 2) delta -= GLYPHS
    animateTo(Math.round(base) + delta)
  }

  // Dragging (or swiping) the ring or the archetype card turns the ring
  const onPointerDown = (e) => {
    if (e.button !== 0) return
    interrupt()
    cancelAnimationFrame(frameRef.current)
    draggedRef.current = false
    dragRef.current = {
      x: e.clientX, y: e.clientY, moved: false, last: ringAngle(e), lastT: e.timeStamp, v: 0,
      // the archetype box turns like a tape, not round the ring's centre
      onBox: e.currentTarget === boxRef.current, lastX: e.clientX,
    }
  }

  // Where the pointer is round the ring: its angle about the ring's centre (in
  // the ellipse's own proportions, like the glyphs' theta) and how far out it is
  // (1 on the ring)
  const ringAngle = (e) => {
    const scene = sceneRef.current.getBoundingClientRect()
    const u = (e.clientX - scene.left - RING.cx * scene.width) / (RING.rx * scene.width)
    const v = (e.clientY - scene.top - RING.cy * scene.height) / (RING.ry * scene.height)
    return { angle: Math.atan2(v, u), radius: Math.hypot(u, v) }
  }

  // The ring turns by however far the pointer goes round its centre, so what
  // is under the pointer follows it, front or back, even when the drag crosses
  // from one to the other
  const onPointerMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    // a vertical swipe on a phone scrolls the page instead
    const dist = e.pointerType === 'touch'
      ? Math.abs(e.clientX - drag.x)
      : Math.hypot(e.clientX - drag.x, e.clientY - drag.y)
    if (!drag.moved && dist > 5) {
      drag.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const now = ringAngle(e)
    let turn = now.angle - drag.last.angle
    if (turn > Math.PI) turn -= 2 * Math.PI
    else if (turn < -Math.PI) turn += 2 * Math.PI
    drag.last = now
    const dx = e.clientX - drag.lastX
    drag.lastX = e.clientX
    if (!drag.moved) return
    // On the box, a swipe across its whole width turns one archetype (the way
    // round the ring turns below its centre). On the ring, near the centre a
    // tiny move sweeps a large angle, so it turns the ring less.
    const glyphs = drag.onBox
      ? -dx / boxRef.current.offsetWidth
      : turn / STEP * Math.min(1, now.radius / 0.4)
    const dt = Math.max(e.timeStamp - drag.lastT, 1)
    drag.v = glyphs / dt
    drag.lastT = e.timeStamp
    setNow(rotRef.current + glyphs)
  }

  const onPointerUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    draggedRef.current = !!drag?.moved
    // only the click that ends this drag is ignored
    setTimeout(() => { draggedRef.current = false }, 0)
    // A flick carries on for a few glyphs before snapping (on the box, a quick
    // swipe on a phone is fast but means one archetype: see BOX_FLICK_MAX); a
    // press that stopped the ring between glyphs settles on the nearest one
    if (drag?.moved) {
      const carry = drag.onBox
        ? Math.max(-BOX_FLICK_MAX, Math.min(BOX_FLICK_MAX, drag.v * BOX_FLICK_MS))
        : drag.v * 250
      animateTo(Math.round(rotRef.current + carry), { fromDrag: true })
    }
    else if (rotRef.current !== Math.round(rotRef.current)) animateTo(Math.round(rotRef.current))
  }

  const stepBy = (by) => {
    interrupt()
    focus(Math.round(targetRef.current) + by)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') stepBy(-1)
    else if (e.key === 'ArrowRight') stepBy(1)
    else return
    e.preventDefault()
  }

  // A horizontal mouse wheel (or trackpad swipe) moves the ring's target, and
  // the ring glides after it continuously (exponential smoothing), so even one
  // notch is seen as a smooth turn. Once the wheel pauses, the target snaps to
  // the nearest glyph and the ring glides there. Native listener: React's
  // wheel events are passive and couldn't stop the browser navigating back.
  const interruptRef = useRef(interrupt)
  interruptRef.current = interrupt
  useEffect(() => {
    const targets = [sceneRef.current, boxRef.current].filter(Boolean)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let settleTimer = null
    let last = 0
    const glide = (now) => {
      const dt = Math.min(now - last, 50)
      last = now
      const diff = targetRef.current - rotRef.current
      if (Math.abs(diff) < 0.002) return setNow(targetRef.current)
      setNow(rotRef.current + diff * (1 - Math.exp(-dt / (wheelingRef.current ? WHEEL_GLIDE_MS : WHEEL_SNAP_GLIDE_MS))))
      frameRef.current = requestAnimationFrame(glide)
    }
    const startGlide = () => {
      cancelAnimationFrame(frameRef.current)
      last = performance.now()
      frameRef.current = requestAnimationFrame(glide)
    }
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      interruptRef.current()
      if (!wheelingRef.current) {
        cancelAnimationFrame(frameRef.current)
        targetRef.current = rotRef.current
        wheelingRef.current = true
        if (!reduced) startGlide()
      }
      const dx = e.deltaMode === 1 ? e.deltaX * 33 : e.deltaX
      targetRef.current += dx / WHEEL_PX_PER_GLYPH
      if (reduced) setNow(targetRef.current)
      clearTimeout(settleTimer)
      settleTimer = setTimeout(() => {
        wheelingRef.current = false
        targetRef.current = Math.round(targetRef.current)
        if (reduced) setNow(targetRef.current)
        else startGlide()
      }, WHEEL_SETTLE_MS)
    }
    targets.forEach(t => t.addEventListener('wheel', onWheel, { passive: false }))
    return () => {
      clearTimeout(settleTimer)
      targets.forEach(t => t.removeEventListener('wheel', onWheel))
    }
  }, [decks.length])

  if (!decks.length) return null

  const front = wrap(Math.round(rot))
  // At rest on a glyph (or just wiggling on it): it reads as selected and its
  // card as opened
  const settled = (introRef.current || Math.abs(rot - Math.round(rot)) < 1e-3) && !dragRef.current

  return (
    <section>
      <div className="max-w-3xl mx-auto">
        <div ref={sceneRef} tabIndex={0} role="listbox" aria-label="Top archetypes"
          aria-activedescendant={`glyph-${front}`}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown}
          className="relative isolate aspect-[1407/1118] rounded-xl overflow-hidden border border-gray-700 select-none touch-pan-y cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
          <img src="/images/brainstorm/character.webp" alt="" draggable={false}
            className="absolute inset-0 w-full h-full pointer-events-none" />
          {decks.map((d, i) => {
            const theta = Math.PI / 2 - (i - rot) * STEP
            const depth = (Math.sin(theta) + 1) / 2 // 0 at the back, 1 at the front
            const near = Math.max(0, 1 - Math.abs(wrap(i - rot + GLYPHS / 2) - GLYPHS / 2))
            // The glyph at the very back slips behind her head
            const behind = Math.min(1, Math.max(0, (Math.abs(wrap(i - rot) - GLYPHS / 2) - 0.15) / 0.7))
            const scale = 0.7 + 0.35 * depth + 0.35 * near
            return (
              <button key={d.archetype_name} id={`glyph-${i}`} role="option" aria-selected={i === front}
                aria-label={`${d.archetype_name}, ${d.meta_share.toFixed(1)}%`} tabIndex={-1}
                onClick={() => { if (!draggedRef.current) focus(i) }}
                className="absolute p-0 border-0 bg-transparent cursor-pointer focus:outline-none"
                style={{
                  left: `${(RING.cx + RING.rx * Math.cos(theta)) * 100}%`,
                  top: `${(RING.cy + RING.ry * Math.sin(theta)) * 100}%`,
                  width: `${SPRITE * 100}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  opacity: (0.45 + 0.55 * Math.max(depth, near)) * behind,
                  pointerEvents: behind < 0.5 ? 'none' : undefined,
                  zIndex: Math.round(depth * 100),
                  filter: near > 0.5 ? `drop-shadow(0 0 ${12 * near}px rgba(230, 166, 93, ${0.7 * near}))` : undefined,
                }}>
                <img src={`/images/brainstorm/glyph-${String(i).padStart(2, '0')}.webp`} alt="" draggable={false}
                  className={`w-full pointer-events-none ${settled && i === front ? 'glyph-selected' : ''}`} />
              </button>
            )
          })}
          <img src="/images/brainstorm/headdress.webp" alt="" draggable={false}
            className="absolute top-0 pointer-events-none"
            style={{ left: `${HEADDRESS.left * 100}%`, width: `${HEADDRESS.width * 100}%`, zIndex: HEADDRESS_Z }} />
        </div>

        {/* The arrow keys turn the ring from the box and its buttons too; a link
            in the box would roll away with its frame, so the box takes the focus */}
        <div onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const box = boxRef.current
            if (box.contains(document.activeElement) && document.activeElement !== box) box.focus()
          }
          onKeyDown(e)
        }} className="mt-3 relative isolate flex items-stretch gap-2">
          {settled && <div key={`light-${front}`} aria-hidden="true" className="ring-light absolute inset-x-0 -top-2 bottom-0 -z-10 pointer-events-none" />}
          <button onClick={() => stepBy(-1)} aria-label="Previous archetype" className={RING_ARROW}>‹</button>
          {/* Phones: the art as a banner on top with the text below; wider: side by side */}
          {/* Every line below has a fixed height, so the box is the same size
              for every archetype */}
          <div ref={boxRef} tabIndex={-1}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            // a swipe isn't a click on the card's links, nor a native link/image drag
            onClickCapture={(e) => { if (draggedRef.current) { e.preventDefault(); e.stopPropagation() } }}
            onDragStart={(e) => e.preventDefault()}
            className={`relative flex-1 min-w-0 grid select-none touch-pan-y focus:outline-none bg-gray-800 border rounded-xl overflow-hidden transition-[border-color,box-shadow] duration-500 ${settled ? 'border-amber-400/40 shadow-[0_0_24px_rgba(230,166,93,0.18)]' : 'border-gray-700'}`}
            style={{ perspective: `${TAPE.perspective * boxWidth}px` }}>
            {/* The boxes are frames of one tape wound round a wide drum that
                turns with the ring: the box frame shows one at a time, and between
                two glyphs the next one slides in joined to the side of the last */}
            {[-1, 0, 1, 2].map(n => {
              const k = Math.floor(rot) + n
              const offset = k - rot
              if (Math.abs(offset) >= 1.5) return null
              const rank = wrap(k)
              const radius = boxWidth / (2 * Math.tan(TAPE.step / 2 * Math.PI / 180))
              return (
                <div key={rank} aria-hidden={Math.abs(offset) >= 0.5 || undefined}
                  className="relative col-start-1 row-start-1 -mx-px border-x border-gray-700 bg-gray-800 flex flex-col sm:flex-row"
                  style={{
                    transform: offset ? `translateZ(${-radius}px) rotateY(${offset * TAPE.step}deg) translateZ(${radius}px)` : undefined,
                    // a frame dims as it rolls away to the side
                    filter: offset ? `brightness(${1 - 0.35 * Math.min(1, Math.abs(offset))})` : undefined,
                    pointerEvents: Math.abs(offset) >= 0.5 ? 'none' : undefined,
                  }}>
                  {archetypeCard(decks[rank], rank)}
                </div>
              )
            })}
          </div>
          <button onClick={() => stepBy(1)} aria-label="Next archetype" className={RING_ARROW}>›</button>
        </div>
      </div>
      {preview}
    </section>
  )

  function archetypeCard(deck, rank) {
    return (
      <>
        <Link to={`/archetypes/${nameToSlug(deck.archetype_name)}`}
          className="relative w-full aspect-[2/1] sm:aspect-auto sm:w-32 md:w-44 shrink-0 bg-gray-900 overflow-hidden group">
          {deck.featured_image
            // Scryfall's art crop of the same card: the artwork without its frame
            ? <img src={imageFor(deck.featured_card, deck.featured_image).replace('/normal/', '/art_crop/')} alt={deck.archetype_name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
            : <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs">No image</div>
          }
        </Link>
        {/* Phones: the type tags sit in the box's top-right corner, over the art */}
        <div className="sm:hidden absolute top-2 right-2 flex gap-1 pointer-events-none">
          {deck.game_type.map(g => (
            <span key={g} className="text-xs text-gray-100 bg-gray-900/85 rounded-md px-2 py-1 leading-none">{g}</span>
          ))}
        </div>
        <div className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 text-3xl font-bold text-gray-400 font-mono leading-none">#{rank + 1}</span>
            <Link to={`/archetypes/${nameToSlug(deck.archetype_name)}`}
              className="truncate min-w-0 text-lg font-semibold text-white hover:text-amber-400 transition-colors">{deck.archetype_name}</Link>
            <ManaSymbols mana={deck.dominant_mana} className="flex" />
            <div className="hidden sm:flex ml-auto self-start shrink-0 gap-1">
              {deck.game_type.map(g => (
                <span key={g} className="text-xs text-gray-300 bg-gray-700 rounded-md px-2 py-1 leading-none">{g}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg text-amber-400 font-mono">Meta: {deck.meta_share.toFixed(1)}%</span>
            <ShareChange share={deck.meta_share} previous={deck.previous_share} debut={deck.debut} size="text-sm" />
          </div>
          {/* staples come most played first; as many as fit in two rows */}
          <StapleRows key={deck.archetype_name}>
            {deck.staples.map(card => (
              <StapleLink key={card.name} card={card} cardPages={cardPages} bindPreview={bindPreview} />
            ))}
          </StapleRows>
        </div>
      </>
    )
  }
}

function MetagameSection({ embedded = false }) {
  const [data, setData] = useState([])
  // the ongoing metagame (code, label, name, start date): the shares count the tournaments played in it
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    fetch('/data/metagame.json')
      .then(r => r.json())
      .then(d => {
        setData((d.meta_shares || d).slice().sort((a, b) => b.meta_share - a.meta_share))
        setCurrent(d.metagame?.date ? d.metagame : null)
      })
  }, [])

  if (!data.length) return null

  return (
    // embedded (beside the table's last cards): the card fills the height of the cell, as tall as the cards beside it
    <section id="metagame" className={embedded ? 'h-full flex flex-col' : ''}>
      <h2 className={`text-xl font-semibold text-white ${current ? '' : 'mb-4'}`}>Bake into a Pie</h2>
      {current && (
        <p className="text-sm text-gray-400 mt-0.5 mb-4">
          Current metagame:{' '}
          <Link to={`/metagames/${metagameSlug(current)}`} className="text-amber-400 hover:text-amber-300 transition-colors">
            {current.metagame}.{current.label}{current.name && current.name !== current.label ? ` ${current.name}` : ''}
          </Link>
          {' '}(from {formatDate(current.date).replace(/, \d{4}$/, '')})
        </p>
      )}
      {/* the list in columns, filled evenly */}
      <MetaPie shares={data} minListedShare={1}
        listClassName={embedded ? 'columns-2 xl:columns-3 gap-x-4' : 'columns-2 lg:columns-3 2xl:columns-4 gap-x-4'}
        rowClassName="break-inside-avoid mb-1.5"
        rootClassName={embedded ? 'flex-1 flex flex-col justify-center' : ''} />
    </section>
  )
}

// How the top archetypes are shown: the card table (default) or
// the Brainstorm glyph ring. Stored in the settings, so it can be changed there too.
function useMetaView() {
  const { home } = useSettings()
  const view = home.metaView === 'brainstorm' ? 'brainstorm' : 'table'
  return [view, next => updateSettings({ home: { metaView: next } })]
}


// The news of the last month, exported by Myr newest first: announcements,
// new metagames, and archetypes, families and content creators added to the Academy.
// Each kind of news: its name (the icon's tooltip) and icon (Lucide-style
// stroke paths on a 24x24 grid).
const NEWS_KINDS = {
  // a megaphone: an official announcement
  announcement: {
    name: 'Announcement',
    color: '#e0443e',
    icon: <><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
  },
  // stacked layers: the card pool, one layer per metagame
  metagame: {
    name: 'New metagame',
    color: '#2f8ad6',
    icon: <><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></>,
  },
  // crossed swords: a deck to battle with
  archetype: {
    name: 'New archetype',
    color: '#2f9e60',
    icon: <><path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="m13 19 6-6" /><path d="m16 16 4 4" /><path d="m19 21 2-2" /><path d="M14.5 6.5 18 3h3v3l-3.5 3.5" /><path d="m5 14 4 4" /><path d="m7 17-3 3" /><path d="m3 19 2 2" /></>,
  },
  // a tree of boxes: archetypes grouped under a family
  family: {
    name: 'New family',
    color: '#9b7be0',
    icon: <><rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path d="M12 12V8" /></>,
  },
  // a video camera: a content creator
  creator: {
    name: 'New content creator',
    color: '#e0a82e',
    icon: <><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" /></>,
  },
}

function NewsIcon({ kind }) {
  return (
    <svg className="w-5 h-5 shrink-0" style={{ color: kind.color }} fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" role="img" aria-label={kind.name}>
      <title>{kind.name}</title>
      {kind.icon}
    </svg>
  )
}

function newsTitle(entry) {
  switch (entry.type) {
    case 'announcement':
      return { to: '/announcements', text: entry.subtitle }
    case 'metagame':
      return {
        to: `/metagames/${metagameSlug(entry)}`,
        text: `${entry.p13m}.${entry.label} ·${[...entry.sets.map(s => s.name), ...entry.bans.map(b => b.subtitle)].join(' + ')}`,
      }
    case 'archetype':
      return { to: `/archetypes/${nameToSlug(entry.name)}`, text: entry.name }
    case 'family':
      return { to: `/families/${nameToSlug(entry.name)}`, text: entry.name }
    case 'creator':
      return { to: '/creators', text: entry.name }
    default:
      return null
  }
}

// The creator's YouTube, Twitch and Metafy, as icons (whichever they have)
function CreatorLinks({ creator }) {
  const links = [
    { href: creator.youtube_channel_url, icon: YOUTUBE_ICON, label: 'YouTube', color: 'bg-red-900/40 text-red-300 hover:bg-red-800/60' },
    { href: creator.twitch_channel_url, icon: TWITCH_ICON, label: 'Twitch', color: 'bg-purple-900/40 text-purple-300 hover:bg-purple-800/60' },
    { href: creator.metafy_url, icon: METAFY_ICON, label: 'Metafy', color: 'bg-sky-900/40 text-sky-300 hover:bg-sky-800/60' },
  ].filter(l => l.href)
  if (!links.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {links.map(l => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" title={l.label} aria-label={l.label}
          className={`flex items-center justify-center w-8 h-7 rounded transition-colors ${l.color}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d={l.icon} /></svg>
        </a>
      ))}
    </div>
  )
}

const MANA_NAMES = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless' }

// An archetype's or family's colours, as mana icons
function NewsMana({ colours }) {
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0">
      {displayMana(colours).map(c => (
        <img key={c} src={manaSrc(c)} alt={c === 'WUBRG' ? manaLabel(c) : (MANA_NAMES[c] ?? c)} title={c === 'WUBRG' ? manaLabel(c) : (MANA_NAMES[c] ?? c)} className="w-4 h-4" />
      ))}
    </span>
  )
}

function NewsDetails({ entry, bindPreview, creators, types }) {
  if (entry.type === 'creator') {
    return creators[entry.name] ? <CreatorLinks creator={creators[entry.name]} /> : null
  }
  if (entry.type === 'announcement') {
    const cards = [
      ...entry.banned.map(name => ({ name, tone: 'banned' })),
      ...entry.unbanned.map(name => ({ name, tone: 'unbanned' })),
    ]
    return (
      <>
        {cards.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {cards.map(c => <CardLink key={c.name} card={{ name: c.name }} tone={c.tone} bindPreview={bindPreview} />)}
          </div>
        )}
        {entry.refs.map(ref => (
          <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer"
            className="block text-sm text-gray-400 hover:text-amber-400 transition-colors mt-2">{ref.text} ↗</a>
        ))}
      </>
    )
  }
  if (entry.type === 'metagame') {
    const cards = entry.sets.reduce((sum, s) => sum + s.new_pauper_cards, 0)
    return cards > 0
      ? <p className="text-sm text-gray-400 mt-1">{cards} new Pauper card{cards === 1 ? '' : 's'}</p>
      : null
  }
  if (entry.type === 'archetype') {
    const type = (types[entry.name] || []).join(' / ')
    if (!entry.family && !type) return null
    return (
      <p className="text-sm text-gray-400 mt-1">
        {entry.family && (
          <>Family: <Link to={`/families/${nameToSlug(entry.family)}`} className="hover:text-amber-400 transition-colors">{entry.family}</Link></>
        )}
        {entry.family && type && ' · '}
        {type && <>Type: {type}</>}
      </p>
    )
  }
  return null
}

function NewspauperSection() {
  const navigate = useNavigate()
  const [news, setNews] = useState(null)
  const { bind: bindPreview, preview } = useCardPreview({ sheet: true })
  // the mana colours of the archetypes and families, by name: a family has those
  // of its archetypes
  const [mana, setMana] = useState({})
  // the game types (Aggro, Control...) of the archetypes, by name
  const [types, setTypes] = useState({})
  // their representative cards ({name, preview}), by name
  const [cards, setCards] = useState({})
  const imageFor = useImageFor()
  // the content creators, by name: the links of the new ones
  const [creators, setCreators] = useState({})

  useEffect(() => {
    fetchJson('/data/creators.json').then(list => {
      setCreators(Object.fromEntries((list || []).map(c => [c.name, c])))
    })
    Promise.all([fetchJson('/data/archetypes.json'), fetchJson('/data/families.json')]).then(([archetypes, families]) => {
      const colours = {}
      for (const a of archetypes || []) colours[a.name] = a.dominant_mana || []
      for (const f of families || []) {
        const union = new Set(f.archetypes.flatMap(a => a.dominant_mana || []))
        colours[f.name] = ['W', 'U', 'B', 'R', 'G'].filter(m => union.has(m))
      }
      setMana(colours)
      setTypes(Object.fromEntries((archetypes || []).map(a => [a.name, a.game_type || []])))
      // by kind and name: a family can share its name with an archetype
      setCards(Object.fromEntries([
        ...(archetypes || []).filter(a => a.representative_card).map(a => [`archetype:${a.name}`, a.representative_card]),
        ...(families || []).filter(f => f.representative_card).map(f => [`family:${f.name}`, f.representative_card]),
      ]))
    })
    fetch('/data/newspauper.json').then(r => r.json()).then(setNews).catch(() => setNews([]))
  }, [])

  // only the news of the last two weeks (dates are YYYY-MM-DD, so they compare as text);
  // Brew is a placeholder, not a real archetype: no "New archetype" entry for it
  const since = new Date()
  since.setDate(since.getDate() - 14)
  const sinceIso = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`
  const entries = (news || []).filter(newsTitle).filter(e => !(e.type === 'archetype' && e.name === 'Brew')).filter(e => e.date >= sinceIso)

  return (
    <section id="newspauper">
      <h2 className="text-xl font-semibold text-white">Newspauper</h2>
      <p className="text-sm text-gray-400 mt-0.5 mb-4">Major updates on the Academy of the last two weeks</p>
      {news && entries.length === 0 ? (
        <p className="text-sm text-gray-400">No news in the last two weeks.</p>
      ) : (
        // one column on phones, two on small desktops, three on wide ones (newest first, left to right)
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {entries.map(entry => {
            const title = newsTitle(entry)
            // every kind of news has its own colour; an archetype's or family's mana
            // colours show only as the icons next to its name
            const colours = (entry.type === 'archetype' || entry.type === 'family') ? mana[entry.name] : null
            const kind = NEWS_KINDS[entry.type]
            return (
              <div key={`${entry.type}-${entry.date}-${title.text}`}
                onClick={e => { if (!e.target.closest('a')) navigate(title.to) }}
                className="relative flex items-stretch gap-4 pl-6 pr-4 py-3.5 rounded-xl cursor-pointer border border-gray-700 bg-gray-800 overflow-hidden hover:border-amber-400/40 transition-colors">
                {/* the kind's colour down the left edge */}
                <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: kind.color }} />
                {/* the date, over the kind's icon, in a box tinted with its colour */}
                <div className="shrink-0 flex flex-col items-center justify-center rounded-lg px-4 py-3 min-w-[5.5rem]"
                  style={{ background: `${kind.color}1f` }}>
                  <NewsIcon kind={kind} />
                  <span className="mt-1.5 text-xl font-bold font-mono leading-none text-gray-200">{Number(entry.date.slice(8, 10))}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">{formatShortDate(entry.date).split(' ')[0]}</span>
                </div>
                <div className="min-w-0 flex-1 self-center">
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: kind.color }}>{kind.name}</div>
                  {/* the name, then the colours as mana icons */}
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-0.5">
                    <Link to={title.to}
                      className="text-base font-semibold text-white hover:text-amber-400 transition-colors leading-snug">
                      {title.text}
                    </Link>
                    {colours && colours.length > 0 && <NewsMana colours={colours} />}
                  </div>
                  <NewsDetails entry={entry} bindPreview={bindPreview} creators={creators} types={types} />
                </div>
                {/* a new archetype's or family's representative card: its art, without the frame */}
                {(entry.type === 'archetype' || entry.type === 'family') && cards[`${entry.type}:${entry.name}`]?.preview && (
                  <Link to={title.to} tabIndex={-1} aria-hidden="true"
                    className="relative shrink-0 self-stretch w-20 sm:w-28 -my-3.5 -mr-4 rounded-l-2xl bg-gray-900 overflow-hidden group">
                    <img src={imageFor(cards[`${entry.type}:${entry.name}`].name, cards[`${entry.type}:${entry.name}`].preview).replace('/normal/', '/art_crop/')} alt=""
                      loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  </Link>
                )}
                {/* a new content creator's picture, as full-height as the card art */}
                {entry.type === 'creator' && (creators[entry.name]?.youtube_avatar_url || creators[entry.name]?.twitch_avatar_url) && (
                  <Link to={title.to} tabIndex={-1} aria-hidden="true"
                    className="relative shrink-0 self-stretch w-20 sm:w-28 -my-3.5 -mr-4 rounded-l-2xl bg-gray-900 overflow-hidden group">
                    <img src={creators[entry.name].youtube_avatar_url || creators[entry.name].twitch_avatar_url} alt=""
                      loading="lazy" referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
      {preview}
    </section>
  )
}

const ARTICLE_DAYS = 30

// The articles of the last month, from the sites that publish Pauper ones
function ArticlesSection() {
  const [articles, setArticles] = useState(null)

  useEffect(() => {
    fetchJson('/data/articles.json').then(list => setArticles(list || []))
  }, [])

  const since = daysAgoIso(ARTICLE_DAYS)
  const recent = (articles || []).filter(a => a.date >= since)
  if (recent.length === 0) return null

  return (
    <section id="articles">
      <h2 className="text-xl font-semibold text-white">Read the Bones</h2>
      <p className="text-sm text-gray-400 mt-0.5 mb-4">Pauper articles published in the last month</p>
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {recent.map(a => <ArticleCard key={a.link} article={a} />)}
      </div>
      <MoreButton to="/articles">View more articles</MoreButton>
    </section>
  )
}

// The recent sections show what happened in the last week
const RECENT_DAYS = 7
const MIN_TOURNAMENT_PLAYERS = 32

// YYYY-MM-DD of the day `days` ago, in the visitor's own time zone
function daysAgoIso(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function MoreButton({ to, children }) {
  return (
    <div className="flex justify-center mt-4">
      <Link to={to}
        className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-sm text-gray-300 hover:border-amber-400/50 hover:text-amber-400 transition-colors">
        {children}
      </Link>
    </div>
  )
}

// Outline icons for the boxes of a recent tournament
// three people: one in front, one at each side
function PlayersIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={className}>
      <circle cx="12" cy="8" r="3" />
      <path d="M6.5 19.5v-1a5.5 5.5 0 0 1 11 0v1" />
      <circle cx="4.8" cy="10" r="2.2" />
      <path d="M1.5 17.5v-.5a3.3 3.3 0 0 1 3.3-3.3" />
      <circle cx="19.2" cy="10" r="2.2" />
      <path d="M22.5 17.5v-.5a3.3 3.3 0 0 0-3.3-3.3" />
    </svg>
  )
}

// The colour of each mana symbol, as the stripe of a winner's archetype
const MANA_COLORS = { W: '#f3ecc4', U: '#2f8ad6', B: '#7c6f80', R: '#e0443e', G: '#2f9e60', C: '#9ca3af' }

// A vertical stripe in the archetype's colours, one band each (grey when it has none)
function manaStripe(mana) {
  const colors = (mana && mana.length ? mana : ['C']).map(m => MANA_COLORS[m] || MANA_COLORS.C)
  const step = 100 / colors.length
  return `linear-gradient(to bottom, ${colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(', ')})`
}

// The cards a winning deck plays in more or fewer copies than the typical list
// of its archetype in the metagame it was played in (as the arrows of the deck
// page do), the biggest differences first (none: the typical list itself). Basic lands are left out, their
// split is only the mana base. null when there is nothing to compare to.
const BASIC_LANDS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
  'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp', 'Snow-Covered Mountain', 'Snow-Covered Forest'])
// fewer decks than this in the metagame make for a noisy typical list
const MIN_DECKS_FOR_COMPARISON = 3
const archetypeCache = new Map()

const fetchJson = url => fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null)

function loadArchetype(slug) {
  if (!archetypeCache.has(slug)) {
    archetypeCache.set(slug, Promise.all([
      fetchJson(`/data/archetype-details/${slug}.json`),
      fetchJson(`/data/archetype-typical/${slug}.json`),
    ]))
  }
  return archetypeCache.get(slug)
}

async function deckDifferences(deckId, archetype) {
  if (!archetype) return null
  const [deck, [details, counts]] = await Promise.all([
    fetchJson(`/data/deck-details/${encodeURIComponent(deckId)}.json`),
    loadArchetype(nameToSlug(archetype)),
  ])
  if (!deck || !deck.decklist) return null
  const timeline = (details && details.typical_list && details.typical_list.timeline) || []
  let index = -1
  timeline.forEach((m, i) => { if (m.date <= deck.tournament_date) index = i })
  if (index < 0 || !counts || !counts.by_metagame || !counts.by_metagame[timeline[index].metagame]) return null
  const list = computeTypicalList(timeline, counts, index, index)
  if (list.decks < MIN_DECKS_FOR_COMPARISON) return null
  const typical = new Map(list.main.map(c => [c.name, c.typical]))
  return deck.decklist.main
    .filter(c => !BASIC_LANDS.has(c.name))
    .map(c => ({ name: c.name, diff: c.qty - (typical.get(c.name) || 0) }))
    .filter(c => c.diff !== 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || a.name.localeCompare(b.name))
}

// A card the winning deck plays in more (green) or fewer (red) copies than usual
function DiffChip({ card, cardPages, bindPreview }) {
  const slug = cardLinkSlug(cardPages, card.name)
  const handlers = bindPreview(card.name, { slug: slug || undefined })
  const up = card.diff > 0
  const cls = `inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs whitespace-nowrap ${
    up ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`
  const title = `${Math.abs(card.diff)} ${Math.abs(card.diff) === 1 ? 'copy' : 'copies'} ${up ? 'more' : 'fewer'} than the typical list`
  const content = <><span className="font-mono">{up ? '+' : '−'}{Math.abs(card.diff)}</span>{card.name}</>
  return slug
    ? <Link to={`/cards/${slug}`} {...handlers} title={title} className={`${cls} hover:brightness-125 transition`}>{content}</Link>
    : <span {...handlers} title={title} className={cls}>{content}</span>
}

function RecentTournamentsSection() {
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  // the winners (the 1st place deck), by tournament id; filled in as they load
  const [winners, setWinners] = useState({})
  // the cards of each winning deck off the typical list, by tournament id
  const [differences, setDifferences] = useState({})
  const requestedDifferences = useRef(new Set())
  const desktop = useMediaQuery('(min-width: 1024px)')
  const cardPages = useCardPages()
  const { bind: bindPreview, preview } = useCardPreview({ sheet: true })
  // the mana colours of each archetype, by name
  const [mana, setMana] = useState({})

  useEffect(() => {
    fetch('/data/archetypes.json').then(r => r.json())
      .then(list => setMana(Object.fromEntries(list.map(a => [a.name, a.dominant_mana || []]))))
      .catch(() => {})
    fetch('/data/tournaments.json').then(r => r.json()).then(data => {
      const since = daysAgoIso(RECENT_DAYS)
      const recent = data
        .map(([id, date, name, players, sources]) => ({ id, date, name, players, sources }))
        .filter(t => t.date >= since && t.players >= MIN_TOURNAMENT_PLAYERS)
        .sort((a, b) => b.date.localeCompare(a.date) || b.players - a.players)
      setRows(recent)
      recent.forEach(t => {
        fetch(`/data/tournament-details/${encodeURIComponent(t.id)}.json`)
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            // sources that list records, not placings, have no 1st place: the
            // best record (listed first) stands in, shown with its record
            const w = d && (d.decks.find(deck => deck.place === '1st') || d.decks[0])
            if (w) setWinners(prev => ({ ...prev, [t.id]: w }))
          })
          .catch(() => {})
      })
    }).catch(() => setRows([]))
  }, [])

  // the winning decks' differences with the typical list, on desktop only (phones
  // have no room for them): loaded once the winners are
  useEffect(() => {
    if (!desktop) return
    for (const [id, w] of Object.entries(winners)) {
      if (requestedDifferences.current.has(id)) continue
      requestedDifferences.current.add(id)
      deckDifferences(w.id, w.archetype).then(diffs => {
        if (diffs) setDifferences(prev => ({ ...prev, [id]: diffs }))
      })
    }
  }, [desktop, winners])

  if (!rows) return null

  return (
    <section id="tournaments">
      <h2 className="text-xl font-semibold text-white">Ancient Grudge</h2>
      <p className="text-sm text-gray-400 mt-0.5 mb-4">Major tournaments of the last week</p>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No tournaments of {MIN_TOURNAMENT_PLAYERS}+ players in the last week.</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {rows.map(t => {
            const winner = winners[t.id]
            const colors = winner && winner.archetype ? mana[winner.archetype] || [] : []
            // the trophy, or the record when the source lists no final placings
            const place = winner && (winner.place === '1st'
              ? <span aria-hidden="true">🏆</span>
              : <span title="Best record: the source doesn't list the final placings" className="shrink-0 rounded bg-gray-900/70 px-1.5 py-0.5 text-xs font-mono text-gray-400">{winner.place}</span>)
            const pilotLink = winner && (winner.pilot
              ? <Link to={`/players/${pilotToSlug(winner.pilot)}`} className="truncate font-medium text-gray-200 hover:text-amber-400 transition-colors">{winner.pilot}</Link>
              : <span className="text-gray-300">Anonymous</span>)
            const archetypeLink = winner && <Link to={`/decks/${winner.id}`} className="truncate text-amber-400 hover:text-amber-300 transition-colors">{winner.archetype || 'Decklist'}</Link>
            return (
              <div key={t.id}
                onClick={e => { if (!e.target.closest("a")) navigate(`/tournaments/${t.id}`) }}
                className="relative grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-2 gap-y-2.5 sm:flex sm:items-stretch sm:gap-4 pl-5 pr-3 py-3 sm:pl-6 sm:pr-4 sm:py-3.5 rounded-xl cursor-pointer border border-gray-700 bg-gray-800 overflow-hidden hover:border-amber-400/40 transition-colors">
                {/* the winning archetype's colours down the left edge */}
                <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5"
                  style={{ background: winner ? manaStripe(colors) : '#374151' }} />
                {/* phones: the title on a row of its own, then the winner's two rows beside the two boxes */}
                <div className="col-start-2 row-start-2 sm:col-auto sm:row-auto shrink-0 flex flex-col items-center justify-center rounded-lg bg-gray-900/70 px-2.5 py-2 min-w-[3.75rem] sm:px-4 sm:py-3 sm:min-w-[5.5rem]">
                  <CalendarIcon className="w-3.5 h-3.5 mb-1 sm:w-4 sm:h-4 sm:mb-1.5 text-gray-500" />
                  <span className="text-lg sm:text-xl font-bold font-mono leading-none text-gray-200">{Number(t.date.slice(8, 10))}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">{formatShortDate(t.date).split(' ')[0]}</span>
                </div>
                <div className="contents sm:block sm:min-w-0 sm:flex-1 sm:self-center">
                  <Link to={`/tournaments/${t.id}`}
                    className="col-span-3 row-start-1 block truncate text-base font-semibold leading-snug text-white hover:text-amber-400 transition-colors">
                    {t.name || `Tournament #${t.id}`}
                  </Link>
                  {winner ? (
                    <>
                      {/* wide: one line under the title */}
                      <div className="hidden sm:flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 mt-2 text-sm">
                        {place}{pilotLink}
                        <span className="text-gray-600">with</span>
                        {archetypeLink}
                        {colors.length > 0 && <ManaSymbols mana={colors} className="flex" />}
                      </div>
                      {/* phones: the player, then the archetype, on rows of their own */}
                      <div className="sm:hidden col-start-1 row-start-2 min-w-0 flex flex-col justify-center gap-1.5 text-sm">
                        <div className="flex items-center gap-2 min-w-0">{place}{pilotLink}</div>
                        <div className="flex items-center gap-2 min-w-0">
                          {archetypeLink}
                          {colors.length > 0 && <ManaSymbols mana={colors} className="flex" />}
                        </div>
                      </div>
                    </>
                  ) : <div className="hidden sm:block mt-2 h-5" />}
                  {desktop && differences[t.id] && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {differences[t.id].length === 0 && (
                        <span title="The deck plays the typical list of its archetype in that metagame, give or take the basic lands"
                          className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-300 whitespace-nowrap">
                          Typical list
                        </span>
                      )}
                      {differences[t.id].map(c => <DiffChip key={c.name} card={c} cardPages={cardPages} bindPreview={bindPreview} />)}
                    </div>
                  )}
                </div>
                <div className="col-start-3 row-start-2 sm:col-auto sm:row-auto shrink-0 flex flex-col items-center justify-center rounded-lg bg-gray-900/70 px-2.5 py-2 min-w-[3.75rem] sm:px-4 sm:py-3 sm:min-w-[5.5rem]">
                  <PlayersIcon className="w-3.5 h-3.5 mb-1 sm:w-4 sm:h-4 sm:mb-1.5 text-amber-400/60" />
                  <span className="text-lg sm:text-xl font-bold font-mono leading-none text-amber-400">{t.players}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">players</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <MoreButton to="/tournaments">View more tournaments</MoreButton>
      {preview}
    </section>
  )
}

function RecentVideosSection() {
  const [videos, setVideos] = useState(null)
  // who is streaming on Twitch: their tiles come first (not the creators the visitor hid)
  const hiddenCreators = useMemo(() => new Set(getSettings().watch.hiddenCreators), [])
  const { channels, streams, details, minute } = useLiveStreams(hiddenCreators)
  // the YouTube streams on the air: tiles too, not repeated among the videos. The ones that
  // have ended, or are not checked yet, are left out; those that can't be told stay videos.
  const { live: youtube, unknown: unknownLives } = useLiveYouTube(hiddenCreators)
  // the languages of the visitor's Watch settings apply to the streams too (none: all)
  const langs = useMemo(() => new Set(getSettings().content.languages), [])
  const langAllowed = code => languageAllowed(langs, code)
  const live = streams
    ? channels.filter(c => streams[c.login] && langAllowed(c.language)).sort((a, b) => (streams[b.login].viewers ?? 0) - (streams[a.login].viewers ?? 0))
    : []

  useEffect(() => {
    fetch('/data/videos.json').then(r => r.json()).then(data => {
      const since = daysAgoIso(RECENT_DAYS)
      // the visitor's Watch settings: types, hidden creators and languages
      const { types, hiddenCreators } = getSettings().watch
      const langs = getSettings().content.languages
      // Live alone leaves the videos to their default: no shorts
      const shown = showsVideos(types) ? types : ['videos']
      const hidden = new Set(hiddenCreators)
      const languages = new Set(langs)
      setVideos(data
        .filter(v => v.date >= since
          && typeAllows(shown, v)
          && !hidden.has(v.creator_name)
          && (languages.size === 0 || languages.has(LANG_CANONICAL[v.language] ?? v.language)))
        .sort((a, b) => b.date.localeCompare(a.date)))
    }).catch(() => setVideos([]))
  }, [])

  if (!videos) return null

  return (
    <section id="videos">
      <h2 className="text-xl font-semibold text-white">Sewer-veillance Cam</h2>
      <p className="text-sm text-gray-400 mt-0.5 mb-4">Ongoing live streams and videos from the last week</p>
      {videos.filter(v => !v.is_live || unknownLives.has(v.video_id)).length === 0 && live.length === 0 && youtube.filter(v => langAllowed(v.creatorLanguage)).length === 0 ? (
        // streams is null until the first check of who is live is done
        <p className="text-sm text-gray-400">
          {streams ? 'Nobody is live and there are no videos from the last week.' : 'Checking who is live…'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {live.map(c => <LiveTile key={c.login} channel={c} stream={streams[c.login]} details={details[c.login]} minute={minute} />)}
          {youtube.filter(v => langAllowed(v.creatorLanguage)).map(v => <YouTubeLiveTile key={v.video_id} v={v} />)}
          {videos.filter(v => !v.is_live || unknownLives.has(v.video_id)).map(v => <VideoCard key={v.video_id || v.link} v={v} withAvatar />)}
        </div>
      )}
      <MoreButton to="/watch">View more videos</MoreButton>
    </section>
  )
}

// The home page's sections, for the icon bar of phones
const HOME_SECTIONS = [
  { id: 'top-archetypes', label: 'Top archetypes', short: 'Top decks' },
  { id: 'metagame', label: 'Metagame', short: 'Meta' },
  { id: 'tournaments', label: 'Tournaments', short: 'Events' },
  { id: 'articles', label: 'Articles', short: 'Articles' },
  { id: 'newspauper', label: 'Newspauper', short: 'News' },
  { id: 'videos', label: 'Videos', short: 'Videos' },
]

export default function Home() {
  const [metaView, setMetaView] = useMetaView()
  const metaViewRef = useRef(null)

  // Swap views and scroll back to where the new view starts, just under the
  // sticky header (the welcome above it stays out of sight)
  const switchMetaView = () => {
    setMetaView(metaView === 'table' ? 'brainstorm' : 'table')
    // measure once the new view is laid out: a shorter page has already
    // pulled the scroll position up
    requestAnimationFrame(() => {
      const header = document.querySelector('header')?.offsetHeight ?? 0
      const top = metaViewRef.current.getBoundingClientRect().top + window.scrollY - header - 12
      scrollGently(Math.max(0, top))
    })
  }

  return (
    <Layout topBar={<SectionBar sections={HOME_SECTIONS} />}>
      <div className="space-y-12">
        {/* The welcome sits close to the top archetypes it introduces */}
        <div className="space-y-4">
          <section>
            <p className="text-lg text-gray-300 leading-relaxed">
              Pauper people, welcome to the <strong className="text-white">Academy</strong>!
            </p>
            <p className="mt-4 text-gray-400 leading-relaxed">
              This is the online encyclopedia for Pauper, organising resources for players with
              different skill levels.
            </p>
          </section>

          <div ref={metaViewRef} id="top-archetypes">
            {metaView === 'table' ? <TopDecksSection /> : <BrainstormSection />}
          </div>

          {/* Brainstorm: clear of the light that pools under the archetype card */}
          <div className={`flex justify-center ${metaView === 'table' ? '' : 'pt-4'}`}>
            <button onClick={switchMetaView}
              className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-sm text-gray-300 hover:border-amber-400/50 hover:text-amber-400 transition-colors">
              {metaView === 'table' ? 'Switch to Brainstorm View' : 'Switch to Table View'}
            </button>
          </div>
        </div>

        {/* Table view: the pie is in the table's last row */}
        {metaView !== 'table' && <MetagameSection />}

        <StatsSection />

        <RecentTournamentsSection />

        <ArticlesSection />

        <NewspauperSection />

        <RecentVideosSection />
      </div>
    </Layout>
  )
}
