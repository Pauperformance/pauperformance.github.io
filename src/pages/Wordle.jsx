import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { nameToSlug } from '../utils/slugs'
import data from '../data/wordle.json'
import { loadCardImages, useArtwork } from '../utils/artwork'
import { useCardPreview } from '../components/CardPreview'

const ROWS = 6
const COLS = 5
const STORAGE = 'pauperformance-wordle'
const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-']

const ANSWERS = data.answers
const VALID = new Set(data.valid.split(' '))

// A random word, not one of the last ones played (all of them are forgotten once they have been)
function pickWord(seen) {
  let pool = ANSWERS.filter(w => !seen.includes(w))
  if (!pool.length) pool = ANSWERS
  return pool[Math.floor(Math.random() * pool.length)]
}
function newGame(seen) {
  const word = pickWord(seen)
  return { word, guesses: [], seen: ANSWERS.every(w => seen.includes(w) || w === word) ? [word] : [...seen, word] }
}

// 'c' correct, 'p' present, 'a' absent, as in the original: a letter is marked present as many times as it is left in the answer
function evaluate(guess, answer) {
  const res = Array(COLS).fill('a')
  const left = {}
  for (let i = 0; i < COLS; i++) {
    if (guess[i] === answer[i]) res[i] = 'c'
    else left[answer[i]] = (left[answer[i]] || 0) + 1
  }
  for (let i = 0; i < COLS; i++) {
    if (res[i] === 'c') continue
    if (left[guess[i]] > 0) { res[i] = 'p'; left[guess[i]]-- }
  }
  return res
}

const TILE_COLOR = {
  c: 'bg-[#538d4e] border-[#538d4e] text-white',
  p: 'bg-[#b59f3b] border-[#b59f3b] text-white',
  a: 'bg-[#3a3a3c] border-[#3a3a3c] text-white',
}
const RANK = { a: 1, p: 2, c: 3 }

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode: it just isn't kept */ }
}
const EMPTY_STATS = { played: 0, wins: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0] }

function Tile({ letter, state, revealIndex, pop }) {
  const revealed = !!state
  return (
    <div
      className={`wordle-tile aspect-square flex items-center justify-center text-3xl font-bold uppercase border-2 select-none ${
        revealed ? TILE_COLOR[state] : letter ? 'border-gray-500 text-white' : 'border-gray-700 text-white'
      } ${pop ? 'wordle-pop' : ''} ${revealed && revealIndex != null ? 'wordle-flip' : ''}`}
      style={revealed && revealIndex != null ? { animationDelay: `${revealIndex * 300}ms` } : undefined}>
      {letter}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-gray-900 border border-gray-700 p-5" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl leading-none">×</button>
        <h2 className="text-center text-lg font-bold text-white uppercase tracking-wide mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function Example({ word, index, state, text }) {
  return (
    <div className="mb-3">
      <div className="flex gap-1 mb-1">
        {word.split('').map((l, i) => (
          <div key={i} className={`w-9 h-9 flex items-center justify-center text-xl font-bold uppercase border-2 ${i === index ? TILE_COLOR[state] : 'border-gray-600 text-white'}`}>{l}</div>
        ))}
      </div>
      <p className="text-sm text-gray-300"><b>{word[index].toUpperCase()}</b> {text}</p>
    </div>
  )
}

function Help({ onClose }) {
  return (
    <Modal title="How to play" onClose={onClose}>
      <p className="text-sm text-gray-300 mb-1">Guess the <b>Pauper word</b> in six tries.</p>
      <ul className="text-sm text-gray-300 list-disc pl-5 mb-4 space-y-1">
        <li>Each guess must be a valid 5-letter word.</li>
        <li>The colour of a tile shows how close your guess was.</li>
        <li>Every answer is a word from the name of a Pauper-legal card, like <i>Lightning <b>Helix</b></i> or <i>Baleful <b>Strix</b></i>. The very common ones are left out.</li>
      </ul>
      <p className="text-sm font-bold text-white mb-2">Examples</p>
      <Example word="swamp" index={0} state="c" text="is in the word and in the right spot." />
      <Example word="ghoul" index={3} state="p" text="is in the word but in the wrong spot." />
      <Example word="brood" index={4} state="a" text="is not in the word in any spot." />
      <p className="text-sm text-gray-400 mt-4">Play as many games as you like: start a new one whenever you want. After each game you can see the cards the word comes from.</p>
    </Modal>
  )
}

function Stats({ stats, onClose, finished, won, answer, onNewGame }) {
  const max = Math.max(1, ...stats.dist)
  const cards = data.cards[answer] || []
  // on touch devices a tap on a card opens its preview in a sheet from the bottom (on a computer, hover previews the name)
  const { bind: bindPreview, preview } = useCardPreview({ sheet: true })
  // the cards' images, in the artwork the visitor chose in Settings; they load once the game is over
  const artwork = useArtwork()
  const [images, setImages] = useState({})
  useEffect(() => {
    if (!finished) return
    let live = true
    loadCardImages(artwork).then(m => { if (live) setImages(m) })
    return () => { live = false }
  }, [finished, artwork])
  return (
    <Modal title="Statistics" onClose={onClose}>
      <div className="grid grid-cols-4 gap-2 text-center mb-5">
        {[
          [stats.played, 'Played'],
          [stats.played ? Math.round(100 * stats.wins / stats.played) : 0, 'Win %'],
          [stats.streak, 'Current streak'],
          [stats.best, 'Best streak'],
        ].map(([n, label]) => (
          <div key={label}>
            <div className="text-3xl font-bold text-white">{n}</div>
            <div className="text-[11px] leading-tight text-gray-400">{label}</div>
          </div>
        ))}
      </div>
      <h3 className="text-center text-sm font-bold text-white uppercase tracking-wide mb-2">Guess distribution</h3>
      <div className="space-y-1 mb-5">
        {stats.dist.map((n, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-white">{i + 1}</span>
            <div className={`${n ? 'bg-[#538d4e]' : 'bg-[#3a3a3c]'} text-white text-right font-bold px-1.5 py-0.5`} style={{ width: `${Math.max(8, 100 * n / max)}%` }}>{n}</div>
          </div>
        ))}
      </div>
      {finished && (
        <div className="border-t border-gray-700 pt-4 text-center">
          {!won && <p className="text-sm text-gray-300 mb-1">The word was <b className="uppercase text-white">{answer}</b></p>}
          <div className="flex justify-center gap-2 mb-3">
            {cards.map(c => images[c] && (
              <Link key={c} to={`/cards/${nameToSlug(c)}`} {...bindPreview(c, { slug: nameToSlug(c) })} className="w-1/3 max-w-[8.5rem]">
                <img src={images[c].replace('/normal/', '/small/')} alt={c} className="w-full rounded-[4.5%] hover:brightness-110 transition" />
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {won ? 'Found in cards like ' : 'You find it in '}
            {cards.map((c, i) => (
              <span key={c}>{i > 0 && ', '}<Link to={`/cards/${nameToSlug(c)}`} {...bindPreview(c, { slug: nameToSlug(c) })} className="text-amber-400 hover:underline">{c}</Link></span>
            ))}
          </p>
          <button onClick={onNewGame} className="px-6 py-2 rounded-full bg-amber-400 text-gray-900 font-bold text-sm hover:brightness-110">New game</button>
        </div>
      )}
      {preview}
    </Modal>
  )
}

export default function Wordle() {
  // the game is kept, so that a reload doesn't change the word
  const [game, setGame] = useState(() => {
    const g = load(STORAGE + '-game', null)
    return g && ANSWERS.includes(g.word) ? { ...g, seen: g.seen || [] } : newGame([])
  })
  useEffect(() => { save(STORAGE + '-game', game) }, [game])
  const answer = game.word
  const guesses = game.guesses
  const [current, setCurrent] = useState('')
  const [stats, setStats] = useState(() => load(STORAGE + '-stats', EMPTY_STATS))
  const [toast, setToast] = useState(null)
  const [shake, setShake] = useState(false)
  const [revealRow, setRevealRow] = useState(null) // the row being revealed (keys are coloured when it ends)
  const [popCol, setPopCol] = useState(null)
  const [modal, setModal] = useState(() => (load(STORAGE + '-seen', false) ? null : 'help'))
  const toastTimer = useRef(null)

  const won = guesses.length > 0 && guesses[guesses.length - 1] === answer
  const lost = !won && guesses.length >= ROWS
  const finished = won || lost
  const board = guesses.map(g => evaluate(g, answer))

  const flash = useCallback((msg, ms = 1500) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }, [])

  // the keys' colours: the best state of each letter, once its row has been revealed
  const keyStates = useMemo(() => {
    const m = {}
    guesses.forEach((g, r) => {
      if (r === revealRow) return
      g.split('').forEach((l, i) => { if (!m[l] || RANK[board[r][i]] > RANK[m[l]]) m[l] = board[r][i] })
    })
    return m
  }, [guesses, board, revealRow])

  const submit = useCallback(() => {
    if (current.length < COLS) { setShake(true); flash('Not enough letters'); return }
    if (!VALID.has(current)) { setShake(true); flash('Not in word list'); return }
    const next = [...guesses, current]
    const done = current === answer || next.length >= ROWS
    setGame(g => ({ ...g, guesses: next }))
    setCurrent('')
    setRevealRow(next.length - 1)
    setTimeout(() => {
      setRevealRow(null)
      if (current === answer) flash(['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'][next.length - 1], 2000)
      else if (done) flash(answer.toUpperCase(), 4000)
      if (done) setTimeout(() => setModal('stats'), 1600)
    }, COLS * 300 + 500)
    if (done) {
      const st = { ...stats, dist: [...stats.dist], played: stats.played + 1 }
      if (current === answer) {
        st.wins++
        st.streak = stats.streak + 1
        st.best = Math.max(st.best, st.streak)
        st.dist[next.length - 1]++
      } else st.streak = 0
      setStats(st)
      save(STORAGE + '-stats', st)
    }
  }, [current, guesses, answer, stats, flash])

  const press = useCallback(key => {
    if (finished || revealRow != null || modal) return
    if (key === 'enter') submit()
    else if (key === 'backspace') setCurrent(c => c.slice(0, -1))
    else if (/^[a-z]$/.test(key) && current.length < COLS) { setCurrent(c => c + key); setPopCol(current.length) }
  }, [finished, revealRow, modal, submit, current])

  useEffect(() => {
    const onKey = e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'enter' || k === 'backspace' || /^[a-z]$/.test(k)) {
        if (k === 'enter' && document.activeElement && document.activeElement.tagName === 'BUTTON') return
        press(k)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press])

  useEffect(() => { if (!shake) return; const t = setTimeout(() => setShake(false), 600); return () => clearTimeout(t) }, [shake])
  useEffect(() => { if (popCol == null) return; const t = setTimeout(() => setPopCol(null), 120); return () => clearTimeout(t) }, [popCol, current])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  function closeHelp() { save(STORAGE + '-seen', true); setModal(null) }

  // a new word, whenever the player wants; leaving a game that was started and not finished counts as a loss
  function startNew() {
    if (revealRow != null) return
    if (guesses.length && !finished) {
      const st = { ...stats, played: stats.played + 1, streak: 0 }
      setStats(st)
      save(STORAGE + '-stats', st)
    }
    setGame(g => newGame(g.seen))
    setCurrent('')
    setRevealRow(null)
    setModal(null)
    setToast(null)
  }

  const rows = []
  for (let r = 0; r < ROWS; r++) {
    const word = r < guesses.length ? guesses[r] : r === guesses.length ? current : ''
    const evaluated = r < guesses.length
    rows.push(
      <div key={r} className={`grid grid-cols-5 gap-1.5 ${r === guesses.length && shake ? 'wordle-shake' : ''}`}>
        {Array.from({ length: COLS }, (_, c) => (
          <Tile key={c} letter={word[c] || ''} state={evaluated ? board[r][c] : null}
            revealIndex={evaluated && r === revealRow ? c : null}
            pop={r === guesses.length && c === popCol} />
        ))}
      </div>
    )
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-md flex flex-col items-center">
        <div className="w-full flex items-center justify-between border-b border-gray-800 pb-2 mb-4">
          <button onClick={() => setModal('help')} aria-label="How to play" className="w-9 h-9 rounded-full border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 font-bold">?</button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-wide">Pauper Wordle</h1>
            <button onClick={startNew} className="text-xs text-amber-400 hover:underline">New game</button>
          </div>
          <button onClick={() => setModal('stats')} aria-label="Statistics" className="w-9 h-9 rounded-full border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10M12 20V4M19 20v-7" /></svg>
          </button>
        </div>

        <div className="relative h-8 w-full flex justify-center">
          {toast && <div className="absolute top-0 z-40 rounded bg-gray-100 text-gray-900 text-sm font-bold px-3 py-1.5 shadow-lg">{toast}</div>}
        </div>

        <div className="grid gap-1.5 w-full max-w-[min(20rem,calc((100svh-26rem)*5/6+2rem))] min-w-[15rem] mb-6" role="grid" aria-label="Guesses">{rows}</div>

        <div className="w-full select-none" role="group" aria-label="Keyboard">
          {KEY_ROWS.map((row, i) => (
            <div key={i} className="flex justify-center gap-1.5 mb-1.5">
              {i === 1 && <div className="flex-[0.5]" />}
              {row.split('').map(k => {
                const special = k === '+' || k === '-'
                const key = k === '+' ? 'enter' : k === '-' ? 'backspace' : k
                return (
                  <button key={k} onClick={e => { e.currentTarget.blur(); press(key) }} aria-label={special ? (key === 'enter' ? 'Enter' : 'Backspace') : k}
                    className={`h-14 rounded font-bold uppercase text-sm sm:text-base transition-colors ${special ? 'flex-[1.5] text-xs' : 'flex-1'} ${
                      keyStates[k] ? TILE_COLOR[keyStates[k]] : 'bg-gray-600 text-white hover:bg-gray-500'
                    }`}>
                    {k === '+' ? 'Enter' : k === '-' ? '⌫' : k}
                  </button>
                )
              })}
              {i === 1 && <div className="flex-[0.5]" />}
            </div>
          ))}
        </div>

        {finished && !modal && (
          <div className="mt-3 flex gap-4 text-sm">
            <button onClick={startNew} className="px-5 py-1.5 rounded-full bg-amber-400 text-gray-900 font-bold hover:brightness-110">New game</button>
            <button onClick={() => setModal('stats')} className="text-amber-400 hover:underline">Show results</button>
          </div>
        )}
      </div>

      {modal === 'help' && <Help onClose={closeHelp} />}
      {modal === 'stats' && (
        <Stats stats={stats} onClose={() => setModal(null)} finished={finished} won={won}
          answer={answer} onNewGame={startNew} />
      )}
    </Layout>
  )
}
