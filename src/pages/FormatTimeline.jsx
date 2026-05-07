import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import Layout from '../components/Layout'

function CardLink({ href, children }) {
  const [pos, setPos] = useState(null)
  const match = href?.match(/scryfall\.com\/card\/([^/]+)\/(\d+)/)

  if (!match) {
    return <a href={href} target="_blank" rel="noreferrer">{children}</a>
  }

  const [, set, num] = match
  const imgUrl = `https://api.scryfall.com/cards/${set}/${num}?format=image&version=normal`

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && createPortal(
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: pos.x + 16,
            top: Math.max(8, pos.y - 180),
          }}
        >
          <img src={imgUrl} alt="" className="w-44 rounded-xl shadow-2xl border border-gray-700" />
        </div>,
        document.body
      )}
    </a>
  )
}

const mdComponents = {
  a: ({ href, children }) => <CardLink href={href}>{children}</CardLink>
}

export default function FormatTimeline() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/timeline.json')
      .then(r => r.json())
      .then(data => { setEntries(data); setLoading(false) })
  }, [])

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Format Timeline</h1>
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
    </Layout>
  )
}
