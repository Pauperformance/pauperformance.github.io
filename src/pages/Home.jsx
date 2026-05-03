import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import Layout from '../components/Layout'

const PAGES = [
  { to: '/archetypes', label: 'Archetypes Index', description: 'A curated list of the most important Pauper archetypes.' },
  { to: '/sets', label: 'Set Index', description: 'Reference numbers used by Pauperformance to uniquely identify Magic sets.' },
  { to: '/pool', label: 'Pauper Pool', description: 'How the pool of legal Pauper cards has grown over time.' },
  { to: '/timeline', label: 'Format Timeline', description: 'The most important events in Pauper history.' },
]


const NEWS = [
  { flag: '🇬🇧', href: 'https://magic.wizards.com/en/articles/archive/news/march-7-2022-banned-and-restricted-announcement', title: 'MARCH 7, 2022 BANNED AND RESTRICTED ANNOUNCEMENT', author: 'Wizards of the Coast', date: '2022-03-07' },
  { flag: '🇬🇧', href: 'https://magic.wizards.com/en/articles/archive/news/explanation-pauper-bans-march-7-2022', title: 'EXPLANATION OF PAUPER BANS FOR MARCH 7, 2022', author: 'Gavin Verhey', date: '2022-03-07' },
  { flag: '🇬🇧', href: 'https://www.youtube.com/watch?v=orMPmImTFN4', title: 'MTG School Club - Each One Teach One', author: 'Eisenherz', date: '2022-03-05' },
  { flag: '🇬🇧', href: 'https://magic.wizards.com/en/articles/archive/news/january-20-2022-banned-and-restricted-announcement', title: 'JANUARY 20, 2022 BANNED AND RESTRICTED ANNOUNCEMENT', author: 'Gavin Verhey', date: '2022-01-20' },
  { flag: '🇬🇧', href: 'https://magic.wizards.com/en/articles/archive/news/announcing-pauper-format-panel-2022-01-10', title: 'ANNOUNCING THE PAUPER FORMAT PANEL', author: 'Gavin Verhey', date: '2022-01-10' },
]

function StapleLink({ card }) {
  const [pos, setPos] = useState(null)
  const timerRef = useRef(null)

  const show = (e) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setPos({ x: e.clientX, y: e.clientY }), 150)
  }
  const move = (e) => { if (pos) setPos({ x: e.clientX, y: e.clientY }) }
  const hide = () => { clearTimeout(timerRef.current); setPos(null) }

  const imgStyle = pos ? {
    left: pos.x + 220 > window.innerWidth ? pos.x - 220 : pos.x + 16,
    top: Math.max(8, Math.min(pos.y - 80, window.innerHeight - 320)),
  } : null

  return (
    <>
      <a href={card.link} target="_blank" rel="noreferrer"
        onMouseEnter={show} onMouseMove={move} onMouseLeave={hide}
        className="px-2 py-0.5 rounded-md text-xs border bg-gray-800 border-gray-700 text-gray-300 hover:border-amber-400/50 hover:text-amber-400 transition-colors whitespace-nowrap">
        {card.name}
      </a>
      {pos && card.preview && createPortal(
        <img src={card.preview} alt={card.name}
          className="fixed z-50 w-48 rounded-xl shadow-2xl border border-gray-700 pointer-events-none"
          style={imgStyle} />,
        document.body
      )}
    </>
  )
}

function TopDecksSection() {
  const [decks, setDecks] = useState([])

  useEffect(() => {
    fetch('/data/top_decks.json').then(r => r.json()).then(setDecks)
  }, [])

  if (!decks.length) return null

  return (
    <section>
      <h2 className="text-xl font-semibold text-white mb-4">Top Decks</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
        {decks.map(deck => (
          <div key={deck.archetype_name} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-amber-400/50 transition-all group">
            <Link to={`/archetypes/${encodeURIComponent(deck.archetype_name)}`} className="block">
              <div className="aspect-[5/4] bg-gray-900 overflow-hidden mt-[-20px] mb-[-20px] mx-[-5px]" style={{ clipPath: 'inset(30px 15px 20px 15px)' }}>
                {deck.featured_image
                  ? <img src={deck.featured_image} alt={deck.archetype_name} loading="lazy"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No image</div>
                }
              </div>
              <div className="p-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-base font-semibold text-white leading-tight group-hover:text-amber-400 transition-colors line-clamp-2">{deck.archetype_name}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {deck.dominant_mana.map(m => (
                      <img key={m} src={`/images/mana/${m}.png`} alt={m} className="w-3.5 h-3.5" />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
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
                  <StapleLink key={card.name} card={card} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

const CHART_COLORS = [
  '#ff6a39', '#e6a65d', '#956c58', '#ff9e78', '#c87340',
  '#d4855a', '#ffb899', '#7a4a46', '#b07060',
]
const OTHER_COLOR = '#3d2a2b'
const SHOWN_SLICES = 8

function MetagameSection() {
  const [data, setData] = useState([])

  useEffect(() => {
    fetch('/data/metagame.json')
      .then(r => r.json())
      .then(setData)
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
      <h2 className="text-xl font-semibold text-white mb-4">Metagame Snapshot</h2>
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-full sm:w-56 shrink-0 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const { name, value } = payload[0].payload
                  return (
                    <div style={{ background: '#261819', border: '1px solid #3d2a2b', borderRadius: 8, padding: '8px 12px' }}>
                      <p style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 2 }}>{name}</p>
                      <p style={{ color: '#e5e7eb', fontSize: 13 }}>{value}%</p>
                    </div>
                  )
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 min-w-0 grid sm:grid-flow-col sm:grid-rows-10 gap-x-6 gap-y-1.5">
            {data.map((entry, i) => {
              const color = i < SHOWN_SLICES ? CHART_COLORS[i] : OTHER_COLOR
              const pct = +entry.meta_share.toFixed(1)
              const maxShare = data[0].meta_share
              return (
                <div key={entry.archetype_name} className="flex items-center gap-2 group">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <Link
                    to={`/archetypes/${encodeURIComponent(entry.archetype_name)}`}
                    className="text-sm text-gray-300 hover:text-amber-400 transition-colors truncate min-w-0 flex-1"
                  >
                    {entry.archetype_name}
                  </Link>
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(pct / maxShare) * 100}%`, background: color }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                  </div>
                  <span className="sm:hidden text-xs text-gray-400 shrink-0">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function PageCard({ to, href, label, description }) {
  const cls = 'block bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-amber-400/50 transition-all group'
  const inner = (
    <>
      <p className="font-semibold text-white group-hover:text-amber-400 transition-colors">{label}</p>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </>
  )
  return to
    ? <Link to={to} className={cls}>{inner}</Link>
    : <a href={href} className={cls}>{inner}</a>
}

export default function Home() {
  return (
    <Layout>
      <div className="space-y-12">
        <section className="bg-amber-950/40 border border-amber-400/40 rounded-xl p-4 text-sm text-amber-300">
          🚧 We are currently restructuring the website. Some pages might be temporarily unavailable.
        </section>

        <section>
          <p className="text-lg text-gray-300 leading-relaxed">
            Hello Pauper player, and welcome to the <strong className="text-white">Academy</strong>!
          </p>
          <p className="mt-4 text-gray-400 leading-relaxed">
            This website aims to be the online encyclopedia for Pauper, collecting and organising resources
            for players with different skill levels. The Academy is currently under construction — read the{' '}
            <a href="./pages/faq.html" className="text-amber-400 hover:underline">FAQs</a>{' '}
            to learn more about this project and its roadmap.
          </p>
        </section>


        <section className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">Current code</p>
          <p className="text-2xl font-bold text-white">
            1069 <span className="text-base font-normal text-gray-400">— Secrets of Strixhaven</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">Released 2026-04-24</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Pages</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAGES.map(p => <PageCard key={p.label} {...p} />)}
          </div>
        </section>

        <TopDecksSection />

        <MetagameSection />

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Newspauper</h2>
          <div className="divide-y divide-gray-700 border border-gray-700 rounded-xl overflow-hidden">
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
