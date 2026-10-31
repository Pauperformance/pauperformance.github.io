import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import CardLink from '../components/PoolCardLink'
import MetaPie from '../components/MetaPie'
import ShareChange from '../components/ShareChange'
import { useCardPreview } from '../components/CardPreview'
import { useCardPages, cardLinkSlug } from '../utils/cardPages'
import { nameToSlug, metagameSlug } from '../utils/slugs'
import { formatDate } from '../utils/dates'

// A metagame: the archetypes its classified decks played (Myr's
// export_metagames), from /data/metagames/<p13m>.<label>.json.

// Archetypes played by fewer of the metagame's decks (%) are hidden: they
// count in the pie's Other slice, and are listed on demand.
const MIN_SHARE = 1
// Fewer decks than this make for shaky shares: the page says so.
const SMALL_SAMPLE = 100

// Every event of the metagame, the set giving it its label first, then its
// B&R announcements (as on the Metagame Index).
function metagameTitle(m) {
  const sets = [...m.sets].sort((a, b) => (b.scryfall_code === m.metagame.label) - (a.scryfall_code === m.metagame.label))
  const events = [...sets.map(s => s.name), ...m.bans.map(b => b.subtitle)]
  return events.length ? events.join(' + ') : m.metagame.name
}

function MetagameNav({ metagame, direction }) {
  if (!metagame) return <span />
  const previous = direction === 'previous'
  return (
    <Link to={`/metagames/${metagameSlug(metagame)}`} title={metagame.name}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-sm text-gray-300 hover:border-amber-400/50 hover:text-amber-400 transition-colors ${previous ? '' : 'flex-row-reverse'}`}>
      <span className="text-lg leading-none">{previous ? '‹' : '›'}</span>
      <span className="font-mono">{metagame.metagame}.{metagame.label}</span>
    </Link>
  )
}

// A counter; with onToggle, a button opening (open) or closing what it counts.
function Stat({ value, label, onToggle, open }) {
  const content = (
    <>
      <span className="text-3xl font-bold text-amber-400 tabular-nums leading-none">{value.toLocaleString()}</span>
      <span className="text-xs text-gray-400 uppercase tracking-widest text-center">
        {label}{onToggle && <span className="ml-1 text-gray-600">{open ? '▲' : '▼'}</span>}
      </span>
    </>
  )
  return onToggle
    ? <button onClick={onToggle} aria-expanded={open}
        className="flex flex-col items-center gap-1 py-1 rounded-lg hover:bg-gray-750 transition-colors">{content}</button>
    : <div className="flex flex-col items-center gap-1 py-1">{content}</div>
}

// The counters' grid, by how many there are: one row from sm up (from lg for
// five or six, three per row below)
const STAT_COLUMNS = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-3 lg:grid-cols-5', 6: 'grid-cols-3 lg:grid-cols-6',
}

// The cards of some of the metagame's events (its sets, or its B&Rs), under
// each event's name when there are several.
function EventCards({ events, cards, name, tone, bindPreview }) {
  const shown = events.filter(e => cards(e).length)
  return shown.map(e => (
    <div key={name(e)}>
      {shown.length > 1 && <p className="text-sm text-white mb-2">{name(e)}</p>}
      <div className="flex flex-wrap gap-2">
        {cards(e).map(card => <CardLink key={card.name} card={card} tone={tone} bindPreview={bindPreview} />)}
      </div>
    </div>
  ))
}

// The lists of cards a counter opens: the cards the metagame's sets brought to
// the pool, and those its B&Rs banned and unbanned.
const CARD_LISTS = {
  new: { label: 'New Pauper Cards', events: m => m.sets, cards: s => s.cards, name: s => s.name },
  banned: {
    label: 'Banned', events: m => m.bans, cards: b => b.banned.map(name => ({ name })), name: b => b.subtitle, tone: 'banned',
  },
  unbanned: {
    label: 'Unbanned', events: m => m.bans, cards: b => b.unbanned.map(name => ({ name })), name: b => b.subtitle, tone: 'unbanned',
  },
}

function countCards(metagame, key) {
  const list = CARD_LISTS[key]
  return list.events(metagame).reduce((sum, e) => sum + list.cards(e).length, 0)
}

// The metagame's counters: its new, banned and unbanned cards (each listed on
// demand: a set brings dozens) and, where it has decks, its decks, tournaments
// and archetypes.
function Counters({ metagame, bindPreview }) {
  // the counter whose cards are listed
  const [open, setOpen] = useState(null)
  const stats = [
    ...(metagame.sets.length ? [{ key: 'new', value: countCards(metagame, 'new') }] : []),
    ...['banned', 'unbanned'].map(key => ({ key, value: countCards(metagame, key) })).filter(s => s.value > 0),
    ...(metagame.decks ? [
      { key: 'decks', label: 'Decks', value: metagame.decks },
      { key: 'tournaments', label: 'Tournaments', value: metagame.tournaments },
      { key: 'archetypes', label: 'Archetypes', value: metagame.archetypes.length },
    ] : []),
  ]
  // B&Rs changing which cards are legal without banning or unbanning any
  const otherBans = metagame.bans.filter(b => !b.banned.length && !b.unbanned.length)
  if (!stats.length && !otherBans.length) return null
  const list = open && CARD_LISTS[open]
  return (
    <section className="bg-gray-800 border border-gray-700 rounded-xl px-6 py-6">
      {stats.length > 0 && (
        <div className={`grid ${STAT_COLUMNS[stats.length]} gap-4 ${stats.length > 4 ? 'lg:divide-x' : 'sm:divide-x'} divide-gray-700`}>
          {stats.map(s => (
            <Stat key={s.key} value={s.value} label={s.label || CARD_LISTS[s.key].label}
              onToggle={CARD_LISTS[s.key] && s.value > 0 ? () => setOpen(o => o === s.key ? null : s.key) : undefined}
              open={open === s.key} />
          ))}
        </div>
      )}
      {metagame.decks > 0 && metagame.decks < SMALL_SAMPLE && (
        <p className="mt-4 text-center text-xs text-gray-500">
          Few decklists were recorded in this metagame: take the shares with a grain of salt.
        </p>
      )}
      {otherBans.map(b => (
        <p key={b.announced} className={`${stats.length ? 'mt-4 ' : ''}text-center text-xs text-gray-500`}>
          {b.subtitle}: changed which cards are legal in the format.
        </p>
      ))}
      {list && (
        <div className="mt-5 pt-5 border-t border-gray-700 space-y-4">
          <EventCards events={list.events(metagame)} cards={list.cards} name={list.name} tone={list.tone} bindPreview={bindPreview} />
        </div>
      )}
    </section>
  )
}

// A card the archetype played: links to its card page and previews it on
// hover; plain text for a card without a page.
function TopCard({ card, cardPages, bindPreview }) {
  const slug = cardLinkSlug(cardPages, card.name)
  const handlers = bindPreview(card.name, { slug: slug || undefined, image: card.preview })
  const cls = `truncate min-w-0 ${card.banned ? 'text-red-300/80' : 'text-gray-300'}`
  return (
    <div className="flex items-baseline gap-2 text-[13px]" title={card.banned ? 'Banned in Pauper today' : undefined}>
      {slug
        ? <Link to={`/cards/${slug}`} {...handlers} className={`${cls} hover:text-amber-400 transition-colors`}>{card.name}</Link>
        : <span {...handlers} className={cls}>{card.name}</span>}
      <span className="ml-auto shrink-0 text-xs text-gray-500 tabular-nums"
        title={`Played by ${Math.round(card.play_rate * 100)}% of the decks, ${card.average} copies on average`}>
        {Math.round(card.play_rate * 100)}%
      </span>
    </div>
  )
}

function ArchetypeCard({ archetype, rank, cardPages, bindPreview }) {
  const to = `/archetypes/${nameToSlug(archetype.name)}`
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col hover:border-amber-400/50 transition-colors group">
      {/* phones: a wide banner; wider: narrower boxes, so a taller one */}
      <Link to={to} className="relative block aspect-[3/1] sm:aspect-[2/1] bg-gray-900 overflow-hidden">
        {archetype.featured_image
          // Scryfall's art crop of the same card: the artwork without its frame
          ? <img src={archetype.featured_image.replace('/normal/', '/art_crop/')} alt={archetype.name} loading="lazy"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
          : <div className="absolute inset-0 bg-gray-750" />}
        <span className="absolute top-2 left-2 rounded-md bg-gray-900/85 px-2 py-0.5 text-sm font-bold font-mono text-gray-200">#{rank}</span>
        {archetype.game_type.length > 0 && (
          <div className="absolute top-2 right-2 flex gap-1">
            {archetype.game_type.map(g => (
              <span key={g} className="text-[11px] text-gray-100 bg-gray-900/85 rounded-md px-1.5 py-0.5 leading-none">{g}</span>
            ))}
          </div>
        )}
      </Link>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link to={to} className="truncate min-w-0 font-semibold text-white hover:text-amber-400 transition-colors">{archetype.name}</Link>
          <div className="flex shrink-0 items-center gap-0.5">
            {archetype.dominant_mana.map(m => <img key={m} src={`/images/mana/${m}.png`} alt={m} className="w-4 h-4" />)}
          </div>
          <span className="ml-auto shrink-0 text-lg text-amber-400 font-mono tabular-nums">{archetype.meta_share.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {archetype.decks} deck{archetype.decks === 1 ? '' : 's'} · {archetype.tournaments} tournament{archetype.tournaments === 1 ? '' : 's'}
          </span>
          <span className="ml-auto"><ShareChange share={archetype.meta_share} previous={archetype.previous_share} /></span>
        </div>
        <div className="border-t border-gray-700 pt-2 space-y-1">
          {archetype.cards.length > 0
            ? archetype.cards.map(card => <TopCard key={card.name} card={card} cardPages={cardPages} bindPreview={bindPreview} />)
            : <p className="text-xs text-gray-500">Decks that fit no archetype, all brewed differently.</p>}
        </div>
      </div>
    </div>
  )
}

// The archetypes under MIN_SHARE, as a compact table.
function SmallArchetypes({ archetypes }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-700/50">
          {archetypes.map(a => (
            <tr key={a.name}>
              <td className="px-4 py-1.5">
                <Link to={`/archetypes/${nameToSlug(a.name)}`} className="text-gray-300 hover:text-amber-400 transition-colors">{a.name}</Link>
              </td>
              <td className="px-4 py-1.5 text-right text-xs text-gray-500 tabular-nums whitespace-nowrap">{a.decks} deck{a.decks === 1 ? '' : 's'}</td>
              <td className="px-4 py-1.5 text-right text-xs text-gray-400 tabular-nums whitespace-nowrap w-16">{a.meta_share.toFixed(1)}%</td>
              <td className="px-4 py-1.5 text-right whitespace-nowrap w-20"><ShareChange share={a.meta_share} previous={a.previous_share} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MetagamePage() {
  const { code } = useParams()
  const [metagame, setMetagame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showSmall, setShowSmall] = useState(false)
  const cardPages = useCardPages()
  // on phones a tap on a card opens its preview in a bottom sheet
  const { bind: bindPreview, preview } = useCardPreview({ sheet: true })

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setMetagame(null)
    setShowSmall(false)
    // the previous and next links keep the scroll position otherwise
    window.scrollTo(0, 0)
    fetch(`/data/metagames/${code.toLowerCase()}.json`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setMetagame(data); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [code])

  const shown = metagame ? metagame.archetypes.filter(a => a.meta_share >= MIN_SHARE) : []
  const small = metagame ? metagame.archetypes.slice(shown.length) : []

  return (
    <Layout>
      <div className="space-y-8">
        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {notFound && (
          <p className="text-gray-400">
            Metagame not found.{' '}
            <Link to="/metagames" className="text-amber-400 hover:text-amber-300">Back to the Metagame Index</Link>
          </p>
        )}

        {metagame && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Link to="/metagames" className="text-sm text-gray-400 hover:text-amber-400 transition-colors">← Metagame Index</Link>
                <div className="flex gap-2">
                  <MetagameNav metagame={metagame.previous} direction="previous" />
                  <MetagameNav metagame={metagame.next} direction="next" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{metagameTitle(metagame)}</h1>
                <p className="mt-2 text-sm text-gray-400">
                  Metagame <span className="text-amber-400 font-mono">{metagame.metagame.metagame}.{metagame.metagame.label}</span>
                  {' · '}
                  {metagame.next
                    ? <>From {formatDate(metagame.metagame.date)} to {formatDate(metagame.next.date)}</>
                    : <>Since {formatDate(metagame.metagame.date)}: the current metagame</>}
                  {/* B&Rs take effect some days after they're announced */}
                  {metagame.bans.filter(b => b.announced !== metagame.metagame.date).map(b => (
                    <span key={b.announced}> · {metagame.bans.length > 1 && `${b.subtitle} `}announced {formatDate(b.announced)}</span>
                  ))}
                </p>
              </div>
            </div>

            <Counters metagame={metagame} bindPreview={bindPreview} />

            {metagame.decks === 0 ? (
              <p className="text-gray-400 text-sm">No classified decklists from this metagame.</p>
            ) : (
              <>
                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">Bake into a Pie</h2>
                  <MetaPie
                    shares={metagame.archetypes.map(a => ({ archetype_name: a.name, meta_share: a.meta_share }))}
                    minListedShare={MIN_SHARE}
                    listClassName="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 content-start" />
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white mb-1">Archetypes</h2>
                  <p className="text-sm text-gray-400 mb-4">
                    Archetypes with at least {MIN_SHARE}% of the decks, with popularity change since the previous
                    metagame{metagame.previous && (
                      <>
                        {' '}(<Link to={`/metagames/${metagameSlug(metagame.previous)}`}
                          className="text-amber-400 hover:text-amber-300 transition-colors">
                          <span className="font-mono">{metagame.previous.metagame}.{metagame.previous.label}</span>, {metagame.previous.name}
                        </Link>)
                      </>
                    )}.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {shown.map((a, i) => (
                      <ArchetypeCard key={a.name} archetype={a} rank={i + 1} cardPages={cardPages} bindPreview={bindPreview} />
                    ))}
                  </div>
                  {small.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-center">
                        <button onClick={() => setShowSmall(s => !s)}
                          className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-sm text-gray-300 hover:border-amber-400/50 hover:text-amber-400 transition-colors">
                          {showSmall
                            ? 'Hide the smaller archetypes'
                            : `Show ${small.length} archetype${small.length === 1 ? '' : 's'} under ${MIN_SHARE}%`}
                        </button>
                      </div>
                      {showSmall && <SmallArchetypes archetypes={small} />}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>
      {preview}
    </Layout>
  )
}
