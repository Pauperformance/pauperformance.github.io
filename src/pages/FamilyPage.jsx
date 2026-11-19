import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useCardPreview } from '../components/CardPreview'
import CardPopularityChart, { PopularityTrend, useMetagames } from '../components/CardPopularityChart'
import VideosSection from '../components/VideosSection'
import MetaPie from '../components/MetaPie'
import TableOfContents from '../components/TableOfContents'
import { AppearanceRow } from '../components/Metagame'
import { cardLinkSlug, useCardPages } from '../utils/cardPages'
import { useImageFor } from '../utils/artwork'
import { formatShortDate } from '../utils/dates'
import { nameToSlug } from '../utils/slugs'
import FamilyDecks from '../components/FamilyDecks'
import FamilyArchetypes from '../components/FamilyArchetypes'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
const MANA_LABELS = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless' }
const POPULARITY_METAGAMES = '/data/archetype-popularity-metagames.json'

const CORE_CARDS_SHOWN = 24
const VIDEOS_SHOWN = 4

const getJson = url => fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null)

function ManaIcon({ color }) {
  return (
    <img src={`/images/mana/${color}.png`} alt={MANA_LABELS[color] ?? color}
      title={MANA_LABELS[color] ?? color} className="w-5 h-5 inline-block" />
  )
}

function Stat({ label, children, sub }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 min-w-0 flex flex-col items-center justify-center text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold text-white tabular-nums truncate">{children}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

function SectionHeader({ children }) {
  return <h2 className="text-lg font-semibold text-white mb-3 pt-4 border-t border-gray-700">{children}</h2>
}


export default function FamilyPage() {
  const { name } = useParams()
  const [family, setFamily] = useState(null)
  const [metaMap, setMetaMap] = useState({})
  // per archetype slug: { details, popularity, decks }, once all are loaded
  const [parts, setParts] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [allCards, setAllCards] = useState(false)
  const metagames = useMetagames(POPULARITY_METAGAMES)
  const cardPages = useCardPages()
  const imageFor = useImageFor()
  const { bind: bindPreview, preview } = useCardPreview({ sheet: true })

  useEffect(() => {
    let cancelled = false
    setFamily(null); setParts(null); setNotFound(false)
    Promise.all([getJson('/data/families.json'), getJson('/data/metagame.json')]).then(([families, metagameData]) => {
      if (cancelled) return
      const found = (families || []).find(f => f.slug === name)
      if (!found) { setNotFound(true); return }
      setFamily(found)
      const entries = metagameData?.meta_shares || metagameData || []
      setMetaMap(Object.fromEntries(entries.map(e => [e.archetype_name, e.meta_share])))
      // everything the family says about itself is the sum of its archetypes'
      return Promise.all(found.archetypes.map(async a => {
        const slug = nameToSlug(a.name)
        const [details, popularity, decks] = await Promise.all([
          getJson(`/data/archetype-details/${slug}.json`),
          getJson(`/data/archetype-popularity/${slug}.json`),
          getJson(`/data/intel-decks/${slug}.json`),
        ])
        return [a.name, { details, popularity, decks: decks || [] }]
      })).then(entries => { if (!cancelled) setParts(Object.fromEntries(entries)) })
    })
    return () => { cancelled = true }
  }, [name])

  // the decks of every archetype, per metagame: the family's own popularity series
  const series = useMemo(() => {
    if (!parts) return null
    const total = new Map()
    for (const p of Object.values(parts)) {
      for (const [slug, decks] of p.popularity?.series || []) total.set(slug, (total.get(slug) || 0) + decks)
    }
    // in the order of the metagames (their slugs start with their number), whichever archetype had them first
    return [...total].sort(([a], [b]) => a.localeCompare(b)).map(([slug, decks]) => [slug, decks, decks > 0 ? 1 : null])
  }, [parts])

  // each archetype's decks over all the metagames, and its share in the latest
  const weights = useMemo(() => {
    if (!parts) return {}
    return Object.fromEntries(Object.entries(parts).map(([n, p]) => [
      n, (p.popularity?.series || []).reduce((sum, [, decks]) => sum + decks, 0) || (p.details?.intel_deck_count ?? p.decks.length),
    ]))
  }, [parts])

  const summary = useMemo(() => {
    if (!family) return null
    const colors = new Set(), types = new Set()
    for (const a of family.archetypes) {
      a.dominant_mana.forEach(m => colors.add(m)); a.game_type.forEach(t => types.add(t))
    }
    const share = family.archetypes.reduce((sum, a) => sum + (metaMap[a.name] || 0), 0)
    const firsts = [], lasts = []
    for (const p of Object.values(parts || {})) {
      if (p.details?.first_appearance?.date) firsts.push(p.details.first_appearance)
      if (p.details?.last_appearance?.date) lasts.push(p.details.last_appearance)
    }
    firsts.sort((a, b) => a.date.localeCompare(b.date))
    lasts.sort((a, b) => b.date.localeCompare(a.date))
    return {
      colors: MANA_ORDER.filter(m => colors.has(m)), types: [...types], share,
      firstAppearance: firsts[0], lastAppearance: lasts[0],
      first: firsts[0]?.date, last: lasts[0]?.date,
      decks: Object.values(weights).reduce((a, b) => a + b, 0),
    }
  }, [family, parts, metaMap, weights])

  // the family's share of the latest metagame and of the one before
  const trend = useMemo(() => {
    if (!series || !metagames) return null
    const bySlug = Object.fromEntries(metagames.map(m => [m.slug, m]))
    const points = series.filter(([slug]) => bySlug[slug]).map(([slug, decks]) => 100 * decks / bySlug[slug].decks)
    return points.length > 1 ? { share: points.at(-1), previous: points.at(-2) } : null
  }, [series, metagames])

  // most played in the latest metagame first, then over all the metagames
  const sorted = useMemo(() => {
    if (!family) return []
    return [...family.archetypes].sort((a, b) =>
      (metaMap[b.name] || 0) - (metaMap[a.name] || 0) || (weights[b.name] || 0) - (weights[a.name] || 0) || a.name.localeCompare(b.name))
  }, [family, metaMap, weights])

  // who the family's decks are, over all the metagames, as the pie takes them: most played first
  const composition = useMemo(() => {
    if (!family || !parts) return []
    const total = Object.values(weights).reduce((a, b) => a + b, 0)
    if (!total) return []
    return family.archetypes
      .filter(a => weights[a.name] > 0)
      .sort((a, b) => weights[b.name] - weights[a.name])
      .map(a => ({ archetype_name: a.name, meta_share: 100 * weights[a.name] / total }))
  }, [family, parts, weights])

  // the cards the archetypes of the family have in common, from their typical lists
  const coreCards = useMemo(() => {
    if (!parts) return { cards: [], withList: 0 }
    const lists = Object.entries(parts).filter(([, p]) => p.details?.typical_list?.main?.length)
    const cards = new Map()
    for (const [archetype, p] of lists) {
      const decks = p.details.typical_list.decks || 1
      for (const c of p.details.typical_list.main) {
        if (/^Basic/.test(c.type_line || '')) continue
        const e = cards.get(c.name) || { name: c.name, preview: c.preview, archetypes: [], copies: 0, weight: 0 }
        // in the typical list, i.e. in at least half of its decks
        if ((c.at_least?.[0] ?? 0) >= 0.5) e.archetypes.push({ archetype, typical: c.typical })
        e.copies += (c.average || 0) * decks
        e.weight += decks
        cards.set(c.name, e)
      }
    }
    const rows = [...cards.values()].filter(c => c.archetypes.length)
    rows.sort((a, b) => b.archetypes.length - a.archetypes.length || b.copies / b.weight - a.copies / a.weight || a.name.localeCompare(b.name))
    return { cards: rows, withList: lists.length, listed: lists.map(([archetype]) => archetype) }
  }, [parts])

  // the tournament decks of all the archetypes, and the latest videos of any of them
  const allDecks = useMemo(() => {
    if (!parts) return []
    return Object.entries(parts).flatMap(([archetype, p]) => p.decks.map(d => ({ ...d, archetype })))
  }, [parts])

  // the videos of all the archetypes, newest first
  const allVideos = useMemo(() => {
    if (!parts) return []
    return Object.entries(parts)
      .flatMap(([archetype, p]) => (p.details?.videos || []).map(v => ({ ...v, archetype })))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [parts])

  if (notFound) return (
    <Layout>
      <div className="text-center py-20">
        <p className="text-gray-400">Family <strong className="text-white">{name}</strong> not found.</p>
        <Link to="/archetypes" className="mt-4 inline-block text-amber-400 hover:underline text-sm">← Back to Archetypes Index</Link>
      </div>
    </Layout>
  )

  if (!family || !summary) return (
    <Layout>
      <div className="text-center py-20 text-gray-500 text-sm">Loading...</div>
    </Layout>
  )

  // the card most archetypes play is the family's representative
  const representative = coreCards.cards[0]
  const sections = [
    (composition.length > 0 || series?.some(([, decks]) => decks > 0)) && { id: 'popularity', label: 'Popularity' },
    { id: 'archetypes', label: 'Archetypes', count: family.archetypes.length },
    coreCards.cards.length > 0 && { id: 'shared-cards', label: 'Shared cards', count: coreCards.cards.length },
    allDecks.length > 0 && { id: 'decks', label: 'Decks', count: allDecks.length },
    allVideos.length > 0 && { id: 'videos', label: 'Videos', count: allVideos.length },
  ].filter(Boolean)

  const cardRows = allCards ? coreCards.cards : coreCards.cards.slice(0, CORE_CARDS_SHOWN)

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header, with the table of contents beside it */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-5 min-w-0">
            {/* the representative card, top left: the one the most archetypes play */}
            {representative?.preview && (() => {
              const slug = cardLinkSlug(cardPages, representative.name)
              const img = (
                <img src={imageFor(representative.name, representative.preview)} alt={representative.name}
                  className="w-44 shrink-0 aspect-[488/680] rounded-[4.75%/3.5%] border border-gray-700 group-hover:border-amber-400 transition-colors object-cover" />
              )
              return slug
                ? <Link to={`/cards/${slug}`} title={representative.name} className="group hidden sm:block shrink-0">{img}</Link>
                : <span title={representative.name} className="group hidden sm:block shrink-0">{img}</span>
            })()}
            <div className="min-w-0">
              <Link to="/archetypes" className="text-xs text-gray-500 hover:text-amber-400 transition-colors mb-3 inline-block">
                ← Archetypes Index
              </Link>
              <h1 className="text-3xl font-bold text-white">{family.name} <span className="text-gray-500 font-normal text-xl">Family</span></h1>
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="w-24 shrink-0 text-sm text-gray-500">Color:</span>
                  {summary.colors.map(m => <ManaIcon key={m} color={m} />)}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="w-24 shrink-0 text-sm text-gray-500">Type:</span>
                  {summary.types.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600">{t}</span>
                  ))}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="w-24 shrink-0 text-sm text-gray-500">Archetypes:</span>
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    {sorted.map(a => (
                      <Link key={a.name} to={`/archetypes/${nameToSlug(a.name)}`}
                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-amber-400 border border-gray-600 hover:border-amber-400 transition-colors">
                        {a.name}
                      </Link>
                    ))}
                  </div>
                </div>
                {summary.firstAppearance && <AppearanceRow label="First played:" appearance={summary.firstAppearance} />}
                {summary.lastAppearance && <AppearanceRow label="Last played:" appearance={summary.lastAppearance} />}
              </div>
            </div>
          </div>
          <TableOfContents sections={sections} />
        </div>

        {/* Description */}
        {family.description && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <p className="text-gray-300 text-sm leading-relaxed">{family.description}</p>
          </div>
        )}

        {/* the family at a glance: the share of each archetype in its decks, over all the metagames, beside its popularity over time */}
        {(composition.length > 0 || series?.some(([, decks]) => decks > 0)) && (
          <div id="popularity" className="grid gap-3 lg:grid-cols-[28rem_1fr] items-stretch">
            {/* the pie, and under it two counters, to fill the height of the chart */}
            <div className="flex flex-col gap-3">
              {composition.length > 0 && (
                <div title="Each archetype's share of the family's tournament decks, over all the metagames"
                  className="flex-1 [&>div]:h-full [&>div]:flex [&>div]:items-center">
                  <MetaPie compact shares={composition}
                    listClassName="grid grid-cols-1 gap-y-1.5 content-start max-h-52 overflow-y-auto no-scrollbar" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Played since">{summary.first ? summary.first.slice(0, 4) : '—'}</Stat>
                <Stat label="Current metashare">
                  <span className="inline-flex items-baseline gap-2">
                    {summary.share.toFixed(1)}%
                    {trend && <PopularityTrend share={trend.share} previous={trend.previous} />}
                  </span>
                </Stat>
              </div>
            </div>
            {series?.some(([, decks]) => decks > 0) && (
              <div className="min-w-0">
                <CardPopularityChart series={series} metagamesUrl={POPULARITY_METAGAMES} subject="family" ranked={false}
                  caption={`Share of tournament decks of all the ${family.name} archetypes together, by metagame. Hover for the numbers; click to open it.`} />
              </div>
            )}
          </div>
        )}

        {/* the archetypes, each with its typical list */}
        <section id="archetypes">
          <SectionHeader>Archetypes</SectionHeader>
          <FamilyArchetypes archetypes={sorted} family={family.name} metaMap={metaMap} weights={weights} parts={parts} />
        </section>

        {/* the cards they share */}
        {coreCards.cards.length > 0 && (
          <section id="shared-cards">
            <SectionHeader>Shared cards</SectionHeader>
            <p className="mb-3 text-sm text-gray-500">Cards in the typical list of the most archetypes (in at least half of their decks), basic lands apart. Copies are averaged over each archetype's recent decks.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {cardRows.map(c => {
                const slug = cardLinkSlug(cardPages, c.name)
                const bound = bindPreview(c.name, { slug: slug || undefined, image: c.preview ? imageFor(c.name, c.preview) : undefined, showImage: false })
                const inAll = coreCards.withList > 1 && c.archetypes.length === coreCards.withList
                const played = new Set(c.archetypes.map(a => a.archetype))
                const copies = c.copies / c.weight
                const tile = (
                  <>
                    <div className="relative">
                      {c.preview
                        ? <img src={imageFor(c.name, c.preview)} alt={c.name} loading="lazy"
                            className={`w-full aspect-[488/680] rounded-[4.75%/3.5%] object-cover border transition-colors ${inAll ? 'border-amber-400/70' : 'border-gray-700'} group-hover:border-amber-400`} />
                        : <div className="w-full aspect-[488/680] rounded-[4.75%/3.5%] border border-gray-700 bg-gray-800 flex items-center justify-center p-2 text-center text-sm text-gray-400">{c.name}</div>}
                      {/* the typical number of copies */}
                      <span className="absolute top-1.5 right-1.5 rounded-full bg-gray-900/90 border border-gray-600 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-400 shadow">
                        ×{copies.toFixed(1)}
                      </span>
                    </div>
                    {/* the archetypes playing it: a segment each, lit when it is in its typical list */}
                    <div className="mt-2 flex gap-0.5" aria-hidden="true">
                      {coreCards.listed.map(a => (
                        <span key={a} title={`${a}${played.has(a) ? '' : ' (not in its typical list)'}`}
                          className={`h-1.5 flex-1 rounded-full ${played.has(a) ? 'bg-amber-400' : 'bg-gray-700'}`} />
                      ))}
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-200 group-hover:text-amber-400 transition-colors">{c.name}</p>
                    <p className="text-xs text-gray-500 tabular-nums">
                      {inAll ? <span className="text-amber-400 font-semibold">All {coreCards.withList}</span> : <><span className="text-gray-300 font-semibold">{c.archetypes.length}</span> of {coreCards.withList}</>} archetypes
                    </p>
                  </>
                )
                return slug
                  ? <Link key={c.name} to={`/cards/${slug}`} {...bound} className="group block min-w-0">{tile}</Link>
                  : <div key={c.name} {...bound} className="group block min-w-0">{tile}</div>
              })}
            </div>
            {coreCards.cards.length > CORE_CARDS_SHOWN && (
              <div className="mt-3 text-center">
                <button onClick={() => setAllCards(v => !v)} className="text-sm text-amber-400 hover:text-amber-300 font-semibold">
                  {allCards ? 'Show fewer' : `Show all ${coreCards.cards.length}`}
                </button>
              </div>
            )}
          </section>
        )}

        {/* the tournament decks of every archetype */}
        {allDecks.length > 0 && (
          <section id="decks">
            <SectionHeader>Decks</SectionHeader>
            <FamilyDecks decks={allDecks} archetypes={family.archetypes.map(a => a.name)} />
          </section>
        )}

        {allVideos.length > 0 && (
          <section id="videos">
            <SectionHeader>Videos</SectionHeader>
            <VideosSection videos={allVideos} />
          </section>
        )}
      </div>
      {preview}
    </Layout>
  )
}
