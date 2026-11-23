import { useState, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useCardPreview } from '../components/CardPreview'

// A card in a bullet. Links to the card's page on the Academy (an internal
// /cards/<slug> link, written in Myr's announcements.json); older bullets keep
// their Scryfall link. Either way, the card is previewed with its Oracle text on
// hover, and in a bottom sheet on tap on touch devices (see useCardPreview).
function CardLink({ href, children, bindPreview }) {
  if (href?.startsWith('/cards/')) {
    const slug = href.slice('/cards/'.length)
    return <Link to={href} {...bindPreview(nodeText(children), { slug })}>{children}</Link>
  }

  if (href?.match(/scryfall\.com\/card\//)) {
    return <a href={href} target="_blank" rel="noreferrer" {...bindPreview(nodeText(children))}>{children}</a>
  }

  return <a href={href} target="_blank" rel="noreferrer">{children}</a>
}

// The text of a link's children (the card's name).
function nodeText(children) {
  return Array.isArray(children) ? children.join('') : String(children)
}

export default function Announcements() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const { bind: bindPreview, preview } = useCardPreview({ sheet: true })
  // Stable: with new components on every render (the preview opening is one),
  // React would mount the links again, and the preview would be placed by a
  // link that is no longer on the page.
  const mdComponents = useMemo(() => ({
    a: ({ href, children }) => <CardLink href={href} bindPreview={bindPreview}>{children}</CardLink>,
  }), [bindPreview])

  useEffect(() => {
    fetch('/data/announcements.json')
      .then(r => r.json())
      .then(data => { setEntries(data); setLoading(false) })
  }, [])

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="mt-2 text-gray-400 text-sm">The most important events in Pauper history.</p>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading...</p>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-700" />

            <div className="space-y-8">
              {entries.map((entry, i) => (
                <div key={i} className="relative pl-10 group">
                  <div className="absolute left-0 top-1.5 w-7 h-7 rounded-full bg-gray-800 border-2 border-amber-400 group-hover:border-amber-300 flex items-center justify-center transition-colors">
                    <div className="w-2 h-2 rounded-full bg-amber-400 group-hover:bg-amber-300 transition-colors" />
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                    <p className="text-amber-400 font-semibold text-base">{entry.date}</p>
                    {entry.subtitle && (
                      <p className="text-gray-300 font-medium mt-0.5">{entry.subtitle}</p>
                    )}

                    <ul className="mt-3 space-y-1.5">
                      {entry.bullets.map((bullet, j) => (
                        <li key={j} className="flex gap-2 text-sm text-gray-300">
                          <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                          <span className="prose prose-invert prose-sm max-w-none [&_a]:text-amber-400 [&_a]:no-underline [&_a:hover]:underline">
                            <ReactMarkdown components={mdComponents}>{bullet}</ReactMarkdown>
                          </span>
                        </li>
                      ))}
                    </ul>

                    {entry.refs?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700 flex flex-col gap-1">
                        {entry.refs.map((ref, j) => (
                          ref.url
                            ? <a key={j} href={ref.url} target="_blank" rel="noreferrer"
                                className="text-xs text-gray-500 hover:text-amber-400 transition-colors">
                                ↗ {ref.text}
                              </a>
                            : <span key={j} className="text-xs text-gray-500">{ref.text}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {preview}
    </Layout>
  )
}
