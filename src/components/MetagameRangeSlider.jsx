import { useEffect, useRef, useState } from 'react'

// room for a year label ("'24"), in px: labels closer than this are left out
const YEAR_LABEL_WIDTH = 34

const clamp = (x, min, max) => Math.min(max, Math.max(min, x))

const label = m => `${m.metagame} ${m.label.toUpperCase()}`

// A timeline of metagames with two handles to drag to choose a run of them.
// timeline: the metagames, oldest first, each { metagame, label, date, decks }
// (decks: shown as the height of its bar); bans: { metagame code: [cards] },
// and unbans: { metagame code: [cards] }, marked on the timeline; value: [from, to], indexes into the timeline,
// inclusive; onChange: called with the new value. Handles are in the
// keyboard's reach too: arrows move one metagame, Home and End the ends.
export default function MetagameRangeSlider({ timeline, bans, unbans = {}, value, onChange, onInteract }) {
  const [from, to] = value
  const n = timeline.length
  const track = useRef(null)
  const dragging = useRef(null) // 'from' | 'to' | null
  const tallest = Math.max(1, ...timeline.map(m => m.decks || 0))
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(track.current)
    return () => observer.disconnect()
  }, [])

  function indexAt(clientX) {
    const { left, width } = track.current.getBoundingClientRect()
    return clamp(Math.floor(((clientX - left) / width) * n), 0, n - 1)
  }

  function move(handle, i) {
    onChange(handle === 'from' ? [Math.min(i, to), to] : [from, Math.max(i, from)])
  }

  // Dragging anywhere on the track moves the nearest handle.
  function onPointerDown(e) {
    onInteract?.()
    const i = indexAt(e.clientX)
    dragging.current = from === to ? (i <= from ? 'from' : 'to')
      : Math.abs(i - from) <= Math.abs(i - to) ? 'from' : 'to'
    track.current.setPointerCapture(e.pointerId)
    move(dragging.current, i)
  }

  function onPointerMove(e) {
    if (dragging.current) move(dragging.current, indexAt(e.clientX))
  }

  function stopDragging() {
    dragging.current = null
  }

  function onKeyDown(handle, e) {
    const current = handle === 'from' ? from : to
    const target = { ArrowLeft: current - 1, ArrowDown: current - 1, ArrowRight: current + 1, ArrowUp: current + 1,
      Home: 0, End: n - 1 }[e.key]
    if (target === undefined) return
    e.preventDefault()
    move(handle, clamp(target, 0, n - 1))
  }

  const handle = (name, index, edge) => (
    <div key={name} role="slider" tabIndex={0} aria-label={name === 'from' ? 'First metagame' : 'Last metagame'}
      aria-valuemin={0} aria-valuemax={n - 1} aria-valuenow={index} aria-valuetext={label(timeline[index])}
      onKeyDown={e => onKeyDown(name, e)} onFocus={onInteract}
      style={{ left: `${(edge / n) * 100}%` }}
      className="absolute inset-y-0 w-0 outline-none group">
      <div className="absolute inset-y-0 -left-0.5 w-1 bg-amber-400" />
      <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-3.5 rounded-md bg-amber-400 border border-gray-900 shadow
        flex items-center justify-center group-focus-visible:ring-2 group-focus-visible:ring-white">
        <div className="h-3.5 w-px bg-gray-900/60" />
      </div>
    </div>
  )

  // the year where it changes, under the timeline; as many as fit
  const years = []
  let lastX = -Infinity
  timeline.forEach((m, i) => {
    const year = m.date.slice(0, 4)
    if (i > 0 && year === timeline[i - 1].date.slice(0, 4)) return
    const x = (i / n) * width
    if (x - lastX < YEAR_LABEL_WIDTH) return
    years.push([i, year])
    lastX = x
  })

  return (
    <div className="select-none">
      <div ref={track} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={stopDragging} onPointerCancel={stopDragging}
        style={{ touchAction: 'pan-y' }}
        className="relative h-14 cursor-ew-resize rounded-lg bg-gray-900 border border-gray-700">
        {/* a bar per metagame: its decks of the archetype */}
        <div className="absolute inset-x-0 inset-y-1 flex items-end">
          {timeline.map((m, i) => (
            <div key={m.metagame} title={`${label(m)}: ${m.decks || 0} deck${m.decks === 1 ? '' : 's'}`}
              className="h-full flex-1 flex items-end">
              <div className={`w-full ${i >= from && i <= to ? 'bg-amber-400/60' : 'bg-gray-600/60'}`}
                style={{ height: m.decks ? `${Math.max(6, (100 * m.decks) / tallest)}%` : '2px' }} />
            </div>
          ))}
        </div>
        {/* the bans and unbans of cards the archetype plays, where their metagame
            starts: a metagame with both gets a line half red (top), half green */}
        {timeline.map((m, i) => {
          const ban = bans[m.metagame]
          const unban = unbans[m.metagame]
          if (!ban && !unban) return null
          const half = ban && unban
          return (
            <div key={m.metagame} style={{ left: `${(i / n) * 100}%` }}
              className="absolute inset-y-0 w-0.5 -ml-px pointer-events-none">
              {ban && <div className={`absolute inset-x-0 top-0 bg-red-500/80 ${half ? 'h-1/2' : 'h-full'}`} />}
              {unban && <div className={`absolute inset-x-0 bottom-0 bg-green-500/80 ${half ? 'h-1/2' : 'h-full'}`} />}
            </div>
          )
        })}
        {handle('from', from, from)}
        {handle('to', to, to + 1)}
      </div>
      <div className="relative mt-1 h-4 text-[10px] text-gray-500 tabular-nums">
        {years.map(([i, year]) => (
          <span key={i} style={{ left: `${(i / n) * 100}%` }} className="absolute">{`'${year.slice(2)}`}</span>
        ))}
      </div>
    </div>
  )
}
