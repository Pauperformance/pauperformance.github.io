export function nameToSlug(name) {
  // Accented letters become plain ones (Lórien -> lorien), as decklists
  // spell them, instead of being dropped.
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/ \/\/ /g, '_')
    .replace(/ /g, '_')
    .replace(/[^a-z0-9_-]/g, '')
}

export function slugToName(slug) {
  return slug.replace(/_/g, ' ')
}

// A metagame's page, e.g. "149.fra" or "148.bnr": its p13m code (`metagame` in
// Myr's references to it, `p13m` in the metagame index) and its label.
export function metagameSlug(m) {
  return (m.metagame || m.p13m) + '.' + m.label.toLowerCase()
}

export function pilotToSlug(name) {
  return name
    .replace(/ \/\/ /g, '_')
    .replace(/ /g, '_')
    .replace(/[^a-zA-Z0-9._~-]/g, '')
}
