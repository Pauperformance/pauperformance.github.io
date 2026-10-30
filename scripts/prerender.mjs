import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(__dirname, '..')
const docsDir = resolve(root, 'docs')
const dataDir = resolve(root, 'public', 'data')

function nameToSlug(name) {
  // Accented letters become plain ones (Lórien -> lorien), as decklists
  // spell them, instead of being dropped.
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/ \/\/ /g, '_')
    .replace(/ /g, '_')
    .replace(/[^a-z0-9_-]/g, '')
}

const archetypes = JSON.parse(readFileSync(join(dataDir, 'archetypes.json'), 'utf-8'))
const families = JSON.parse(readFileSync(join(dataDir, 'families.json'), 'utf-8'))

const routes = [
  '/archetypes',
  '/announcements',
  '/sets',
  '/metagames',
  '/creators',
  '/cards',
  '/watch',
  '/blind-spy',
  '/diff',
  '/faq',
  ...archetypes.map(a => `/archetypes/${nameToSlug(a.name)}`),
  ...families.map(f => `/families/${f.slug}`),
]

const template = readFileSync(join(docsDir, 'index.html'), 'utf-8')

for (const route of routes) {
  const parts = route.split('/').filter(Boolean)
  const dir = join(docsDir, ...parts)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), template)
}

writeFileSync(join(docsDir, '404.html'), template)

console.log(`Pre-rendered ${routes.length} routes + 404.html`)
