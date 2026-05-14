import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'

const FIELDS = [
  { key: 'creatures_on_board', label: 'Creatures on Board',       min: 3,  max: 5,  def: 3, maxLabel: '5+' },
  { key: 'lands_in_deck',      label: 'Lands in Deck',            min: 1,  max: 2,  def: 1  },
  { key: 'drs_in_deck',        label: 'Dread Returns in Deck',    min: 1,  max: 2,  def: 2  },
  { key: 'giants_in_deck',     label: 'Lotleth Giants in Deck',   min: 1,  max: 2,  def: 2  },
  { key: 'spies_in_deck',      label: 'Balustrade Spies in Deck', min: 0,  max: 3,  def: 3  },
  { key: 'creatures_in_deck',  label: 'Other Creatures in Deck',  min: 17, max: 38, def: 34 },
]

function range(min, max) {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

const DEFAULT_INPUTS = Object.fromEntries(FIELDS.map(f => [f.key, f.def]))

const LIFE_MIN = 3
const LIFE_MAX = 82
const LIFE_DEF = 20

export default function BlindSpy() {
  const [rawData, setRawData] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)
  const [opponentLife, setOpponentLife] = useState(LIFE_DEF)

  useEffect(() => {
    fetch('/data/blind_spy_full_consolidated.json')
      .then(r => r.json())
      .then(d => { setRawData(d); setDataLoading(false) })
  }, [])

  const lookupMap = useMemo(() => {
    if (!rawData) return null
    const map = {}
    rawData.forEach(r => {
      map[`${r.creatures_on_board}_${r.lands_in_deck}_${r.drs_in_deck}_${r.giants_in_deck}_${r.spies_in_deck}_${r.creatures_in_deck}`] = r
    })
    return map
  }, [rawData])

  const result = useMemo(() => {
    if (!lookupMap) return null
    const { creatures_on_board, lands_in_deck, drs_in_deck, giants_in_deck, spies_in_deck, creatures_in_deck } = inputs
    return lookupMap[`${creatures_on_board}_${lands_in_deck}_${drs_in_deck}_${giants_in_deck}_${spies_in_deck}_${creatures_in_deck}`] || null
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
            <p className="text-base font-semibold text-gray-200 mb-1">Winning Lines:</p>
            <p className="text-gray-400">
              During a <em className="text-gray-300">Blind Spy</em>, your <strong className="text-gray-200">usual</strong> win-condition is a flashback of{' '}
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
            </p>
            <p className="text-gray-400 mt-2">
              Yet another win-condition you might have is the <em className="text-gray-300">Double Giant</em>.
              This situation requires you to have at least 5 creatures (including the <em className="text-gray-300">Balustrade Spy</em>{' '}
              being cast) when the mill trigger resolves.
              At that point, you might be able to flashback <em className="text-gray-300">Dread Return</em>{' '}
              <strong className="text-gray-200">twice</strong>, to reanimate two different {' '}
              <em className="text-gray-300">Lotleth Giants</em> for the win.
              You might be forced to follow this winning line if, for example, you have not milled a <em className="text-gray-300">Balustrade Spy</em> and/or only one <em className="text-gray-300">Lotleth Giant</em> is not enough to win.
            </p>
            <p className="text-gray-400 mt-2">
              These situations happen frequently and the tool takes all of them into account!
              You can find a recap of the possible strategies implemented by the tool{' '}
                <a href="https://docs.google.com/spreadsheets/d/18xDeWn4Xl49WQNfKuFoKms785DGDeiP6dfzDv0W3zTA/edit?gid=0#gid=0" target="_blank" rel="noreferrer"
                  className="text-amber-400 hover:underline">here</a>.
            </p>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-200 mb-1">How to use:</p>
            <p className="text-gray-400">
              Enter the game state parameters at the snapshot when the <em className="text-gray-300">Balustrade Spy</em> mill trigger is{' '}
              <strong className="text-gray-200">on the stack, just before resolution</strong>.
            </p>
            <p className="text-gray-400 mt-2">
              * <strong className="text-gray-200">Creatures on Board</strong> is the number creatures on your board, including the Balustrade Spy triggering the ability.
            </p>
            <p className="text-gray-400 mt-2">
              * <strong className="text-gray-200">Other Creatures in Deck</strong> is the number of remaining creatures in your deck. Do not count <em className="text-gray-300">Lotleth Giant</em> and <em className="text-gray-300">Double Spy</em>, as they have their dedicated fields.
            </p>
            <p className="text-gray-400 mt-2">
              For example, for the{' '}
                <a href="https://www.mtggoldfish.com/deck/7662534#online" target="_blank" rel="noreferrer"
                  className="text-amber-400 hover:underline">4-land deck used for our guide</a> (41 total creatures), we initially set at combo time: 3 <em className="text-gray-300">Creatures on Board</em>, 2 <em className="text-gray-300">Lotleth Giants in Deck</em>, 3 <em className="text-gray-300">Balustrade Spies in Deck</em> and 34 <em className="text-gray-300">Other Creatures in Deck</em>.
            </p>
          </div>

          <div>
            <p className="text-base font-semibold text-gray-200 mb-1">Notes:</p>
            <p className="text-gray-400">
              Every configuration has been simulated 1,000,000 times and can be used both for any Spy variant.
            </p>
            <p className="text-gray-400 mt-2">
              <strong className="text-gray-200">
                If you are interested in mastering Spy Walls, a comprehensive guide by the Pauperformance team is available on{' '}
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
            {FIELDS.map(({ key, label, min, max, maxLabel }) => (
              <div key={key} className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-400">{label}</label>
                <select
                  value={inputs[key]}
                  onChange={e => set(key, e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-amber-400 cursor-pointer">
                  {range(min, max).map(v => (
                    <option key={v} value={v}>{maxLabel && v === max ? maxLabel : v}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-400">Opponent Life</label>
              <select
                value={opponentLife}
                onChange={e => setOpponentLife(parseInt(e.target.value, 10))}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-amber-400 cursor-pointer">
                {range(LIFE_MIN, LIFE_MAX).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">Results</h2>
          {dataLoading ? (
            <p className="text-gray-500 text-sm text-center py-6">Loading simulation data…</p>
          ) : !result ? (
            <p className="text-gray-500 text-sm text-center py-6">No simulation data found for this combination.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-center max-w-sm mx-auto">
              <div className="bg-gray-900 rounded-xl py-5 px-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Win %</p>
                <p className="text-4xl font-bold text-amber-300 font-mono">
                  {(result[`win_${opponentLife}%`] * 100).toFixed(2)}%
                </p>
              </div>
              <div className="bg-gray-900 rounded-xl py-5 px-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Lose %</p>
                <p className="text-4xl font-bold text-amber-300 font-mono">
                  {(result[`lose_${opponentLife}%`] * 100).toFixed(2)}%
                </p>
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
