import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Layout from '../components/Layout'

const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']
const LANG_FLAG = {
  en: '🇬🇧', eng: '🇬🇧',
  it: '🇮🇹', ita: '🇮🇹', IT: '🇮🇹',
}

function ManaIcon({ color }) {
  return (
    <img src={`/images/mana/${color}.png`} alt={color}
      className="w-5 h-5 inline-block" />
  )
}

function SectionHeader({ children }) {
  return <h2 className="text-lg font-semibold text-white mb-3 pb-2 border-b border-gray-700">{children}</h2>
}

function CardGallery({ cards }) {
  if (!cards?.length) return <p className="text-gray-500 text-sm">None listed.</p>
  return (
    <div className="flex flex-wrap gap-2">
      {cards.map(card => (
        <a key={card.name} href={card.link} target="_blank" rel="noreferrer"
          title={card.name}
          className="group relative shrink-0">
          <img src={card.preview} alt={card.name}
            className="h-32 rounded-lg shadow border border-gray-700 group-hover:border-amber-400 transition-colors object-cover" />
        </a>
      ))}
    </div>
  )
}

function DecksTable({ decks, referenceNames }) {
  if (!decks?.length) return <p className="text-gray-500 text-sm">No decks recorded.</p>

  const ref = decks.filter(d => d.is_reference)
  const other = decks.filter(d => !d.is_reference)

  return (
    <div className="space-y-4">
      {ref.length > 0 && (
        <div>
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-2">Reference decks</p>
          <DeckRows decks={ref} />
        </div>
      )}
      {other.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Other decks</p>
          <DeckRows decks={other} />
        </div>
      )}
    </div>
  )
}

function DeckRows({ decks }) {
  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 border-b border-gray-700">
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Set</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Legal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {decks.map(deck => (
            <tr key={deck.name} className="bg-gray-900 hover:bg-gray-800 transition-colors">
              <td className="px-4 py-2.5">
                <a href={deck.url} target="_blank" rel="noreferrer"
                  className="text-amber-400 hover:underline font-medium">{deck.name}</a>
              </td>
              <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{deck.set_name}</td>
              <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{deck.set_date}</td>
              <td className="px-4 py-2.5">
                {deck.legal
                  ? <span className="text-green-400">✅</span>
                  : <span className="text-red-400" title="Banned">🔨 Ban</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VideosSection({ videos }) {
  if (!videos?.length) return <p className="text-gray-500 text-sm">No videos recorded.</p>
  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 border-b border-gray-700">
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">🗣️</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Title</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Author</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {videos.map(v => (
            <tr key={v.link} className="bg-gray-900 hover:bg-gray-800 transition-colors">
              <td className="px-4 py-2.5 text-base">{LANG_FLAG[v.language] ?? v.language}</td>
              <td className="px-4 py-2.5">
                <a href={v.link} target="_blank" rel="noreferrer"
                  className="text-amber-400 hover:underline">{v.title}</a>
              </td>
              <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{v.phd_name}</td>
              <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{v.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ResourcesSection({ resources, discord, sideboard }) {
  const hasAny = resources?.length || discord?.length || sideboard

  if (!hasAny) return <p className="text-gray-500 text-sm">No resources listed.</p>

  return (
    <div className="space-y-3">
      {sideboard && (
        <a href={sideboard.link} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 text-sm text-amber-400 hover:underline">
          📋 Sideboard guide
        </a>
      )}
      {discord?.length > 0 && discord.map(d => (
        <a key={d.link} href={d.link} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 text-sm text-amber-400 hover:underline">
          💬 {d.name}
        </a>
      ))}
      {resources?.length > 0 && (
        <div className="border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">🗣️</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Author</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {resources.map(r => (
                <tr key={r.link} className="bg-gray-900 hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-2.5 text-base">{r.language}</td>
                  <td className="px-4 py-2.5">
                    <a href={r.link} target="_blank" rel="noreferrer"
                      className="text-amber-400 hover:underline">{r.name}</a>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{r.author}</td>
                  <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function ArchetypePage() {
  const { name } = useParams()
  const decodedName = decodeURIComponent(name)
  const [data, setData] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/data/archetype-details/${encodeURIComponent(decodedName)}.json`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null }
        return r.json()
      })
      .then(d => d && setData(d))
  }, [decodedName])

  if (notFound) return (
    <Layout>
      <div className="text-center py-20">
        <p className="text-gray-400">Archetype <strong className="text-white">{decodedName}</strong> not found.</p>
        <Link to="/archetypes" className="mt-4 inline-block text-amber-400 hover:underline text-sm">← Back to index</Link>
      </div>
    </Layout>
  )

  if (!data) return (
    <Layout>
      <div className="text-center py-20 text-gray-500 text-sm">Loading...</div>
    </Layout>
  )

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <Link to="/archetypes" className="text-xs text-gray-500 hover:text-amber-400 transition-colors mb-3 inline-block">
            ← Archetypes Index
          </Link>
          <h1 className="text-3xl font-bold text-white">{data.name}</h1>
          {data.aliases?.length > 0 && (
            <p className="mt-1 text-sm text-gray-400">Also known as: {data.aliases.join(', ')}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="flex gap-1">
              {MANA_ORDER.filter(m => data.dominant_mana.includes(m)).map(m => (
                <ManaIcon key={m} color={m} />
              ))}
            </div>
            <div className="flex gap-2">
              {data.game_type.map(t => (
                <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300">{t}</span>
              ))}
            </div>
            {data.family && (
              <span className="text-xs text-gray-500">Family: <span className="text-gray-300">{data.family}</span></span>
            )}
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{data.description}</ReactMarkdown>
          </div>
        )}

        {/* Staples */}
        <section>
          <SectionHeader>Staples</SectionHeader>
          <CardGallery cards={data.staples} />
        </section>

        {/* Frequent cards */}
        {data.frequent?.length > 0 && (
          <section>
            <SectionHeader>Frequent cards</SectionHeader>
            <CardGallery cards={data.frequent} />
          </section>
        )}

        {/* Decks */}
        <section>
          <SectionHeader>Decks</SectionHeader>
          <DecksTable decks={data.decks} />
        </section>

        {/* Videos */}
        <section>
          <SectionHeader>Videos</SectionHeader>
          <VideosSection videos={data.videos} />
        </section>

        {/* Resources */}
        <section>
          <SectionHeader>Resources</SectionHeader>
          <ResourcesSection
            resources={data.resources}
            discord={data.resources_discord}
            sideboard={data.resource_sideboard}
          />
        </section>
      </div>
    </Layout>
  )
}
