export function nameToSlug(name) {
  return name.replace(/ /g, '_')
}

export function slugToName(slug) {
  return slug.replace(/_/g, ' ')
}
