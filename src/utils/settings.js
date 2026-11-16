import { useSyncExternalStore } from 'react'

// The visitor's settings, applied across the website. Stored in the browser
// (localStorage), so they stay on the visitor's device. Add a setting by
// adding its default here and its control to pages/Settings.jsx.
const KEY = 'settings'

export const DEFAULT_SETTINGS = {
  // how decklists are shown: text or visual, grouped by type or not, A–Z or by mana value
  deckView: { visual: false, groupByType: true, sort: 'name' },
  // the Watch page: videos or shorts to start with, the creators left out of it,
  // and the languages to start with (language codes of utils/languages.js; none: all)
  watch: { type: 'videos', hiddenCreators: [], languages: [] },
  // everywhere videos are listed (Watch, archetype pages…): a muted preview
  // playing on hover (desktop) or when the video is in the middle of the screen (touch)
  videos: { previews: true },
  // the artwork cards are shown with: the card's first print ever ('first') or its
  // first common print ('common'), see utils/artwork.js
  cards: { artwork: 'first' },
}

const listeners = new Set()
let cache = null

// every group of settings (deckView, watch…) gets the defaults of what is missing
function withDefaults(saved) {
  const out = {}
  for (const group of Object.keys(DEFAULT_SETTINGS)) {
    out[group] = { ...DEFAULT_SETTINGS[group], ...(saved && saved[group]) }
  }
  return out
}

function read() {
  try {
    return withDefaults(JSON.parse(localStorage.getItem(KEY)))
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function getSettings() {
  if (!cache) cache = read()
  return cache
}

export function updateSettings(patch) {
  const current = getSettings()
  // patch: { group: { setting: value } }
  const next = { ...current }
  for (const group of Object.keys(patch)) next[group] = { ...current[group], ...patch[group] }
  cache = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode: lasts for this visit only */ }
  listeners.forEach(l => l())
}

export function resetSettings() {
  cache = DEFAULT_SETTINGS
  try { localStorage.removeItem(KEY) } catch { /* nothing stored */ }
  listeners.forEach(l => l())
}

function subscribe(listener) {
  listeners.add(listener)
  // another tab changed the settings
  const onStorage = e => { if (e.key === KEY) { cache = null; listener() } }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage) }
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS)
}
