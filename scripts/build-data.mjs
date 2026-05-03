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

// Parse set index from markdown
const setLines = readFileSync('pages/set_index.md', 'utf8').split('\n')
const sets = []
for (const line of setLines) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || trimmed.includes('----') || trimmed.includes('p12e code')) continue
  const cols = trimmed.split('|').map(c => c.trim()).filter(Boolean)
  if (cols.length < 4) continue
  const clean = s => s.replace(/\*\*/g, '').trim()
  const pauper_pool = cols[2].startsWith('**')
  sets.push({
    code: parseInt(clean(cols[0])),
    scryfall: clean(cols[1]),
    name: clean(cols[2]),
    date: clean(cols[3]),
    pauper_pool,
  })
}
writeFileSync(join(outDir, 'sets.json'), JSON.stringify(sets))
console.log(`Built sets.json with ${sets.length} entries (${sets.filter(s => s.pauper_pool).length} in Pauper pool).`)

// Parse format timeline from markdown
const timelineContent = readFileSync('pages/format_timeline.md', 'utf8')
const timelineSections = timelineContent.split('\n---\n')
const timeline = []
const refLinkRe = /^\[(.+?)\]\((.+?)\)$/

for (const sec of timelineSections) {
  const trimmed = sec.trim()
  if (!trimmed.startsWith('###')) continue
  const lines = trimmed.split('\n')
  const header = lines[0].replace(/^###\s*/, '').trim()
  const dashIdx = header.indexOf(' - ')
  const date = dashIdx >= 0 ? header.slice(0, dashIdx).trim() : header
  const subtitle = dashIdx >= 0 ? header.slice(dashIdx + 3).trim() : null

  const bullets = []
  const refs = []
  for (const line of lines.slice(1)) {
    const l = line.trim()
    if (l.startsWith('* ')) bullets.push(l.slice(2))
    else if (l.startsWith('ref: ')) {
      const raw = l.slice(5).trim()
      const m = raw.match(refLinkRe)
      refs.push(m ? { text: m[1], url: m[2] } : { text: raw, url: null })
    }
  }
  timeline.push({ date, subtitle, bullets, refs })
}
writeFileSync(join(outDir, 'timeline.json'), JSON.stringify(timeline))
console.log(`Built timeline.json with ${timeline.length} entries.`)

// Parse pauper pool from markdown
const poolContent = readFileSync('pages/pauper_pool.md', 'utf8')
const poolSections = poolContent.split('\n## ')
const pool = []
for (const sec of poolSections.slice(1)) {
  const headerMatch = sec.match(/^(.+?)\s+\(([^)]+)\)/)
  if (!headerMatch) continue
  const [, name, scryfall] = headerMatch
  const metaMatch = sec.match(/release:\s*(\S+)\s*\|\s*p12e_code:\s*(\d+)/)
  const date = metaMatch?.[1] ?? null
  const code = metaMatch ? parseInt(metaMatch[2]) : null
  const cards = [...sec.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)]
    .map(([, url, cardName]) => ({ name: cardName, url: url.split('?')[0] }))
  pool.push({ code, scryfall, name, date, cards })
}
const totalCards = pool.reduce((sum, s) => sum + s.cards.length, 0)
writeFileSync(join(outDir, 'pauper_pool.json'), JSON.stringify(pool))
console.log(`Built pauper_pool.json with ${pool.length} sets and ${totalCards} cards.`)

// Copy metagame data
const metagame = JSON.parse(readFileSync('assets/data/intel/metagame.json', 'utf8'))
const metagameOut = metagame.meta_shares
  .map(({ archetype_name, meta_share, accuracy }) => ({ archetype_name, meta_share, accuracy }))
  .sort((a, b) => b.meta_share - a.meta_share)
writeFileSync(join(outDir, 'metagame.json'), JSON.stringify(metagameOut))
console.log(`Built metagame.json with ${metagameOut.length} archetypes.`)

// Build top decks (top 15 metagame archetypes enriched with archetype detail)
const archetypeMap = Object.fromEntries(
  archetypes.map(a => [a.name, a])
)
const topDecks = metagameOut.slice(0, 16).map(entry => {
  const arch = archetypeMap[entry.archetype_name]
  const staples = (arch?.staples || [])
    .filter(s => s.preview)
    .slice(0, 5)
    .map(({ name, link, preview }) => ({ name, link, preview }))
  return {
    archetype_name: entry.archetype_name,
    meta_share: entry.meta_share,
    dominant_mana: arch?.dominant_mana || [],
    game_type: arch?.game_type || [],
    featured_image: staples[0]?.preview || null,
    staples,
  }
})
writeFileSync(join(outDir, 'top_decks.json'), JSON.stringify(topDecks))
console.log(`Built top_decks.json with ${topDecks.length} entries.`)
