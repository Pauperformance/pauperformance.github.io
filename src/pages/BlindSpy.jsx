import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'

const FIELDS = [
  { key: 'creatures_to_win',  label: 'Opponent Life',          min: 3,  max: 40, def: 20 },
  { key: 'lands_in_deck',     label: 'Lands in Deck',          min: 1,  max: 2,  def: 1  },
  { key: 'drs_in_deck',       label: 'Dread Returns in Deck',  min: 1,  max: 2,  def: 2  },
  { key: 'targets_in_deck',   label: 'Lotleth Giants in Deck', min: 1,  max: 2,  def: 2  },
  { key: 'creatures_in_deck', label: 'Creatures in Deck',      min: 17, max: 37, def: 37 },
  { key: 'blanks_in_deck',    label: 'Blanks in Deck',         min: 0,  max: 15, def: 13 },
]

function range(min, max) {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

const DEFAULT_INPUTS = Object.fromEntries(FIELDS.map(f => [f.key, f.def]))

export default function BlindSpy() {
  const [rawData, setRawData] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)

  useEffect(() => {
    fetch('/data/blind_spy_consolidated.json')
      .then(r => r.json())
      .then(d => { setRawData(d); setDataLoading(false) })
  }, [])

  const lookupMap = useMemo(() => {
    if (!rawData) return null
    const map = {}
    rawData.forEach(r => {
      map[`${r.creatures_to_win}_${r.lands_in_deck}_${r.drs_in_deck}_${r.targets_in_deck}_${r.creatures_in_deck}_${r.blanks_in_deck}`] = r
    })
    return map
  }, [rawData])

  const result = useMemo(() => {
    if (!lookupMap) return null
    const { creatures_to_win, lands_in_deck, drs_in_deck, targets_in_deck, creatures_in_deck, blanks_in_deck } = inputs
    return lookupMap[`${creatures_to_win}_${lands_in_deck}_${drs_in_deck}_${targets_in_deck}_${creatures_in_deck}_${blanks_in_deck}`] || null
  }, [lookupMap, inputs])

  function set(key, value) {
    setInputs(prev => ({ ...prev, [key]: parseInt(value, 10) }))
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Blind Spy</h1>
          <p className="mt-2 text-gray-400 text-sm">Probability Calculator for Non-deterministic Wins</p>
        </div>

        {/* Info box */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4 text-sm leading-relaxed">
          <div>
            <p className="text-base font-semibold text-gray-200 mb-1">Purpose:</p>
            <p className="text-gray-400">
              This calculator computes your probability to win a game with <em className="text-gray-300">Balustrade Spy</em> in a{' '}
              <strong className="text-gray-200">non-deterministic</strong> way (i.e. with some lands left in your deck and some
              luck required), based on deck composition and game state parameters.
              We call this situation <em className="text-gray-300">Blind Spy</em>.
            </p>
          </div>

          <div>
            <p className="text-base font-semibold text-gray-200 mb-1">Limitations and Future Work:</p>
            <p className="text-gray-400">
              The tool <em className="text-gray-300">currently</em> assumes your <strong className="text-gray-200">only</strong> win-condition is a flashback of{' '}
              <em className="text-gray-300">Dread Return</em> targeting a <em className="text-gray-300">Lotleth Giant</em> in the graveyard.
              For this reason, at least 3 creatures (including the <em className="text-gray-300">Balustrade Spy</em> being cast)
              need to be on the battlefield when the mill trigger resolves: these creatures will be the additional
              cost for <em className="text-gray-300">Dread Return</em>.
            </p>
            <p className="text-gray-400 mt-2">
              However, in real games, this <strong className="text-gray-200">will not</strong> often be your only win-condition.
              Another win-condition you might have is the <em className="text-gray-300">Double Spy</em>.
              This situation requires you to have at least 5 creatures (including the <em className="text-gray-300">Balustrade Spy</em>{' '}
              being cast) when the mill trigger resolves.
              At that point, you might be able to flashback <em className="text-gray-300">Dread Return</em>{' '}
              <strong className="text-gray-200">twice</strong>: the 1st time to reanimate another{' '}
              <em className="text-gray-300">Balustrade Spy</em> (and mill again), the 2nd time to reanimate a{' '}
              <em className="text-gray-300">Lotleth Giant</em> for the win (typically deterministic).
              This situation happens frequently and the tool will be evolved to take it into account: more simulations
              are on the way!
            </p>
          </div>

          <div>
            <p className="text-base font-semibold text-gray-200 mb-1">How to use:</p>
            <p className="text-gray-400">
              Enter the game state parameters at the snapshot when the <em className="text-gray-300">Balustrade Spy</em> mill trigger is{' '}
              <strong className="text-gray-200">on the stack, just before resolution</strong>.
            </p>
            <p className="text-gray-400 mt-2">
              * <strong className="text-gray-200">Creatures in Deck</strong> is the number of initial creatures in your mainboard -
              the number of creatures on your battlefield -
              1 (because a <em className="text-gray-300">Lotleth Giant</em> will be reanimated and won't be counted for damage).
              So, for a deck with 41 initial creatures and 3 on the battlefield at combo time, set 37.
            </p>
            <p className="text-gray-400 mt-2">
              * <strong className="text-gray-200">Blanks in Deck</strong> is the total number of cards that are not relevant for the damage count,
              such as <em className="text-gray-300">Winding Way</em>, <em className="text-gray-300">Lead the Stamped</em>,{' '}
              <em className="text-gray-300">Land Grant</em> and <em className="text-gray-300">Lotus Petal</em>.
              Do not count <em className="text-gray-300">Dread Return</em> here.
              So, for a deck with 4 &#123;<em className="text-gray-300">Winding Way</em>, <em className="text-gray-300">Lead the Stamped</em>,{' '}
              <em className="text-gray-300">Land Grant</em>&#125; and 1 <em className="text-gray-300">Lotus Petal</em>, set 13.
            </p>
          </div>

          <div>
            <p className="text-base font-semibold text-gray-200 mb-1">Notes:</p>
            <p className="text-gray-400">
              Every configuration has been simulated 1000000 times and can be used both for Spy Walls and Spy Elves.
            </p>
            <p className="text-gray-400 mt-2">
              <strong className="text-gray-200">
                If you are interested in mastering Spy Walls, a comprehensive guide is available on{' '}
                <a href="https://mfy.gg/guides/view/spy-walls-the-bible-JA8uEV94lKN" target="_blank" rel="noreferrer"
                  className="text-amber-400 hover:underline">Metafy</a>
              </strong>.
            </p>
          </div>
        </div>

        {/* Game State inputs */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Game State</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FIELDS.map(({ key, label, min, max }) => (
              <div key={key} className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-400">{label}</label>
                <select
                  value={inputs[key]}
                  onChange={e => set(key, e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-amber-400 cursor-pointer">
                  {range(min, max).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">Results</h2>
          {dataLoading ? (
            <p className="text-gray-500 text-sm text-center py-6">Loading simulation data… (23 MB)</p>
          ) : !result ? (
            <p className="text-gray-500 text-sm text-center py-6">No simulation data found for this combination.</p>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-900 rounded-xl py-5 px-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Fail %</p>
                <p className="text-4xl font-bold text-amber-300 font-mono">{result['fail_%']}%</p>
              </div>
              <div className="bg-gray-900 rounded-xl py-5 px-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Win %</p>
                <p className="text-4xl font-bold text-amber-300 font-mono">{result['win_%']}%</p>
              </div>
              <div className="bg-gray-900 rounded-xl py-5 px-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Avg creatures in GY</p>
                <p className="text-4xl font-bold text-amber-300 font-mono">{result['avg_creatures_in_gy']}</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-600 text-center pb-4">
          Created by <strong className="text-gray-500">Pauperformance</strong>
          {' · '}
          Based on the{' '}
          <a href="https://hypergeomancer.github.io/creature-selection-calculator/" target="_blank" rel="noreferrer"
            className="text-amber-400/60 hover:text-amber-400 transition-colors">
            interactive calculator for creature selection
          </a>
          {' '}by{' '}
          <a href="https://www.youtube.com/@Hypergeomancer" target="_blank" rel="noreferrer"
            className="text-amber-400/60 hover:text-amber-400 transition-colors">
            Hypergeomancer
          </a>
        </p>
      </div>
    </Layout>
  )
}
