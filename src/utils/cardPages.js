import { useEffect, useState } from 'react'
import { nameToSlug } from './slugs.js'

// Which card names have a card page, and under which slug, so that pages link
// only those: banned cards and misspelt names in community decklists have
// none. Built from /data/card-slugs.json (every card page) and
// /data/card-front-face-slugs.json (names not matching their page's slug).
//
// scripts/check-links.mjs resolves links with the same functions.

// Letters and digits only, to match names written with other punctuation
// ("Fire/Ice" for "Fire // Ice").
function looseKey(name) {
  return nameToSlug(name).replace(/[^a-z0-9]/g, '')
}

export function makeCardPages(slugs, frontFaces) {
  // Keys shared by several pages are ambiguous: null.
  const loose = new Map()
  for (const slug of slugs) {
    const key = looseKey(slug)
    loose.set(key, loose.has(key) ? null : slug)
  }
  return { slugs: new Set(slugs), frontFaces, loose }
}

// The slug of the page of the card named `name`, or null if it has none.
export function cardPageSlug(pages, name) {
  // Decklists name double-faced and adventure cards by their front face only.
  if (pages.frontFaces[name]) return pages.frontFaces[name]
  const slug = nameToSlug(name)
  if (pages.slugs.has(slug)) return slug
  const key = looseKey(name)
  return (key && pages.loose.get(key)) || null
}

let loading = null

// The card pages; null if they can't be loaded.
export function loadCardPages() {
  if (!loading) {
    loading = Promise.all([
      fetch('/data/card-slugs.json').then(r => r.json()),
      fetch('/data/card-front-face-slugs.json').then(r => r.json()),
    ])
      .then(([slugs, frontFaces]) => makeCardPages(slugs, frontFaces))
      .catch(() => { loading = null; return null })
  }
  return loading
}

// The card pages, or null until they are loaded (or if they can't be).
export function useCardPages() {
  const [pages, setPages] = useState(null)
  useEffect(() => {
    let alive = true
    loadCardPages().then(p => { if (alive) setPages(p) })
    return () => { alive = false }
  }, [])
  return pages
}

// The slug to link the card named `name` to, or null for no link. Until the
// pages are loaded, assumes the card has a page under its plain slug.
export function cardLinkSlug(pages, name) {
  return pages ? cardPageSlug(pages, name) : nameToSlug(name)
}

// The full card's slug for the slug of a front face alone (delver_of_secrets
// -> delver_of_secrets_insectile_aberration), or null.
export function fullCardSlug(slug) {
  return loadCardPages().then(pages => {
    if (!pages) return null
    const name = Object.keys(pages.frontFaces).find(n => nameToSlug(n) === slug)
    return name ? pages.frontFaces[name] : null
  })
}
