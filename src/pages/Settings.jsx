import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { Toggle, DeckList, VisualList, sortCards, NO_VERSUS } from './DeckPage'
import { LANG_FLAG, LANG_NAME } from '../utils/languages'
import { useSettings, updateSettings, resetSettings, DEFAULT_SETTINGS } from '../utils/settings'

// "the Watch page", linked
function WatchLink() {
  return <Link to="/watch" className="text-amber-400 hover:underline">the Watch page</Link>
}

// A decklist of 5 cards, 4 copies of each, to show what the decklist view settings do to a list.
// Its data is here, not loaded: the preview is there at once.
const SCRYFALL = 'https://cards.scryfall.io/normal/front/'
const SAMPLE = [
  { qty: 4, name: 'Chittering Rats', types: ['Creature'], cost: '{1}{B}{B}', cmc: 3, image: `${SCRYFALL}9/8/980135d5-dfaa-4beb-b4b3-1e256bb46e61.jpg?1783944446` },
  { qty: 4, name: 'Cuombajj Witches', types: ['Creature'], cost: '{B}{B}', cmc: 2, image: `${SCRYFALL}7/9/7995c3f9-a147-43c9-9f82-470924818a4c.jpg?1783948388` },
  { qty: 4, name: 'Gray Merchant of Asphodel', types: ['Creature'], cost: '{3}{B}{B}', cmc: 5, image: `${SCRYFALL}b/0/b06078ce-f534-4e16-9a70-d51620a33eb2.jpg?1783939779` },
  { qty: 4, name: 'Tortured Existence', types: ['Enchantment'], cost: '{B}', cmc: 1, image: `${SCRYFALL}1/7/1754b92b-d6f9-4503-af01-dee03f72a048.jpg?1783946558` },
  { qty: 4, name: 'Swamp', types: ['Land'], cost: null, cmc: 0, image: `${SCRYFALL}6/1/6176936d-72e2-4205-8871-4c5a4f1cb2d8.jpg?1783948657` },
]
const byName = pick => Object.fromEntries(SAMPLE.map(c => [c.name, pick(c)]))
const SAMPLE_DATA = {
  cards: SAMPLE.map(({ qty, name }) => ({ qty, name })),
  images: byName(c => c.image),
  types: byName(c => c.types),
  costs: byName(c => c.cost),
  cmc: byName(c => c.cmc),
}
// no card pages, so the preview's cards aren't links; nothing to hover or tap
const NO_CARD_PAGES = { slugs: new Set(), frontFaces: {}, loose: new Map() }
const NO_PREVIEW = () => ({})
const NO_HOVER = () => {}

function DeckViewPreview({ deckView }) {
  const { visual, groupByType, sort } = deckView
  const cards = sortCards(SAMPLE_DATA.cards, sort, SAMPLE_DATA.cmc)
  return (
    <div className="mt-5 rounded-lg border border-gray-700 bg-gray-900 p-4">
      <p className="text-xs text-gray-500 mb-3">Preview, with a sample decklist</p>
      {visual ? (
        <VisualList cards={cards} label="Maindeck" cardImages={SAMPLE_DATA.images} cardTypes={SAMPLE_DATA.types}
          groupByType={groupByType} cardPages={NO_CARD_PAGES} bindPreview={NO_PREVIEW}
          tileClass="w-[calc((100%-1.5rem)/4)] sm:w-24" />
      ) : (
        <div className="max-w-xs">
          <DeckList cards={cards} label="Maindeck" onHover={NO_HOVER} bindPreview={NO_PREVIEW}
            cardImages={SAMPLE_DATA.images} cardTypes={SAMPLE_DATA.types} groupByType={groupByType}
            cardPages={NO_CARD_PAGES} versus={NO_VERSUS} manaCosts={SAMPLE_DATA.costs} />
        </div>
      )}
    </div>
  )
}

function Setting({ title, description, children }) {
  return (
    <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="text-sm text-gray-400 mt-1 mb-4">{description}</p>
      {children}
    </section>
  )
}

// The content creators of the Watch page, to hide or show
function HiddenCreators({ hidden, onChange }) {
  const [creators, setCreators] = useState([])

  useEffect(() => {
    fetch('/data/creators.json').then(r => r.json())
      .then(list => setCreators(list.map(c => c.name).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))))
      .catch(() => setCreators([]))
  }, [])

  const toggle = name => onChange(hidden.includes(name) ? hidden.filter(n => n !== name) : [...hidden, name])
  // creators hidden earlier that are no longer in the list stay listed, so they can be shown again
  const names = [...creators, ...hidden.filter(n => !creators.includes(n))]

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {names.map(name => {
          const isHidden = hidden.includes(name)
          return (
            <button key={name} onClick={() => toggle(name)} aria-pressed={isHidden}
              title={isHidden ? 'Hidden: click to show' : 'Shown: click to hide'}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                isHidden
                  ? 'border-gray-700 text-gray-500 line-through hover:text-gray-300'
                  : 'border-gray-600 text-gray-200 hover:bg-gray-700'
              }`}>
              {name}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        {hidden.length ? `${hidden.length} hidden.` : 'None hidden.'}
        {hidden.length > 0 && (
          <button onClick={() => onChange([])} className="ml-2 underline underline-offset-2 hover:text-gray-300">Show all</button>
        )}
      </p>
    </div>
  )
}

export default function Settings() {
  const settings = useSettings()
  const { deckView, watch } = settings
  const setDeckView = patch => updateSettings({ deckView: patch })
  const setWatch = patch => updateSettings({ watch: patch })
  const changed = JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS)

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-gray-400 mt-1">
            Applied across the website, and stored in cookies of this browser.
          </p>
        </div>

        {/* as wide as the other pages: two columns on large screens */}
        <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Setting
          title="Decklist view"
          description="How decklists are shown by default across the website. You can still change the view on each page later.">
          <div className="flex flex-wrap gap-2">
            <Toggle value={deckView.visual} onChange={v => setDeckView({ visual: v })} options={[[false, 'Text'], [true, 'Visual']]} />
            <Toggle value={deckView.groupByType} onChange={v => setDeckView({ groupByType: v })} options={[[true, 'Grouped'], [false, 'Ungrouped']]} />
            <Toggle value={deckView.sort} onChange={v => setDeckView({ sort: v })} options={[['name', 'A–Z'], ['cmc', 'Mana value']]} />
          </div>
          <DeckViewPreview deckView={deckView} />
        </Setting>

        <div className="space-y-6">
        <Setting
          title="Watch: content creators"
          description={<>Click a creator to hide their content from <WatchLink />.</>}>
          <HiddenCreators hidden={watch.hiddenCreators} onChange={names => setWatch({ hiddenCreators: names })} />
        </Setting>

        <Setting
          title="Watch: videos or shorts"
          description={<>What <WatchLink /> shows when you open it. You can still switch on the page itself.</>}>
          <Toggle value={watch.type} onChange={v => setWatch({ type: v })} options={[['videos', 'Videos'], ['shorts', 'Shorts']]} />
        </Setting>

        <Setting
          title="Watch: languages"
          description={<>The languages <WatchLink /> starts with. Pick none to see them all. You can still change the language filter on the page itself.</>}>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LANG_NAME).map(([code, name]) => {
              const on = watch.languages.includes(code)
              return (
                <button key={code} aria-pressed={on}
                  onClick={() => setWatch({ languages: on ? watch.languages.filter(l => l !== code) : [...watch.languages, code] })}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    on ? 'bg-amber-400 border-amber-400 text-gray-900' : 'border-gray-600 text-gray-400 hover:text-gray-200'
                  }`}>
                  {LANG_FLAG[code]} {name}
                </button>
              )
            })}
          </div>
        </Setting>
        </div>
        </div>

        <button onClick={resetSettings} disabled={!changed}
          className="text-sm text-gray-400 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 underline underline-offset-2">
          Reset to defaults
        </button>
      </div>
    </Layout>
  )
}
