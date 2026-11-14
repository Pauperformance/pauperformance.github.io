import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MetagameBadge } from './Metagame'
import MtgoButtons from './MtgoButtons'
import MetagameRangeSlider from './MetagameRangeSlider'
import ManaCurve from './ManaCurve'
import { ColorsPie, CardTypesRadar } from './DeckStats'
import { bansCrossed, computeTypicalList } from '../utils/typicalList'
import { cardLinkSlug, useCardPages } from '../utils/cardPages'
import { nameToSlug } from '../utils/slugs'
import { formatShortDate } from '../utils/dates'

// The typical list, computed by Myr from the archetype's recent decklists:
// for each card, how many copies the aggregate list plays and the share of
// decklists playing at least 1, 2, 3 and 4 copies.
const BASIC_LAND = /^(Snow-Covered )?(Plains|Island|Swamp|Mountain|Forest|Wastes)$/
const FEW_DECKS = 10
const COPIES_HEADERS = ['1+', '2+', '3+', '4']

function percent(share) {
  return `${Math.round(share * 100)}%`
}

function joinNames(names) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function CopiesCell({ share }) {
  return (
    <td className="px-0.5 py-1">
      <div className="relative h-6 rounded bg-gray-800 overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-amber-400/25" style={{ width: percent(share) }} />
        <span className={`relative flex h-full items-center justify-center text-xs tabular-nums ${share >= 0.5 ? 'text-gray-100' : 'text-gray-400'}`}>
          {percent(share)}
        </span>
      </div>
    </td>
  )
}

// A row of the typical list's table. No hover preview: the card images
// beside the table have it. On touch devices a tap opens the preview sheet.
function TypicalCardRow({ card, cardPages, bindPreview }) {
  const slug = cardLinkSlug(cardPages, card.name)
  const handlers = bindPreview(card.name, { slug: slug || undefined, image: card.preview, hover: false })
  // Cards with no page (e.g. banned ones) are shown but not linked.
  const name = slug
    ? <Link to={`/cards/${slug}`} {...handlers} className="truncate text-gray-200 hover:text-amber-400 transition-colors">{card.name}</Link>
    : <span {...handlers} className="truncate text-gray-200">{card.name}</span>
  // basics (and the like) are played in any number: their average says more
  const anyNumber = BASIC_LAND.test(card.name) || card.average > 4
  return (
    <tr className="hover:bg-gray-800/60">
      <td className="pl-3 pr-1 py-1 text-right tabular-nums font-semibold text-amber-400">{card.typical || '–'}</td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {name}
          {card.banned && (
            <span className="shrink-0 px-1.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-red-900/50 text-red-300 border border-red-800">Banned</span>
          )}
        </div>
      </td>
      {anyNumber
        ? <td colSpan={4} className="pr-3 py-1 text-center text-xs text-gray-400 tabular-nums">{card.average} on average, in {percent(card.at_least[0])}</td>
        : card.at_least.map((share, i) => <CopiesCell key={i} share={share} />)}
    </tr>
  )
}

// The groups of a visual decklist, by the card's (front face) type.
const CARD_GROUPS = [
  ['Creatures', t => t.includes('Creature')],
  ['Lands', t => t.includes('Land')],
  ['Spells', () => true],
]

function groupOf(card) {
  const front = (card.type_line || '').split(' // ')[0]
  return CARD_GROUPS.find(([, test]) => test(front))[0]
}

function TypicalCardImage({ card, cardPages, bindPreview }) {
  const slug = cardLinkSlug(cardPages, card.name)
  const img = (
    <img src={card.preview} alt={card.name} loading="lazy"
      className={`w-full aspect-[488/680] rounded-[4.75%/3.5%] border object-cover transition-colors ${card.banned ? 'border-red-700' : 'border-gray-700 group-hover:border-amber-400'}`} />
  )
  // the hover preview: the card's image (larger) and its Oracle text
  const handlers = bindPreview(card.name, { slug: slug || undefined, image: card.preview })
  return (
    <div className="relative">
      {/* Cards with no page (e.g. banned ones) are shown but not linked. */}
      {slug
        ? <Link to={`/cards/${slug}`} {...handlers} className="group block">{img}</Link>
        : <span {...handlers} className="group block">{img}</span>}
      {/* copies in the typical list; for the other options, how many decklists play it */}
      {card.typical > 0
        ? <span className="absolute left-1.5 bottom-1.5 min-w-6 px-1.5 py-0.5 rounded-md text-center text-xs font-bold tabular-nums bg-gray-900/90 text-amber-400 border border-gray-600">
            {card.typical}
          </span>
        : <span title={`In ${percent(card.at_least[0])} of decklists`}
            className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-md text-xs font-semibold tabular-nums bg-gray-900/90 text-gray-300 border border-gray-600">
            {percent(card.at_least[0])}
          </span>}
      {card.banned && (
        <span className="absolute right-1.5 bottom-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-red-900/90 text-red-200 border border-red-800">Banned</span>
      )}
    </div>
  )
}

// A board's cards as images: the typical list's, grouped by type (the
// sideboard's aren't), then the other options while the table shows them.
function TypicalGallery({ title, cards, grouped, showOthers, cardPages, bindPreview }) {
  const listed = cards.filter(c => c.typical > 0)
  const others = showOthers ? cards.filter(c => !c.typical) : []
  // creatures, then spells, then lands, as decklists usually go
  const groups = grouped
    ? ['Creatures', 'Spells', 'Lands'].map(name => [name, listed.filter(c => groupOf(c) === name)])
    : [[title, listed]]
  const copies = group => group.reduce((n, c) => n + c.typical, 0)
  return (
    <div className="space-y-3">
      {groups.filter(([, group]) => group.length).map(([name, group]) => (
        <GalleryGroup key={name} name={name} count={copies(group)} cards={group} cardPages={cardPages} bindPreview={bindPreview} />
      ))}
      {others.length > 0 && (
        <GalleryGroup name="Other options" count={`${others.length} card${others.length === 1 ? '' : 's'}`}
          cards={others} cardPages={cardPages} bindPreview={bindPreview} />
      )}
    </div>
  )
}

function GalleryGroup({ name, count, cards, cardPages, bindPreview }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {name} <span className="font-normal normal-case text-gray-500">({count})</span>
      </p>
      <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]">
        {cards.map(card => <TypicalCardImage key={card.name} card={card} cardPages={cardPages} bindPreview={bindPreview} />)}
      </div>
    </div>
  )
}

// A board of the typical list: its table, and beside it (below on phones)
// its cards as images. The table's toggle shows the other options in both.
function TypicalBoard({ title, cards, grouped, cardPages, bindPreview }) {
  const [showOthers, setShowOthers] = useState(false)
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] items-start">
      <TypicalTable title={title} cards={cards} cardPages={cardPages} bindPreview={bindPreview}
        showOthers={showOthers} onToggleOthers={() => setShowOthers(s => !s)} />
      <TypicalGallery title={title} cards={cards} grouped={grouped} showOthers={showOthers}
        cardPages={cardPages} bindPreview={bindPreview} />
    </div>
  )
}

function TypicalTable({ title, cards, cardPages, bindPreview, showOthers, onToggleOthers }) {
  const listed = cards.filter(c => c.typical > 0)
  const others = cards.filter(c => !c.typical)
  const total = listed.reduce((n, c) => n + c.typical, 0)
  const row = card => <TypicalCardRow key={card.name} card={card} cardPages={cardPages} bindPreview={bindPreview} />
  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full table-fixed text-sm bg-gray-900">
        <colgroup>
          <col className="w-9" />
          <col />
          {COPIES_HEADERS.map(h => <col key={h} className="w-11 sm:w-13" />)}
        </colgroup>
        <thead>
          <tr className="bg-gray-800 border-b border-gray-700">
            <th colSpan={2} className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {title} <span className="font-normal text-gray-500">({total})</span>
            </th>
            {COPIES_HEADERS.map(h => (
              <th key={h} className="py-2 text-center text-xs font-semibold text-gray-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {listed.map(row)}
          {showOthers && (
            <tr>
              <td colSpan={6} className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Other options</td>
            </tr>
          )}
          {showOthers && others.map(row)}
        </tbody>
      </table>
      {others.length > 0 && (
        <button onClick={onToggleOthers}
          className="w-full px-3 py-2 text-xs text-gray-400 hover:text-amber-400 bg-gray-800 border-t border-gray-700 transition-colors select-none">
          {showOthers ? 'Hide other options' : `Show ${others.length} other option${others.length === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  )
}

// A ban bounding the era the typical list comes from.
function EraBan({ bans, metagame }) {
  return (
    <>
      the ban of <span className="text-gray-200">{joinNames(bans)}</span>{' '}
      ({formatShortDate(metagame.date)}, <MetagameBadge metagame={metagame} />)
    </>
  )
}

// The era the typical list comes from: between the bans of cards the
// archetype was playing (see Myr's silver/typical_list.py).
function EraDescription({ list }) {
  const { era_start: start, era_end: end, started_by_bans: started, ended_by_bans: ended } = list
  if (start && end) return <>From <EraBan bans={started} metagame={start} /> to <EraBan bans={ended} metagame={end} />.</>
  if (start) return <>Since <EraBan bans={started} metagame={start} />.</>
  if (end) return <>From the first decklist to <EraBan bans={ended} metagame={end} />.</>
  return <>The whole history of the archetype: no ban hit the cards it played.</>
}

// The typical list as a decklist (its 60 and 15, without the other options),
// for the MTGO buttons.
function typicalDecklist(list) {
  const board = cards => cards.filter(c => c.typical > 0).map(c => ({ qty: c.typical, name: c.name }))
  return { main: board(list.main), side: board(list.side) }
}

// The counts behind the typical list of any run of metagames, fetched once
// load() is called (a visitor choosing a range): null until then.
function useTypicalCounts(name) {
  const [counts, setCounts] = useState(null)
  const [wanted, setWanted] = useState(false)
  useEffect(() => {
    if (!wanted) return
    let cancelled = false
    fetch(`/data/archetype-typical/${nameToSlug(name)}.json`)
      .then(r => r.json())
      .then(c => { if (!cancelled) setCounts(c) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [name, wanted])
  return [counts, () => setWanted(true)]
}

// The indexes in the timeline of the first and last metagames the
// precomputed list covers.
function defaultRange(list) {
  const codes = new Set(list.metagames.map(m => m.metagame))
  const indexes = list.timeline.flatMap((m, i) => (codes.has(m.metagame) ? [i] : []))
  return [Math.min(...indexes), Math.max(...indexes)]
}

// One end of the range the visitor chose: its metagame, name and start date
// (today: the metagame in progress, which the range runs up to).
function RangeEnd({ label, metagame, today }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-gray-500">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        <MetagameBadge metagame={metagame} />
        <span>{today ? 'today' : formatShortDate(metagame.date)}</span>
        <span className="basis-full sm:basis-auto text-gray-500">({metagame.name})</span>
      </div>
    </div>
  )
}

export default function TypicalListSection({ name, list, currentMetagame, bindPreview }) {
  const cardPages = useCardPages()
  const [cardTypes, setCardTypes] = useState({})
  useEffect(() => {
    fetch('/data/card-types.json').then(r => r.json()).then(setCardTypes).catch(() => {})
  }, [])
  const [counts, loadCounts] = useTypicalCounts(name)
  const timeline = list?.timeline || []
  const bans = list?.bans || {}
  const unbans = list?.unbans || {}
  // no range to choose for archetypes exported before Myr made the counts
  const canChoose = Boolean(list?.decks) && timeline.length > 1
  const initial = useMemo(() => (canChoose ? defaultRange(list) : null), [list, canChoose])
  const [range, setRange] = useState(initial)
  const custom = canChoose && (range[0] !== initial[0] || range[1] !== initial[1])
  const computed = useMemo(
    () => (custom && counts ? computeTypicalList(timeline, counts, range[0], range[1]) : null),
    [custom, counts, timeline, range],
  )
  if (!list?.decks) return <p className="text-gray-500 text-sm">No decklists recorded.</p>
  const crossed = canChoose ? bansCrossed(timeline, bans, range[0], range[1]) : []
  const unbansCrossed = canChoose ? bansCrossed(timeline, unbans, range[0], range[1]) : []
  // the list shown: the precomputed one, or the visitor's range (the
  // precomputed one dimmed until the counts are loaded)
  const shown = computed ? { ...list, ...computed } : list
  const loading = custom && !computed
  // the decks of the range are in the timeline: no need to wait for the counts
  const metagames = canChoose ? range[1] - range[0] + 1 : list.metagames.length
  const decks = canChoose
    ? timeline.slice(range[0], range[1] + 1).reduce((n, m) => n + (m.decks || 0), 0)
    : list.decks
  const dates = list.first_date === list.last_date
    ? `on ${formatShortDate(list.last_date)}`
    : `between ${formatShortDate(list.first_date)} and ${formatShortDate(list.last_date)}`
  const fileSuffix = custom ? `_${timeline[range[0]].metagame}-${timeline[range[1]].metagame}` : ''
  return (
    <div className="space-y-3">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3 text-sm text-gray-400">
        {canChoose && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-400">
              Drag the handles to choose the metagames the list is computed from.
            </p>
            {custom && (
              <button onClick={() => setRange(initial)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
                Reset range
              </button>
            )}
          </div>
          <MetagameRangeSlider timeline={timeline} bans={bans} unbans={unbans} value={range} onChange={setRange} onInteract={loadCounts} />
          <p className="text-sm text-gray-500">
            <span className="text-red-400">Red lines</span>: relevant ban events.{' '}
            <br className="sm:hidden" />
            <span className="text-green-400">Green lines</span>: relevant unban events.
          </p>
        </div>
        )}
        <div className={`space-y-2 ${canChoose ? 'border-t border-gray-700 pt-3' : ''}`}>
        {canChoose ? (
          <>
            <RangeEnd label="From" metagame={timeline[range[0]]} />
            <RangeEnd label="To" metagame={timeline[range[1]]} today={timeline[range[1]].metagame === currentMetagame} />
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <span className="w-24 shrink-0 text-gray-500">Era</span>
              <p className="leading-relaxed"><EraDescription list={list} /></p>
            </div>
            <div className="flex gap-2">
              <span className="w-24 shrink-0 text-gray-500">Metagames</span>
              <div className="flex flex-wrap gap-1.5">
                {list.metagames.map(m => <MetagameBadge key={m.metagame} metagame={m} count={m.decks} />)}
              </div>
            </div>
          </>
        )}
        <div className="flex gap-2">
          <span className="w-24 shrink-0 text-gray-500">{canChoose ? 'Data' : 'Decklists'}</span>
          <p>
            {canChoose && <><span className="text-gray-200">{metagames} metagame{metagames === 1 ? '' : 's'}</span>, </>}
            <span className="text-gray-200">{decks} deck{decks === 1 ? '' : 's'}</span>
            {!canChoose && <>, {dates}</>}
            {decks < FEW_DECKS && <span className="text-amber-300"> · too few for reliable numbers</span>}
            {loading && <span className="text-gray-500"> · computing the list…</span>}
          </p>
        </div>
        </div>
      </div>
      {crossed.map(({ metagame, cards }) => (
        <p key={metagame.metagame} className="text-sm text-red-200 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
          This range crosses the ban of <span className="font-medium">{joinNames(cards)}</span>{' '}
          ({formatShortDate(metagame.date)}, <MetagameBadge metagame={metagame} />): it mixes the decklists played
          with the card and those played without it. Narrow the range to stay on one side.
        </p>
      ))}
      {unbansCrossed.map(({ metagame, cards }) => (
        <p key={metagame.metagame} className="text-sm text-green-200 bg-green-900/20 border border-green-800/50 rounded-lg px-3 py-2">
          This range crosses the unban of <span className="font-medium">{joinNames(cards)}</span>{' '}
          ({formatShortDate(metagame.date)}, <MetagameBadge metagame={metagame} />): it mixes the decklists played
          with the card and those played without it. Narrow the range to stay on one side.
        </p>
      ))}
      {!custom && list.ended_by_bans.length > 0 && (
        <p className="text-sm text-amber-200 bg-amber-900/20 border border-amber-800/50 rounded-lg px-3 py-2">
          {list.later_decks === 0
            ? <>{name} wasn't played after the ban of {joinNames(list.ended_by_bans)}</>
            : <>{name} was hardly played after the ban of {joinNames(list.ended_by_bans)} (only{' '}
                {list.later_decks} decklist{list.later_decks === 1 ? '' : 's'})</>}
          : this is how it was played before.
        </p>
      )}
      {decks === 0 && !loading ? (
        <p className="text-gray-500 text-sm">No decklists in this range.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-400">
              Next to each card, the % of decks playing at least <i>n</i> copies.
            </p>
            <div className="flex flex-wrap gap-2">
              <MtgoButtons decklist={typicalDecklist(shown)} fileName={`${nameToSlug(name)}_typical_list${fileSuffix}.txt`} />
            </div>
          </div>
          <div className={`space-y-6 transition-opacity ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
            <TypicalBoard title="Maindeck" cards={shown.main} grouped cardPages={cardPages} bindPreview={bindPreview} />
            {shown.side.length > 0 && (
              <TypicalBoard title="Sideboard" cards={shown.side} cardPages={cardPages} bindPreview={bindPreview} />
            )}
            {/* the stats of the maindeck, side by side after the decklist */}
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 items-start">
              <ColorsPie cards={typicalDecklist(shown).main} cardTypes={cardTypes} />
              <ManaCurve cards={typicalDecklist(shown).main} centered />
              <CardTypesRadar cards={typicalDecklist(shown).main} cardTypes={cardTypes} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
