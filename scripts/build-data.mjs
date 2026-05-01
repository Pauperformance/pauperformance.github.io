import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const archetypeDir = 'assets/data/archetype'
const outDir = 'public/data'

mkdirSync(outDir, { recursive: true })

const archetypes = readdirSync(archetypeDir)
  .filter(f => f.endsWith('.json'))
  .sort()
  .map(f => JSON.parse(readFileSync(join(archetypeDir, f), 'utf8')))

writeFileSync(join(outDir, 'archetypes.json'), JSON.stringify(archetypes))
console.log(`Built archetypes.json with ${archetypes.length} entries.`)
