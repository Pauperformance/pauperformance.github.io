import { useState, useEffect, useMemo, useRef } from 'react'
import { useTournamentSizes, playersOf } from '../utils/tournamentSizes'
import TournamentDecks, { useIsDesktop } from './TournamentDecks'
import { FilterPanel } from './FilterSheet'
import SizeFilter, { bigEnough } from './SizeFilter'
import { SearchInput, SelectInput, Pager } from './DeckFilters'
import { displayPlace } from '../utils/places'
import { formatShortDate } from '../utils/dates'

const PAGE_SIZE = 20

// The decklists of one metagame, from /data/metagame-decks/<slug>.json: on
// desktop the list of decks (a page at a time) beside the decklist, on phones
// one decklist at a time, swiped, with the filters in a sheet (as on an
// archetype's page).
export default function MetagameDecks({ slug }) {
  const [decks, setDecks] = useState(null)
  const [page, setPage] = useState(0)
  const [archetype, setArchetype] = useState('')
  const [tournament, setTournament] = useState('')
  const [pilot, setPilot] = useState('')
  const [minStars, setMinStars] = useState(0)
  const isDesktop = useIsDesktop()
  const sizes = useTournamentSizes()
  const sectionRef = useRef(null)
  const pagerRef = useRef(null)
  const firstPage = useRef(true)

  useEffect(() => {
    let cancelled = false
    setDecks(null)
    fetch(`/data/metagame-decks/${slug}.json`)
      .then(r => (r.ok ? r.json() : []))
      .catch(() => [])
      .then(d => { if (!cancelled) setDecks(d) })
    return () => { cancelled = true }
  }, [slug])

  // the pager brings the top of the list back into view
  useEffect(() => {
    if (firstPage.current) { firstPage.current = false; return }
    const el = pagerRef.current
    if (!el) return
    const header = document.querySelector('header')?.offsetHeight ?? 64
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - 16, behavior: 'smooth' })
  }, [page])

  // the archetypes of the decks, most played first
  const archetypes = useMemo(() => {
    const counts = {}
    for (const d of decks || []) counts[d.archetype] = (counts[d.archetype] || 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [decks])

  const filtered = useMemo(() => {
    const t = tournament.toLowerCase()
    const p = pilot.toLowerCase()
    return (decks || []).filter(d =>
      (!archetype || d.archetype === archetype) &&
      (!t || (d.tournament_name || '').toLowerCase().includes(t)) &&
      (!p || (d.pilot || '').toLowerCase().includes(p)) &&
      bigEnough(playersOf(sizes, d), minStars))
  }, [decks, sizes, archetype, tournament, pilot, minStars])

  if (!decks) return <p className="text-gray-500 text-sm">Loading decklists…</p>
  if (!decks.length) return <p className="text-gray-500 text-sm">No decklists recorded.</p>

  const filter = setter => value => { setter(value); setPage(0) }
  const totalPages = isDesktop ? Math.ceil(filtered.length / PAGE_SIZE) : 1
  const shown = isDesktop ? filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : filtered
  const browsed = shown.map(d => ({
    id: d.id,
    pilot: d.pilot,
    pilotOriginal: d.pilot_original,
    archetype: d.archetype,
    place: displayPlace(d.place),
    lead: formatShortDate(d.tournament_date),
    detail: d.tournament_name,
    players: playersOf(sizes, d),
    // in the list the archetype is what tells the decks of a metagame apart
    listDetail: d.archetype,
  }))
  const activeCount = (archetype ? 1 : 0) + (tournament ? 1 : 0) + (pilot ? 1 : 0) + (minStars ? 1 : 0)
  const count = n => n.toLocaleString('en-US')

  return (
    <div ref={sectionRef} className="space-y-3">
      <FilterPanel scopeRef={sectionRef} activeCount={activeCount}
        onClear={() => { setArchetype(''); setTournament(''); setPilot(''); setMinStars(0); setPage(0) }}
        summary={`${count(filtered.length)} decklist${filtered.length !== 1 ? 's' : ''}`}>
        <SelectInput value={archetype} onChange={e => filter(setArchetype)(e.target.value)}>
          <option value="">All archetypes</option>
          {archetypes.map(([name, n]) => <option key={name} value={name}>{name} ({n})</option>)}
        </SelectInput>
        <SearchInput placeholder="Search tournaments…" value={tournament}
          onChange={e => filter(setTournament)(e.target.value)} onClear={() => filter(setTournament)('')} />
        <SearchInput placeholder="Search pilots…" value={pilot}
          onChange={e => filter(setPilot)(e.target.value)} onClear={() => filter(setPilot)('')} />
        <SizeFilter value={minStars} onChange={filter(setMinStars)} />
      </FilterPanel>
      <p className="text-xs text-gray-500">
        {filtered.length !== decks.length ? `${count(filtered.length)} of ${count(decks.length)}` : count(decks.length)} decklists
      </p>
      {browsed.length === 0 ? (
        <p className="px-4 py-8 text-center text-gray-500 text-sm">No decklists match your filters.</p>
      ) : (
        <div ref={pagerRef}>
          <TournamentDecks key={`${page}:${browsed[0].id}:${browsed.length}`} decks={browsed}
            pager={<Pager page={page} totalPages={totalPages} onPage={setPage} />} />
        </div>
      )}
    </div>
  )
}
