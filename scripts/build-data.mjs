import { readFileSync, readdirSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const archetypeDir = 'assets/data/archetype'
const deckDir = 'assets/data/deck/academy'
const intelDeckDir = 'assets/data/intel/deck'
const videoDir = 'assets/data/video'
const familyMdDir = 'families'
const outDir = 'public/data'
const detailsDir = join(outDir, 'archetype-details')
const intelDecksDir = join(outDir, 'intel-decks')
const deckDetailsDir = join(outDir, 'deck-details')
const cardDecksDir = join(outDir, 'card-decks')

mkdirSync(outDir, { recursive: true })
mkdirSync(detailsDir, { recursive: true })
mkdirSync(intelDecksDir, { recursive: true })
mkdirSync(deckDetailsDir, { recursive: true })
mkdirSync(cardDecksDir, { recursive: true })

function readJsonDir(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')))
}

// Load all archetypes
const archetypes = readdirSync(archetypeDir)
  .filter(f => f.endsWith('.json'))
  .sort()
  .map(f => JSON.parse(readFileSync(join(archetypeDir, f), 'utf8')))

// Write combined index (slim fields only)
const index = archetypes.map(({ name, aliases, dominant_mana, game_type, family }) => ({
  name, aliases, dominant_mana, game_type, family: family || null,
}))
writeFileSync(join(outDir, 'archetypes.json'), JSON.stringify(index))
console.log(`Built archetypes.json with ${index.length} entries.`)

// Write per-archetype detail files
let detailCount = 0
for (const archetype of archetypes) {
  const name = archetype.name

  // Load decks
  const deckFolder = join(deckDir, name)
  const decks = readJsonDir(deckFolder)
    .sort((a, b) => b.set_date.localeCompare(a.set_date))
    .map(({ name: deckName, url, set_name, set_date, legal }) => ({
      name: deckName, url, set_name, set_date, legal,
      is_reference: archetype.reference_decks ? archetype.reference_decks.includes(deckName) : false,
    }))

  // Load videos
  const videoFolder = join(videoDir, name)
  const videos = readJsonDir(videoFolder)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(({ name: title, link, language, date, phd_name, deck_name }) => ({
      title, link, language, date, phd_name, deck_name: deck_name || null,
    }))

  const detail = {
    name: archetype.name,
    aliases: archetype.aliases || [],
    dominant_mana: archetype.dominant_mana || [],
    game_type: archetype.game_type || [],
    family: archetype.family || null,
    description: archetype.description || null,
    staples: (archetype.staples || []).map(({ name, link, preview }) => ({ name, link, preview })),
    frequent: (archetype.frequent || []).map(({ name, link, preview }) => ({ name, link, preview })),
    must_have_cards: archetype.must_have_cards || [],
    must_not_have_cards: archetype.must_not_have_cards || [],
    resource_sideboard: archetype.resource_sideboard
      ? { link: archetype.resource_sideboard.link }
      : null,
    resources: (archetype.resources || []).map(({ name, link, language, author, date }) => ({
      name, link, language, author, date,
    })),
    resources_discord: (archetype.resources_discord || []).map(({ name, link, language }) => ({
      name, link, language,
    })),
    decks,
    videos,
  }

  writeFileSync(join(detailsDir, `${name}.json`), JSON.stringify(detail))
  detailCount++
}

console.log(`Built ${detailCount} archetype detail files.`)

// Build intel decks per archetype + individual deck detail files
function parseDecklist(txt) {
  var lines = txt.trim().split('\n')
  var main = []
  var side = []
  var inSide = false
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim()
    if (!line) { inSide = true; continue }
    var match = line.match(/^(\d+)\s+(.+)$/)
    if (!match) continue
    var entry = { qty: parseInt(match[1]), name: match[2] }
    if (inSide) side.push(entry)
    else main.push(entry)
  }
  return { main: main, side: side }
}

const tournamentDeckDir = 'assets/data/deck/mtggoldfish_tournament'
const cardDecksMap = {}
let intelDeckCount = 0
let deckDetailCount = 0
for (const archetype of archetypes) {
  const name = archetype.name
  const folder = join(intelDeckDir, name)
  if (!existsSync(folder)) continue
  const decks = readdirSync(folder)
    .filter(function(f) { return f.endsWith('.json') })
    .map(function(f) {
      const id = f.slice(0, -5)
      const d = JSON.parse(readFileSync(join(folder, f), 'utf8'))

      // Write individual deck detail file
      const txtPath = join(tournamentDeckDir, id + '.txt')
      var decklist = null
      if (existsSync(txtPath)) {
        decklist = parseDecklist(readFileSync(txtPath, 'utf8'))
      }
      writeFileSync(join(deckDetailsDir, id + '.json'), JSON.stringify({
        id: id,
        archetype: name,
        url: d.url,
        pilot: d.pilot || null,
        place: d.place || null,
        tournament_name: d.tournament_name || null,
        tournament_date: d.tournament_date || null,
        mtgo_price: d.mtgo_price || null,
        tabletop_price: d.tabletop_price || null,
        decklist: decklist,
      }))
      deckDetailCount++

      // Build reverse index: card name → decks containing it
      if (decklist) {
        var deckMeta = {
          id: id,
          archetype: name,
          pilot: d.pilot || null,
          place: d.place || null,
          tournament_name: d.tournament_name || null,
          tournament_date: d.tournament_date || null,
        }
        var seen = {}
        var allCards = decklist.main.concat(decklist.side)
        for (var ci = 0; ci < allCards.length; ci++) {
          var cardName = allCards[ci].name
          if (seen[cardName]) continue
          seen[cardName] = true
          if (!cardDecksMap[cardName]) cardDecksMap[cardName] = []
          cardDecksMap[cardName].push(deckMeta)
        }
      }

      return {
        id: id,
        url: d.url,
        pilot: d.pilot || null,
        place: d.place || null,
        tournament_name: d.tournament_name || null,
        tournament_date: d.tournament_date || null,
      }
    })
    .sort(function(a, b) {
      return (b.tournament_date || '').localeCompare(a.tournament_date || '')
    })
  writeFileSync(join(intelDecksDir, `${name}.json`), JSON.stringify(decks))
  intelDeckCount++
}
console.log('Built intel-decks for ' + intelDeckCount + ' archetypes, ' + deckDetailCount + ' deck detail files.')

// Build families index from archetype family fields
const familyMap = {}
for (const arch of archetypes) {
  var fam = arch.family
  if (!fam) continue
  if (!familyMap[fam]) familyMap[fam] = { name: fam, description: null, archetypes: [] }
  familyMap[fam].archetypes.push({
    name: arch.name,
    aliases: arch.aliases || [],
    dominant_mana: arch.dominant_mana || [],
    game_type: arch.game_type || [],
  })
}
// Parse descriptions from families/*.md
if (existsSync(familyMdDir)) {
  readdirSync(familyMdDir).filter(function(f) { return f.endsWith('.md') }).forEach(function(fname) {
    var famName = fname.slice(0, -3)
    var content = readFileSync(join(familyMdDir, fname), 'utf8')
    var descMatch = content.match(/\*\*Description\*\*:\s*(.+)/)
    if (descMatch && familyMap[famName]) {
      var desc = descMatch[1].trim()
      if (desc.indexOf('Still missing') === -1 && desc !== 'TODO.') {
        familyMap[famName].description = desc
      }
    }
  })
}
const families = Object.values(familyMap).sort(function(a, b) { return a.name.localeCompare(b.name) })
writeFileSync(join(outDir, 'families.json'), JSON.stringify(families))
console.log('Built families.json with ' + families.length + ' families.')

// Build set index from assets/data/set_index.json
const setIndexRaw = JSON.parse(readFileSync('assets/data/set_index.json', 'utf8'))
const sets = setIndexRaw['py/reduce'][4]['py/tuple'].map(function(entry) {
  var d = entry['py/tuple'][1]
  return {
    code: d.p12e_code,
    scryfall: d.scryfall_code,
    name: d.name,
    date: d.date,
    pauper_pool: d.new_pauper_cards,
  }
})
writeFileSync(join(outDir, 'sets.json'), JSON.stringify(sets))
console.log('Built sets.json with ' + sets.length + ' entries (' + sets.filter(function(s) { return s.pauper_pool }).length + ' in Pauper pool).')

// Copy format timeline as-is from source
copyFileSync('assets/data/timeline.json', join(outDir, 'timeline.json'))
const timeline = JSON.parse(readFileSync('assets/data/timeline.json', 'utf8'))
console.log('Copied timeline.json with ' + timeline.length + ' entries.')

// Copy pauper pool from assets
const pool = JSON.parse(readFileSync('assets/data/pauper_pool.json', 'utf8'))
const totalCards = pool.reduce(function(sum, s) { return sum + s.cards.length }, 0)
writeFileSync(join(outDir, 'pauper_pool.json'), JSON.stringify(pool))
console.log('Built pauper_pool.json with ' + pool.length + ' sets and ' + totalCards + ' cards.')

// Build cards index + per-card detail files
const cardIntelDir = 'assets/data/intel/card'
const cardDetailsDir = join(outDir, 'card-details')
mkdirSync(cardDetailsDir, { recursive: true })

const cardFiles = readdirSync(cardIntelDir).filter(function(f) { return f.endsWith('.json') }).sort()
const cardsIndex = []
const cardImageMap = {}
const cardTypeMap = {}
for (const f of cardFiles) {
  const slug = f.slice(0, -5)
  const raw = JSON.parse(readFileSync(join(cardIntelDir, f), 'utf8'))
  const name = raw.name || slug
  const archetypes = (raw.archetypes && raw.archetypes['py/set']) || []
  const scryfall = raw.scryfall || null
  var colors = (scryfall && scryfall.colors) || []
  if (scryfall && colors.length === 0 && scryfall.card_faces) {
    var faceColorSet = {}
    for (var fci = 0; fci < scryfall.card_faces.length; fci++) {
      var faceColors = scryfall.card_faces[fci].colors || []
      for (var fci2 = 0; fci2 < faceColors.length; fci2++) faceColorSet[faceColors[fci2]] = true
    }
    colors = Object.keys(faceColorSet)
  }
  var CARD_TYPES = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land']
  var TYPE_RENAME = { 'Stickers': 'Sticker' }
  var typeLine = (scryfall && scryfall.type_line) || ''
  if (!typeLine && scryfall && scryfall.card_faces) {
    typeLine = scryfall.card_faces.map(function(f) { return f.type_line || '' }).join(' // ')
  }
  var typeSet = {}
  var tlParts = typeLine.split(' // ')
  for (var tli = 0; tli < tlParts.length; tli++) {
    var tlWords = tlParts[tli].split(' — ')[0].split(' ')
    for (var wi = 0; wi < tlWords.length; wi++) {
      var tw = tlWords[wi]
      if (CARD_TYPES.indexOf(tw) !== -1) typeSet[tw] = true
      else if (TYPE_RENAME[tw]) typeSet[TYPE_RENAME[tw]] = true
    }
  }
  var types = Object.keys(typeSet)
  var cmc = (scryfall && scryfall.cmc !== undefined) ? scryfall.cmc : null
  cardsIndex.push({ slug, name, archetypeCount: archetypes.length, colors: colors, types: types, cmc: cmc })
  writeFileSync(join(cardDetailsDir, f), JSON.stringify({ slug, name, archetypes, scryfall }))
  cardImageMap[name] = scryfall
    ? (scryfall.image_uris && scryfall.image_uris.normal)
      || (scryfall.card_faces && scryfall.card_faces[0] && scryfall.card_faces[0].image_uris && scryfall.card_faces[0].image_uris.normal)
      || null
    : null
  // Map both full name and front-face name (for DFCs) to types
  cardTypeMap[name] = types
  if (name.indexOf(' // ') !== -1) {
    var frontName2 = name.split(' // ')[0]
    if (!cardTypeMap[frontName2]) cardTypeMap[frontName2] = types
  }
}
writeFileSync(join(outDir, 'cards.json'), JSON.stringify(cardsIndex))
writeFileSync(join(outDir, 'card-images.json'), JSON.stringify(cardImageMap))
writeFileSync(join(outDir, 'card-types.json'), JSON.stringify(cardTypeMap))
console.log('Built cards.json with ' + cardsIndex.length + ' entries and card-images.json.')

// Build card-decks reverse index: card slug → decks containing that card
var cardNameToSlug = {}
for (var ci2 = 0; ci2 < cardsIndex.length; ci2++) {
  var ci2entry = cardsIndex[ci2]
  cardNameToSlug[ci2entry.name] = ci2entry.slug
  if (ci2entry.name.indexOf(' // ') !== -1) {
    var frontFaceName = ci2entry.name.split(' // ')[0]
    if (!cardNameToSlug[frontFaceName]) cardNameToSlug[frontFaceName] = ci2entry.slug
  }
}
var cardDeckCount = 0
var cardNames = Object.keys(cardDecksMap)
for (var ci3 = 0; ci3 < cardNames.length; ci3++) {
  var cname = cardNames[ci3]
  var cslug = cardNameToSlug[cname]
  if (!cslug) continue
  var sortedDecks = cardDecksMap[cname].slice().sort(function(a, b) {
    return (b.tournament_date || '').localeCompare(a.tournament_date || '')
  })
  writeFileSync(join(cardDecksDir, cslug + '.json'), JSON.stringify(sortedDecks))
  cardDeckCount++
}
console.log('Built card-decks for ' + cardDeckCount + ' cards.')

// Build archetype → card slugs index (from actual deck appearances)
var archetypeCardMap = {}
var cardNamesAll = Object.keys(cardDecksMap)
for (var aci = 0; aci < cardNamesAll.length; aci++) {
  var acName = cardNamesAll[aci]
  var acSlug = cardNameToSlug[acName]
  if (!acSlug) continue
  var acDecks = cardDecksMap[acName]
  for (var adi = 0; adi < acDecks.length; adi++) {
    var acArch = acDecks[adi].archetype
    if (!archetypeCardMap[acArch]) archetypeCardMap[acArch] = {}
    archetypeCardMap[acArch][acSlug] = true
  }
}
var archetypeCardSlugs = {}
var acArchNames = Object.keys(archetypeCardMap).sort()
for (var acai = 0; acai < acArchNames.length; acai++) {
  archetypeCardSlugs[acArchNames[acai]] = Object.keys(archetypeCardMap[acArchNames[acai]]).sort()
}
writeFileSync(join(outDir, 'archetype-card-slugs.json'), JSON.stringify(archetypeCardSlugs))
console.log('Built archetype-card-slugs.json for ' + acArchNames.length + ' archetypes.')

// Build creators index
const creatorDir = 'assets/data/creator'
const creators = readdirSync(creatorDir)
  .filter(function(f) { return f.endsWith('.json') })
  .map(function(f) {
    var c = JSON.parse(readFileSync(join(creatorDir, f), 'utf8'))
    return {
      name: c.name,
      mtgo_name: c.mtgo_name || null,
      mtgo_name2: c.mtgo_name2 || null,
      twitch_channel_url: c.twitch_channel_url || null,
      youtube_channel_url: c.youtube_channel_url || null,
    }
  })
  .sort(function(a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()) })
writeFileSync(join(outDir, 'creators.json'), JSON.stringify(creators))
console.log('Built creators.json with ' + creators.length + ' entries.')

// Copy metagame data as-is (no transformation)
copyFileSync('assets/data/intel/metagame.json', join(outDir, 'metagame.json'))
const metagame = JSON.parse(readFileSync('assets/data/intel/metagame.json', 'utf8'))
const metagameOut = metagame.meta_shares.slice().sort((a, b) => b.meta_share - a.meta_share)
console.log(`Copied metagame.json with ${metagameOut.length} archetypes.`)

// Build top decks (top 15 metagame archetypes enriched with archetype detail)
const archetypeMap = Object.fromEntries(
  archetypes.map(a => [a.name, a])
)
const topDecks = metagameOut.slice(0, 16).map(entry => {
  const arch = archetypeMap[entry.archetype_name]
  const staples = ((arch && arch.staples) || [])
    .filter(s => s.preview)
    .slice(0, 5)
    .map(({ name, link, preview }) => ({ name, link, preview }))
  return {
    archetype_name: entry.archetype_name,
    meta_share: entry.meta_share,
    dominant_mana: (arch && arch.dominant_mana) || [],
    game_type: (arch && arch.game_type) || [],
    featured_image: (staples[0] && staples[0].preview) || null,
    staples,
  }
})
writeFileSync(join(outDir, 'top_decks.json'), JSON.stringify(topDecks))
console.log(`Built top_decks.json with ${topDecks.length} entries.`)
