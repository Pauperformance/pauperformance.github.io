export function nameToSlug(name) {
  return name.toLowerCase()
    .replace(/ \/\/ /g, '_')
    .replace(/ /g, '_')
    .replace(/[^a-z0-9_-]/g, '')
}

export function slugToName(slug) {
  return slug.replace(/_/g, ' ')
}
