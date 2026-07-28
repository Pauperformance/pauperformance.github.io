import { useState } from 'react'
import Layout from '../components/Layout'
import { resolveDecklist } from '../utils/deckFetch'
import { diffDecks } from '../utils/deckDiff'

const PLACEHOLDER = `https://www.mtggoldfish.com/deck/1234567
https://topdeck.gg/deck/some-event-name/AbCdEfGhIj
https://mtgtop8.com/event?e=12345&d=678901&f=PAU
https://archidekt.com/decks/1234567/some-deck-name

— or paste a plain-text decklist —

4 Lightning Bolt
4 Galvanic Blast
...

Sideboard
2 Pyroblast`

function DiffList({ entries }) {
  if (!entries.length) return <p className="text-gray-500 text-sm">No differences.</p>
  return (
    <ul className="space-y-1 font-mono text-sm">
      {entries.map(({ name, delta }) => (
        <li key={name} className={delta > 0 ? 'text-green-400' : 'text-red-400'}>
          {delta > 0 ? `+${delta}` : delta} {name}
        </li>
      ))}
    </ul>
  )
}

export default function Diff() {
  const [inputA, setInputA] = useState('')
  const [inputB, setInputB] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [mode, setMode] = useState('split')

  async function handleDiff() {
    if (!inputA.trim() || !inputB.trim()) {
      setError('Please fill in both decklists.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const [deckA, deckB] = await Promise.all([resolveDecklist(inputA), resolveDecklist(inputB)])
      setResult({ deckA, deckB })
    } catch (e) {
      setError(e.message || 'Failed to compare decklists.')
    } finally {
      setLoading(false)
    }
  }

  const diff = result ? diffDecks(result.deckA, result.deckB, mode) : null

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Deck Diff</h1>
          <p className="mt-2 text-gray-400 text-sm">Compare two decklists and see what changed.</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-sm text-gray-400 leading-relaxed">
          Paste a plain-text decklist (MTGO/Arena/TopDeck export style), or a link to a{' '}
          <span className="text-gray-200">MTGGoldfish</span>, <span className="text-gray-200">TopDeck</span>,{' '}
          <span className="text-gray-200">mtgtop8</span>, or <span className="text-gray-200">Archidekt</span> deck.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-400">Decklist 1</label>
            <textarea
              value={inputA}
              onChange={e => setInputA(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={13}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono focus:outline-none focus:border-amber-400 resize-y"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-400">Decklist 2</label>
            <textarea
              value={inputB}
              onChange={e => setInputB(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={13}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono focus:outline-none focus:border-amber-400 resize-y"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleDiff}
            disabled={loading}
            className="px-6 py-2 rounded-lg text-sm font-semibold bg-amber-400 text-gray-900 hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Comparing…' : 'Diff'}
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        {diff && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Results</h2>
              <div className="inline-flex rounded-lg border border-gray-600 overflow-hidden text-sm font-medium">
                <button
                  onClick={() => setMode('split')}
                  className={`px-3 py-1.5 transition-colors ${mode === 'split' ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
                  Split
                </button>
                <div className="w-px bg-gray-600" />
                <button
                  onClick={() => setMode('unified')}
                  className={`px-3 py-1.5 transition-colors ${mode === 'unified' ? 'bg-amber-400 text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>
                  Unified
                </button>
              </div>
            </div>

            {mode === 'split' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Maindeck</h3>
                  <DiffList entries={diff.main} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sideboard</h3>
                  <DiffList entries={diff.side} />
                </div>
              </div>
            ) : (
              <DiffList entries={diff.unified} />
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
