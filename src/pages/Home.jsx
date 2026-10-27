import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { nameToSlug } from '../utils/slugs'
import { cardLinkSlug, useCardPages } from '../utils/cardPages'
import { useCardPreview } from '../components/CardPreview'


const NEWS = [
  { flag: '🇬🇧', href: 'https://magic.wizards.com/en/articles/archive/news/march-7-2022-banned-and-restricted-announcement', title: 'MARCH 7, 2022 BANNED AND RESTRICTED ANNOUNCEMENT', author: 'Wizards of the Coast', date: '2022-03-07' },
  { flag: '🇬🇧', href: 'https://magic.wizards.com/en/articles/archive/news/explanation-pauper-bans-march-7-2022', title: 'EXPLANATION OF PAUPER BANS FOR MARCH 7, 2022', author: 'Gavin Verhey', date: '2022-03-07' },
  { flag: '🇬🇧', href: 'https://www.youtube.com/watch?v=orMPmImTFN4', title: 'MTG School Club - Each One Teach One', author: 'Eisenherz', date: '2022-03-05' },
  { flag: '🇬🇧', href: 'https://magic.wizards.com/en/articles/archive/news/january-20-2022-banned-and-restricted-announcement', title: 'JANUARY 20, 2022 BANNED AND RESTRICTED ANNOUNCEMENT', author: 'Gavin Verhey', date: '2022-01-20' },
  { flag: '🇬🇧', href: 'https://magic.wizards.com/en/articles/archive/news/announcing-pauper-format-panel-2022-01-10', title: 'ANNOUNCING THE PAUPER FORMAT PANEL', author: 'Gavin Verhey', date: '2022-01-10' },
]

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
    <section className="bg-gray-800 border border-gray-700 rounded-xl px-6 py-8">
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
  const handlers = bindPreview(card.name, { slug: slug || undefined, image: card.preview })
  const cls = 'px-2 py-0.5 rounded-md text-xs border bg-gray-800 border-gray-700 text-gray-300 whitespace-nowrap'
  return slug
    ? <Link to={`/cards/${slug}`} {...handlers} className={`${cls} hover:border-amber-400/50 hover:text-amber-400 transition-colors`}>{card.name}</Link>
    : <span {...handlers} className={cls}>{card.name}</span>
}

function TopDecksSection() {
  const [decks, setDecks] = useState([])
  const cardPages = useCardPages()
  const { bind: bindPreview, preview } = useCardPreview()

  useEffect(() => {
    fetch('/data/top_decks.json').then(r => r.json()).then(setDecks)
  }, [])

  if (!decks.length) return null

  return (
    <section>
      <h2 className="text-xl font-semibold text-white mb-4">Top Archetypes</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
        {decks.map(deck => (
          <div key={deck.archetype_name} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-amber-400/50 transition-all group">
            <Link to={`/archetypes/${nameToSlug(deck.archetype_name)}`} className="block">
              <div className="card-image-clip aspect-[5/4] bg-gray-900 overflow-hidden mt-[-20px] mb-[-20px] mx-[-5px]">
                {deck.featured_image
                  ? <img src={deck.featured_image} alt={deck.archetype_name} loading="lazy"
                      className="w-full h-full object-cover object-top scale-110 group-hover:scale-125 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No image</div>
                }
              </div>
              <div className="p-2.5 space-y-2">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-base font-semibold text-white leading-tight group-hover:text-amber-400 transition-colors line-clamp-2">{deck.archetype_name}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {deck.dominant_mana.map(m => (
                      <img key={m} src={`/images/mana/${m}.png`} alt={m} className="w-3.5 h-3.5" />
                    ))}
                  </div>
                </div>
                <div className="-ml-[2px] mt-0.5 flex items-center gap-1 flex-wrap">
                  {deck.game_type.map(g => (
                    <span key={g} className="text-[10px] text-gray-400 bg-gray-700 rounded px-1 py-0.5 leading-none">{g}</span>
                  ))}
                </div>
                <span className="text-xs text-amber-400 font-mono">Meta: {deck.meta_share.toFixed(1)}%</span>
              </div>
            </Link>
            {deck.staples.length > 0 && (
              <div className="px-2.5 pb-2.5 flex flex-col gap-1 items-start">
                {deck.staples.map(card => (
                  <StapleLink key={card.name} card={card} cardPages={cardPages} bindPreview={bindPreview} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {preview}
    </section>
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

const wrap = (i) => ((i % GLYPHS) + GLYPHS) % GLYPHS

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// The hint wiggle: how far the ring rocks (in glyphs), how many full
// right-left swings, and how long it lasts (ms)
const WIGGLE = { amplitude: 0.18, swings: 2, duration: 1800 }

const RING_ARROW = 'shrink-0 w-9 sm:w-12 flex items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-3xl leading-none text-gray-400 hover:border-amber-400/50 hover:text-amber-400 transition-colors'

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
  const sceneRef = useRef(null)
  const cardPages = useCardPages()
  const { bind: bindPreview, preview } = useCardPreview()

  useEffect(() => {
    fetch('/data/top_decks.json').then(r => r.json()).then(d => setDecks(d.slice(0, GLYPHS)))
  }, [])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

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

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    interrupt()
    cancelAnimationFrame(frameRef.current)
    draggedRef.current = false
    dragRef.current = { x: e.clientX, rot: rotRef.current, moved: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 }
  }

  const onPointerMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.x
    if (!drag.moved && Math.abs(dx) > 5) {
      drag.moved = true
      sceneRef.current.setPointerCapture(e.pointerId)
    }
    if (!drag.moved) return
    const pxPerGlyph = sceneRef.current.clientWidth * 0.12
    const dt = Math.max(e.timeStamp - drag.lastT, 1)
    drag.v = (e.clientX - drag.lastX) / pxPerGlyph / dt
    drag.lastX = e.clientX
    drag.lastT = e.timeStamp
    setNow(drag.rot - dx / pxPerGlyph)
  }

  const onPointerUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    draggedRef.current = !!drag?.moved
    // A flick carries on for a few glyphs before snapping; a press that stopped
    // the ring between glyphs settles on the nearest one
    if (drag?.moved) animateTo(Math.round(rotRef.current - drag.v * 250), { fromDrag: true })
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

  if (!decks.length) return null

  const front = wrap(Math.round(rot))
  const deck = decks[front]
  // At rest on a glyph (or just wiggling on it): it reads as selected and its
  // card as opened
  const settled = (introRef.current || Math.abs(rot - Math.round(rot)) < 1e-3) && !dragRef.current

  return (
    <section>
      <h2 className="text-xl font-semibold text-white mb-4">Brainstorm the Meta</h2>
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
                  filter: near > 0.5 ? `drop-shadow(0 0 ${12 * near}px rgba(190, 255, 90, ${0.7 * near}))` : undefined,
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

        <div className="mt-3 relative isolate flex items-stretch gap-2">
          {settled && <div key={`light-${front}`} aria-hidden="true" className="ring-light absolute inset-x-0 top-0 -bottom-8 -z-10 pointer-events-none" />}
          <button onClick={() => stepBy(-1)} aria-label="Previous archetype" className={RING_ARROW}>‹</button>
          {/* Phones: the art as a banner on top with the text below; wider: side by side */}
          <div className={`flex-1 min-w-0 bg-gray-800 border rounded-xl overflow-hidden flex flex-col sm:flex-row transition-[border-color,box-shadow] duration-500 ${settled ? 'border-lime-300/40 shadow-[0_0_24px_rgba(190,255,90,0.18)]' : 'border-gray-700'}`}>
            <Link to={`/archetypes/${nameToSlug(deck.archetype_name)}`}
              className="relative w-full aspect-[2/1] sm:aspect-auto sm:w-44 shrink-0 bg-gray-900 overflow-hidden group">
              {deck.featured_image
                // Scryfall's art crop of the same card: the artwork without its frame
                ? <img src={deck.featured_image.replace('/normal/', '/art_crop/')} alt={deck.archetype_name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                : <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs">No image</div>
              }
            </Link>
            <div className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 space-y-1.5 min-w-0">
              {/* The type tags sit top-right, at the end of the name's line */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="text-3xl font-bold text-gray-400 font-mono leading-none">#{front + 1}</span>
                <Link to={`/archetypes/${nameToSlug(deck.archetype_name)}`}
                  className="text-lg font-semibold text-white hover:text-amber-400 transition-colors">{deck.archetype_name}</Link>
                <div className="flex items-center gap-0.5">
                  {deck.dominant_mana.map(m => (
                    <img key={m} src={`/images/mana/${m}.png`} alt={m} className="w-4 h-4" />
                  ))}
                </div>
                <div className="ml-auto self-start flex flex-wrap justify-end gap-1">
                  {deck.game_type.map(g => (
                    <span key={g} className="text-xs text-gray-300 bg-gray-700 rounded-md px-2 py-1 leading-none">{g}</span>
                  ))}
                </div>
              </div>
              <span className="block text-lg text-amber-400 font-mono">Meta: {deck.meta_share.toFixed(1)}%</span>
              {deck.staples.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {/* staples come most played first */}
                  {deck.staples.slice(0, 3).map(card => (
                    <StapleLink key={card.name} card={card} cardPages={cardPages} bindPreview={bindPreview} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => stepBy(1)} aria-label="Next archetype" className={RING_ARROW}>›</button>
        </div>
      </div>
      {preview}
    </section>
  )
}

const CHART_COLORS = [
  '#ff6a39', '#e6a65d', '#956c58', '#ff9e78', '#c87340',
  '#d4855a', '#ffb899', '#7a4a46', '#b07060',
]
const OTHER_COLOR = '#3d2a2b'
const SHOWN_SLICES = 8

function DonutChart({ data, activeIndex, onSliceEnter, onSliceLeave }) {
  const [tooltip, setTooltip] = useState(null)
  const SIZE = 220, cx = 110, cy = 110, innerR = 55, outerR = 95
  const total = data.reduce((s, d) => s + d.value, 0)

  let cum = -Math.PI / 2
  const slices = data.map((d, i) => {
    const sweep = (d.value / total) * 2 * Math.PI
    const start = cum + 0.02
    const end = cum + sweep - 0.02
    cum += sweep
    return { ...d, start, end, mid: (start + end) / 2 }
  })

  const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const arc = (s) => {
    const [ox1, oy1] = pt(outerR, s.start)
    const [ox2, oy2] = pt(outerR, s.end)
    const [ix2, iy2] = pt(innerR, s.end)
    const [ix1, iy1] = pt(innerR, s.start)
    const lg = s.end - s.start > Math.PI ? 1 : 0
    return `M${ox1},${oy1}A${outerR},${outerR},0,${lg},1,${ox2},${oy2}L${ix2},${iy2}A${innerR},${innerR},0,${lg},0,${ix1},${iy1}Z`
  }

  return (
    <div className="relative w-full h-full">
      <svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {slices.map((s, i) => {
          const active = i === activeIndex
          const tx = active ? Math.cos(s.mid) * 8 : 0
          const ty = active ? Math.sin(s.mid) * 8 : 0
          return (
            <path key={i} d={arc(s)} fill={s.color}
              transform={`translate(${tx},${ty})`}
              style={{ transition: 'transform 0.15s ease', cursor: 'default' }}
              onMouseEnter={(e) => {
                onSliceEnter(i)
                setTooltip({ name: s.name, value: s.value, x: e.clientX, y: e.clientY })
              }}
              onMouseMove={(e) => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
              onMouseLeave={() => { onSliceLeave(); setTooltip(null) }}
            />
          )
        })}
      </svg>
      {tooltip && createPortal(
        <div className="fixed z-50 pointer-events-none rounded-xl px-3 py-2 text-sm shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40, background: '#261819', border: '1px solid #3d2a2b' }}>
          <p className="font-semibold text-amber-400">{tooltip.name}</p>
          <p className="text-gray-300">{tooltip.value}%</p>
        </div>,
        document.body
      )}
    </div>
  )
}

function MetagameSection() {
  const [data, setData] = useState([])
  const [activeIndex, setActiveIndex] = useState(undefined)

  useEffect(() => {
    fetch('/data/metagame.json')
      .then(r => r.json())
      .then(d => setData((d.meta_shares || d).slice().sort((a, b) => b.meta_share - a.meta_share)))
  }, [])

  if (!data.length) return null

  const top = data.slice(0, SHOWN_SLICES)
  const otherShare = data.slice(SHOWN_SLICES).reduce((s, d) => s + d.meta_share, 0)
  const chartData = [
    ...top.map((d, i) => ({ name: d.archetype_name, value: +d.meta_share.toFixed(1), color: CHART_COLORS[i] })),
    { name: 'Other', value: +otherShare.toFixed(1), color: OTHER_COLOR },
  ]

  return (
    <section>
      <h2 className="text-xl font-semibold text-white mb-4">Bake into a Pie</h2>
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-full sm:w-56 shrink-0 h-56">
            <DonutChart
              data={chartData}
              activeIndex={activeIndex}
              onSliceEnter={(i) => setActiveIndex(i)}
              onSliceLeave={() => setActiveIndex(undefined)}
            />
          </div>

          <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-[none] sm:grid-flow-col sm:grid-rows-23 min-[900px]:grid-rows-16 lg:grid-rows-12 gap-x-4 gap-y-1.5">
            {data.map((entry, i) => {
              const color = i < SHOWN_SLICES ? CHART_COLORS[i] : OTHER_COLOR
              const pct = +entry.meta_share.toFixed(1)
              const maxShare = data[0].meta_share
              return (
                <div key={entry.archetype_name} className="flex items-center gap-2 group min-w-0"
                  onMouseEnter={() => setActiveIndex(i < SHOWN_SLICES ? i : SHOWN_SLICES)}
                  onMouseLeave={() => setActiveIndex(undefined)}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <Link
                    to={`/archetypes/${nameToSlug(entry.archetype_name)}`}
                    className="text-sm text-gray-300 hover:text-amber-400 transition-colors flex-1"
                  >
                    {entry.archetype_name}
                  </Link>
                  <div className="hidden 2xl:flex items-center gap-2 shrink-0">
                    <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(pct / maxShare) * 100}%`, background: color }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                  </div>
                  <span className="2xl:hidden text-xs text-gray-400 shrink-0">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <Layout>
      <div className="space-y-12">
        <section>
          <p className="text-lg text-gray-300 leading-relaxed">
            Hello Pauper player, and welcome to the <strong className="text-white">Academy</strong>!
          </p>
          <p className="mt-4 text-gray-400 leading-relaxed">
            This website aims to be the online encyclopedia for Pauper, collecting and organising resources
            for players with different skill levels. The Academy is currently being restructured — read the{' '}
            <a href="./pages/faq.html" className="text-amber-400 hover:underline">FAQs</a>{' '}
            to learn more about this project and its roadmap.
          </p>
        </section>


        <StatsSection />

        <BrainstormSection />

        <TopDecksSection />

        <MetagameSection />

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Newspauper</h2>
          <div className="divide-y divide-gray-700 border border-gray-700 rounded-xl overflow-hidden bg-gray-800">
            {NEWS.map(({ flag, href, title, author, date }) => (
              <a key={href} href={href} target="_blank" rel="noreferrer"
                className="flex items-start gap-3 px-5 py-4 bg-gray-800 hover:bg-gray-750 transition-colors group">
                <span className="text-lg shrink-0">{flag}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-200 group-hover:text-amber-400 transition-colors leading-snug">{title}</p>
                  <p className="text-xs text-gray-500 mt-1">{author} · {date}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}
