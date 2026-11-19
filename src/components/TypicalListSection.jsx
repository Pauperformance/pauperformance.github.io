import { useState, useEffect, useMemo } from 'react'
import { MetagameBadge } from './Metagame'
import MtgoButtons from './MtgoButtons'
import MetagameRangeSlider from './MetagameRangeSlider'
import ManaCurve from './ManaCurve'
import { ColorsPie, CardTypesRadar } from './DeckStats'
import { bansCrossed, computeTypicalList } from '../utils/typicalList'
import { useCardPages } from '../utils/cardPages'
import { nameToSlug } from '../utils/slugs'
import { getSettings } from '../utils/settings'
import { loadCardImages, useArtwork } from '../utils/artwork'
import { formatShortDate } from '../utils/dates'
import { DeckList, VisualList, Toggle, NO_VERSUS, sortCards } from '../pages/DeckPage'
import { useCardData, OracleText } from './CardPreview'

// The typical list, computed by Myr from the archetype's recent decklists:
// for each card, how many copies the aggregate list plays and the share of
// decklists playing at least 1, 2, 3 and 4 copies.
const BASIC_LAND = /^(Snow-Covered )?(Plains|Island|Swamp|Mountain|Forest|Wastes)$/
const FEW_DECKS = 10
// smaller cards than on a deck's page: there are up to 25 of them in a board
const TILE_SIZE = 'w-[calc((100%-1rem)/3)] sm:w-28 lg:w-36'
const COPIES_HEADERS = ['1+', '2+', '3+', '4']

function percent(share) {
  return `${Math.round(share * 100)}%`
}

function joinNames(names) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// How many of the decks play at least 1, 2, 3 and 4 copies of a card: four
// small bars, filled by the share. Basics (and the like), played in any number,
// say their average instead. compact: the smaller bars under a card's image.
function CopyShares({ card, compact = false }) {
  const anyNumber = BASIC_LAND.test(card.name) || card.average > 4
  if (anyNumber) {
    const full = `${card.average} on average, in ${percent(card.at_least[0])} of decks`
    // the average only: the share of decks playing a land says little (it is in the tooltip)
    return compact
      ? <span title={full} className="block text-center text-[11px] leading-tight text-gray-400 tabular-nums">{card.average} on average</span>
      : <span title={full} className="text-xs text-gray-400 tabular-nums whitespace-nowrap">{card.average} on average</span>
  }
  return (
    <span className="flex gap-0.5" title="Decks playing at least 1, 2, 3 and 4 copies">
      {card.at_least.map((share, i) => (
        <span key={i} title={`${COPIES_HEADERS[i]} ${i === 0 ? 'copy' : 'copies'}: ${percent(share)} of the decks`}
          className={`relative block rounded bg-gray-800 overflow-hidden ${compact ? 'h-4 flex-1' : 'h-5 w-8 sm:w-11'}`}>
          <span className="absolute inset-y-0 left-0 bg-amber-400/30" style={{ width: percent(share) }} />
          <span className={`relative flex h-full items-center justify-center tabular-nums ${compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'} ${share >= 0.5 ? 'text-gray-100' : 'text-gray-500'}`}>
            {Math.round(share * 100)}
          </span>
        </span>
      ))}
    </span>
  )
}

// The typical list's cards as the board of a deck: the cards of the list (with
// their typical copies) and, apart, the other options (qty 0).
function boardOf(cards) {
  return {
    listed: cards.filter(c => c.typical > 0).map(c => ({ ...c, qty: c.typical })),
    others: cards.filter(c => !c.typical).map(c => ({ ...c, qty: 0 })),
  }
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

// The view choices (text or visual, grouped, sorted) outlive the list: swiping
// to the next archetype builds a new one, which keeps them.
const viewPrefs = {}
function useViewPref(key, initial) {
  const [value, setValue] = useState(key in viewPrefs ? viewPrefs[key] : initial)
  const change = v => { viewPrefs[key] = v; setValue(v) }
  return [value, change]
}

// The typical list as a decklist, like a deck's page: the visitor's own view
// choices (see the Settings page: text or visual, grouped, sorted), the
// quantities in the list and the share of decks behind them as an extra layer
// ("Copy %", not on phones, which have no room for it).
function TypicalCards({ name, list, bindPreview, phone, fileSuffix = '' }) {
  const cardPages = useCardPages()
  const [data, setData] = useState({ images: {}, types: {}, costs: {}, cmc: {} })
  const [visual, setVisual] = useViewPref('visual', getSettings().deckView.visual)
  const [groupByType, setGroupByType] = useViewPref('groupByType', getSettings().deckView.groupByType)
  const [sort, setSort] = useViewPref('sort', getSettings().deckView.sort)
  const [shares, setShares] = useViewPref('shares', true)
  const [others, setOthers] = useState(false)
  const [hoveredCard, setHoveredCard] = useState(null)
  const hoveredData = useCardData(hoveredCard)
  const artwork = useArtwork()
  useEffect(() => {
    Promise.all([
      loadCardImages(artwork),
      fetch('/data/card-types.json').then(r => r.json()),
      fetch('/data/card-mana-costs.json').then(r => r.json()),
      fetch('/data/card-cmc.json').then(r => r.json()),
    ]).then(([images, types, costs, cmc]) => setData({ images, types, costs, cmc })).catch(() => {})
  }, [artwork])
  const withShares = shares && !phone
  const main = boardOf(list.main)
  const side = boardOf(list.side)
  const hoveredImage = hoveredCard && (data.images[hoveredCard] || (hoveredData && hoveredData.images[0]))
  const board = ({ listed, others: rest }, label) => {
    const apart = others ? sortCards(rest, sort, data.cmc) : []
    const cards = sortCards(listed, sort, data.cmc)
    return visual ? (
      <VisualList cards={cards} label={label} cardImages={data.images} cardTypes={data.types} groupByType={groupByType}
        cardPages={cardPages} bindPreview={bindPreview} others={apart} tileClass={TILE_SIZE}
        tileExtra={withShares ? c => <CopyShares card={c} compact /> : undefined} />
    ) : (
      <DeckList cards={cards} label={label} onHover={setHoveredCard} bindPreview={bindPreview} cardImages={data.images}
        cardTypes={data.types} groupByType={groupByType} cardPages={cardPages} manaCosts={data.costs}
        versus={NO_VERSUS} others={apart}
        rowExtra={withShares ? c => <CopyShares card={c} /> : undefined} />
    )
  }
  const decklist = typicalDecklist(list)
  const optionCount = main.others.length + side.others.length
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Toggle value={visual} onChange={setVisual} options={[[false, 'Text'], [true, 'Visual']]} />
        <Toggle value={groupByType} onChange={setGroupByType} options={[[true, 'Grouped'], [false, 'Ungrouped']]} />
        <Toggle value={sort} onChange={setSort} options={[['name', 'A–Z'], ['cmc', 'Mana value']]} />
        {!phone && <Toggle value={shares} onChange={setShares} options={[[true, 'Copy %'], [false, 'No %']]} />}
        {!phone && optionCount > 0 && <Toggle value={others} onChange={setOthers} options={[[false, 'List only'], [true, `+ ${optionCount} options`]]} />}
        <MtgoButtons decklist={decklist} fileName={`${nameToSlug(name)}_typical_list${fileSuffix}.txt`} />
      </div>
      {withShares && (
        <p className="text-sm text-gray-400">
          {visual ? 'Below' : 'Next to'} each card, the % of decks playing at least 1, 2, 3 and 4 copies.
        </p>
      )}
      <div className="flex gap-6 items-start">
        <div className={`min-w-0 ${visual || phone ? 'flex-1 space-y-6' : 'flex flex-col sm:flex-row gap-8'}`}>
          {board(main, 'Maindeck')}
          {board(side, 'Sideboard')}
        </div>
        {!phone && !visual && (
          // the card hovered, as on a deck's page
          <div className="hidden xl:flex flex-col min-[1800px]:flex-row gap-4 items-start shrink-0 sticky top-24 w-56 min-[1800px]:w-[496px]">
            <div className="w-56 shrink-0">
              {hoveredImage
                ? <img src={hoveredImage} alt={hoveredCard} className="w-full rounded-xl shadow-lg border border-gray-700" />
                : <div className="w-full aspect-[63/88] rounded-xl border border-gray-700" />}
            </div>
            {hoveredCard && <OracleText card={hoveredData} className="w-56 min-[1800px]:w-64 text-gray-200" />}
          </div>
        )}
      </div>
    </div>
  )
}

// On phones, the typical list reads like any decklist, with no percentages.
function CompactTypicalList({ name, list, bindPreview }) {
  const dates = list.first_date === list.last_date
    ? `on ${formatShortDate(list.last_date)}`
    : `between ${formatShortDate(list.first_date)} and ${formatShortDate(list.last_date)}`
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        The typical list: what <span className="text-gray-200">{list.decks} deck{list.decks === 1 ? '' : 's'}</span> played, {dates}.
        {list.decks < FEW_DECKS && <span className="text-amber-300"> Too few for reliable numbers.</span>}
      </p>
      {list.ended_by_bans.length > 0 && (
        <p className="text-sm text-amber-200 bg-amber-900/20 border border-amber-800/50 rounded-lg px-3 py-2">
          Before the ban of {joinNames(list.ended_by_bans)}: this is how {name} was played then.
        </p>
      )}
      <TypicalCards name={name} list={list} bindPreview={bindPreview} phone />
    </div>
  )
}

// compact: the simple, deck-page-like view (the archetypes index on phones)
export default function TypicalListSection({ name, list, currentMetagame, focusMetagame, bindPreview, compact = false }) {
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
  // coming from a metagame's page: the list of that metagame alone
  const focused = useMemo(() => {
    const i = canChoose && focusMetagame ? timeline.findIndex(m => m.metagame === focusMetagame) : -1
    return i >= 0 ? [i, i] : null
  }, [canChoose, focusMetagame, timeline])
  const [range, setRange] = useState(focused || initial)
  // the focused metagame's list is not the precomputed one: fetch its counts right away
  useEffect(() => { if (focused) loadCounts() }, [focused]) // eslint-disable-line react-hooks/exhaustive-deps
  const custom = canChoose && (range[0] !== initial[0] || range[1] !== initial[1])
  const computed = useMemo(
    () => (custom && counts ? computeTypicalList(timeline, counts, range[0], range[1]) : null),
    [custom, counts, timeline, range],
  )
  if (!list?.decks) return <p className="text-gray-500 text-sm">No decklists recorded.</p>
  if (compact) return <CompactTypicalList name={name} list={list} bindPreview={bindPreview} />
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
          <div className={`space-y-6 transition-opacity ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
            <TypicalCards name={name} list={shown} bindPreview={bindPreview} fileSuffix={fileSuffix} />
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
