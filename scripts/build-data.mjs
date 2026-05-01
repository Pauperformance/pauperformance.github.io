import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const archetypeDir = 'assets/data/archetype'
const deckDir = 'assets/data/deck/academy'
const videoDir = 'assets/data/video'
const outDir = 'public/data'
const detailsDir = join(outDir, 'archetype-details')

mkdirSync(outDir, { recursive: true })
mkdirSync(detailsDir, { recursive: true })

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
      is_reference: archetype.reference_decks?.includes(deckName) ?? false,
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
