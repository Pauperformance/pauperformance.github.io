import { useEffect, useState } from 'react'
import { useSettings } from './settings'

// The artwork a card is shown with is the visitor's choice (see the Settings
// page): the card's first print ever, or its first common print. Myr exports
// both: the card intel files have the common print as `scryfall` and the first
// print's image, set, rarity and artist as `first_print`.
//
// Pages know their cards' images in two ways: a card-images map (name -> image)
// they load whole, and the image of a card they were given with its name (the
// first common print's). The first is loaded by loadCardImages; the second is
// replaced by imageFor, which looks the name up in the other map.

export const ARTWORKS = [['first', 'First print'], ['common', 'First common print']]

// the card-images maps (name -> image URL), by artwork: the first common prints
// and the first prints ever
const FILES = { common: '/data/card-images.json', first: '/data/card-images-first.json' }
const maps = {}

export function loadCardImages(artwork) {
  const key = artwork === 'common' ? 'common' : 'first'
  if (!maps[key]) {
    maps[key] = fetch(FILES[key]).then(r => r.json()).catch(() => { delete maps[key]; return {} })
  }
  return maps[key]
}

export function useArtwork() {
  return useSettings().cards.artwork
}

// imageFor(name, image): the image of the card named `name` in the visitor's
// artwork; `image`, the first common print's, until the other is loaded or for
// a card that doesn't have it.
export function useImageFor() {
  const artwork = useArtwork()
  const [images, setImages] = useState(null)
  useEffect(() => {
    // the first common prints are what pages know already: nothing to load
    if (artwork === 'common') return
    let live = true
    loadCardImages(artwork).then(m => { if (live) setImages(m) })
    return () => { live = false }
  }, [artwork])
  return (name, image) => (artwork === 'common' ? image : (images && images[name]) || image)
}

// What of a card depends on its print, as Myr exports it in `first_print`
const PRINT_FIELDS = ['scryfall_uri', 'set', 'set_name', 'rarity', 'released_at', 'artist', 'flavor_text', 'image_uris']
const FACE_PRINT_FIELDS = ['artist', 'flavor_text', 'image_uris']

// `target` with the print fields of `print`: those the print lacks (e.g. a
// flavor text) are not left from the other print
function withPrint(target, print, fields) {
  const out = { ...target }
  for (const field of fields) {
    if (print[field] !== undefined) out[field] = print[field]
    else delete out[field]
  }
  return out
}

// A card's Scryfall object with the print of the visitor's artwork: the first
// print's image, set, rarity and artist over the common print's (everything
// else, such as the Oracle text, is the same for both).
export function withArtwork(scryfall, firstPrint, artwork) {
  if (!scryfall || !firstPrint || artwork === 'common') return scryfall
  const merged = withPrint(scryfall, firstPrint, PRINT_FIELDS)
  // a multi-face card keeps the faces' rules and gets their images and artists
  if (scryfall.card_faces && firstPrint.card_faces) {
    merged.card_faces = scryfall.card_faces.map((face, i) =>
      firstPrint.card_faces[i] ? withPrint(face, firstPrint.card_faces[i], FACE_PRINT_FIELDS) : face)
  }
  return merged
}
