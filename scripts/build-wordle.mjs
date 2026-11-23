// Builds src/data/wordle.json, the words of /wordle (run by hand: node scripts/build-wordle.mjs).
//
// - answers: the curated 5-letter words found in the names of Pauper cards (assets/data/pauper_pool.json).
//   Very common words (about, water, black...) and names of Universes Beyond characters are left out;
//   Magic's own vocabulary (guilds, creature types: izzet, golem, ouphe...) is in.
// - valid: what can be guessed: every answer, every word of a Pauper card name, the 5-letter words of the
//   system's English dictionaries and the forms of the Hunspell ones (scripts/wordle-guesses.txt, made by
//   scripts/wordle-guesses.py).
// - cards: for each answer, the Pauper cards with that word in their name, the most played first.
//
// The answers are shuffled with a fixed seed: the word of the day is the n-th, n being the days since the launch.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const ANSWERS = `
abbey adept aegis aerie afoul agate agony alibi allay altar amass amity annex annul anvil arbor ardor armor arrow
ashes atlas attic auger augur avian axiom azure abzan
bards baron basal bathe baton bayou beast bleak bliss blitz bogle bolas brine brink brood brute bugle burnt byway boros
cabal cache cadet caged canal carom chasm chime churn civic claws clout coral corps coven cower crier crook crumb crypt
curio curse cycle coatl
decoy delve demon dirge ditch diver djinn douse drake dross drown druid dryad dwarf dimir
eager eagle edict eerie eject elder elite ember envoy erase exile expel eland elven esper
facet faith fancy fangs feast feign feint feral ferry fetid fiend filth finch flare flask fleet flesh flick fling flock
flute forge forum fumes furor
gecko gelid geode geist ghast ghost ghoul glade glare glaze gleam glint gloom glyph gnats gnoll gnome golem gorge gouge
grail graft grasp grave greed grove grubs grunt gruul guile guise gulch
harpy haste haunt haven havoc heath heist helix henge heron hippo hoard honed horde hound hydra hyena hyrax
ichor ifrit ingot islet ivory izzet
jewel judge
kenku kirin knack kraul kunai
lance lapse lapis larva leech liege lotus lunge lymph
magma mages mamba maned manic manor manta mardu marsh medic melee mercy mimic miser mists moors moray motes mulch mummy murky
naiad nexus nihil ninja noble nomad
oasis okapi omens oread otter ouphe
parch parry pedal peril petal piety piker pixie plaza prism probe pulse purge pygmy
qilin quest
rabid rager ramen ravel raven razor realm reave rebel regal relay relic repel revel rhino ridge risen rites rogue ronin
roost rouse rowan ruins runed runes
sable salve salvo satyr savor scamp scion scorn scour scout scrap sedge serum sewer shade shale shard shark shiny shoal
shock shoji shred siege sigil simic singe siren skaab skald skiff skink skulk skull slate slime slith sloth smelt smite
snare sneak snuff solar spade spasm spawn spear spire spite spore spree squid stave steed stoic stomp strix surge swamp
swarm swine swoop sword
taint talon temur tidal tithe toady torch torii totem toxin tribe troll trove twist
umbra ursus
valor vapor vault venom vigil vigor viper virus vital vitae vivid
wager waltz whale whelm whelp whirl whisk widow wight wisps witch wrack wrath wreck wring
yoked
`.split(/\s+/).filter(Boolean)

const norm = w => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// the 5-letter words of the names of the Pauper cards, with the cards
const cardsOf = {}
for (const set of JSON.parse(readFileSync('assets/data/pauper_pool.json', 'utf8'))) {
  for (const { name } of set.cards) {
    for (const part of name.split(/[ ,/]+/)) {
      const w = norm(part.replace(/'s$/, ''))
      if (/^[a-z]{5}$/.test(w) && /^[A-Za-zÀ-ÿ]+$/.test(part.replace(/'s$/, ''))) (cardsOf[w] ||= new Set()).add(name)
    }
  }
}

// how many decks played each card, at most in a metagame
const decks = {}
const popDir = 'assets/data/card_popularity'
for (const f of existsSync(popDir) ? readdirSync(popDir) : []) {
  if (!f.endsWith('.json')) continue
  for (const c of JSON.parse(readFileSync(join(popDir, f), 'utf8')).cards) decks[c.name] = Math.max(decks[c.name] || 0, c.decks)
}

const answers = [...new Set(ANSWERS)]
const missing = answers.filter(w => !cardsOf[w])
if (missing.length) throw new Error('not in a Pauper card name: ' + missing.join(' '))

const dictionary = new Set()
for (const f of ['/usr/share/dict/american-english', '/usr/share/dict/british-english']) {
  for (const w of readFileSync(f, 'utf8').split('\n')) if (/^[a-z]{5}$/.test(w)) dictionary.add(w)
}
for (const w of existsSync('scripts/wordle-guesses.txt') ? readFileSync('scripts/wordle-guesses.txt', 'utf8').split('\n') : []) {
  if (/^[a-z]{5}$/.test(w)) dictionary.add(w)
}
const valid = new Set([...dictionary, ...Object.keys(cardsOf)])

// seeded shuffle (mulberry32)
let s = 20261124
const rand = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
answers.sort()
for (let i = answers.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [answers[i], answers[j]] = [answers[j], answers[i]] }

const cards = {}
for (const w of answers) cards[w] = [...cardsOf[w]].sort((a, b) => (decks[b] || 0) - (decks[a] || 0) || a.localeCompare(b)).slice(0, 3)

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/wordle.json', JSON.stringify({ answers, valid: [...valid].sort().join(' '), cards }))
console.log(`${answers.length} answers, ${valid.size} valid guesses`)
