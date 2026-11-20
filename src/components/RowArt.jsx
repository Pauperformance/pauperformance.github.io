// The picture at the right end of a list row: a card's art window, cut diagonally on its left side.
// url: the card's image (a Scryfall "normal" one; its "small" is used); margin: classes that make
// it fill the row's height and reach its right edge (negative margins of the row's padding).
// Renders nothing without a url.
export default function RowArt({ url, margin = '-my-2 -mr-3' }) {
  if (!url) return null
  return (
    <span className={`relative shrink-0 self-stretch w-20 sm:w-24 ${margin} overflow-hidden bg-gray-800 [container-type:size]`}
      style={{ clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0 100%)' }}>
      {/* Scryfall's "small" card (146px wide) cropped to its art window: its art is about as wide as the
          row picture, so the browser hardly shrinks it. The 6x shrink of the 616px art_crop made the
          scan's grain shimmer. The art is 83% of the card's width, 44% of its height, centred at 33%
          down; the image covers the picture box, using the box's own size (container units). */}
      <img src={url.replace('/normal/', '/small/')} alt="" loading="lazy" className="absolute left-1/2 top-1/2 max-w-none h-auto"
        style={{ width: 'max(125cqw, 170cqh)', transform: 'translate(-50%, -33.4%)' }} />
    </span>
  )
}
