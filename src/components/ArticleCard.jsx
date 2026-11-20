import { formatShortDate } from '../utils/dates'
import { LANG_FLAG, LANG_CANONICAL, LANG_NAME } from '../utils/languages'
import CalendarIcon from './CalendarIcon'

const ARTICLE_COLOR = '#d9822b'
export const SOURCE_NAMES = { cardsrealm: 'Cards Realm', coolstuffinc: 'CoolStuffInc', mtgrocks: 'MTGRocks', pauperwave: 'Pauperwave' }
// The site's logo, shown when an article has no picture of its own
const SOURCE_LOGOS = {
  cardsrealm: '/images/sources/cardsrealm.png',
  coolstuffinc: '/images/sources/coolstuffinc.png',
  mtgrocks: '/images/sources/mtgrocks.png',
  pauperwave: '/images/sources/pauperwave.jpg',
}

// An article from one of the sites that publish Pauper ones, in the look of a
// Newspauper entry: the date on the left, the picture full-height on the right.
export default function ArticleCard({ article: a, showImage = true }) {
  // the language's flag and name (the sources write it as "ENG", "PT"...)
  const code = a.language && (LANG_CANONICAL[a.language] ?? LANG_CANONICAL[a.language.toLowerCase()])
  const lang = code ? { flag: LANG_FLAG[code], name: LANG_NAME[code] } : null
  return (
    <a href={a.link} target="_blank" rel="noopener noreferrer"
      className="relative flex items-stretch gap-3 sm:gap-4 pl-5 pr-3 py-3 sm:pl-6 sm:pr-4 sm:py-3.5 rounded-xl border border-gray-700 bg-gray-800 overflow-hidden hover:border-amber-400/40 transition-colors group">
      {/* the colour down the left edge */}
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: ARTICLE_COLOR }} />
      <div className="hidden sm:flex sm:order-1 shrink-0 flex-col items-center justify-center self-center rounded-lg sm:px-4 sm:py-3 sm:min-w-[5.5rem]"
        style={{ background: `${ARTICLE_COLOR}1f` }}>
        <CalendarIcon className="w-3.5 h-3.5 mb-1 sm:w-4 sm:h-4 sm:mb-1.5 text-gray-500" />
        <span className="text-lg sm:text-xl font-bold font-mono leading-none text-gray-200">{Number(a.date.slice(8, 10))}</span>
        <span className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">{formatShortDate(a.date).split(' ')[0]}</span>
      </div>
      <div className="order-1 sm:order-2 min-w-0 flex-1 self-center">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: ARTICLE_COLOR }}>
          {SOURCE_NAMES[a.source] || a.source}
        </div>
        <div className="mt-0.5 text-base font-semibold text-white group-hover:text-amber-400 transition-colors leading-snug">{a.title}</div>
        <div className="flex items-center gap-3 sm:block mt-2 sm:mt-1.5">
          {/* phones: the date in a small box, with the author and the language on its right, one per row */}
          <div className="sm:hidden shrink-0 flex flex-col items-center justify-center rounded-lg bg-gray-900/70 px-2.5 py-2 min-w-[3.75rem]">
            <CalendarIcon className="w-3.5 h-3.5 mb-1 text-gray-500" />
            <span className="text-lg font-bold font-mono leading-none text-gray-200">{Number(a.date.slice(8, 10))}</span>
            <span className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">{formatShortDate(a.date).split(' ')[0]}</span>
          </div>
          <div className="min-w-0 flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
            <span className="max-w-full text-sm text-gray-400 truncate">by {a.author}</span>
            {lang && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-gray-300 bg-gray-700 shrink-0">
                <span className="text-base leading-none">{lang.flag}</span>
                {lang.name}
              </span>
            )}
          </div>
        </div>
      </div>
      {/* the article's picture, as full-height as the card art in Newspauper */}
      {showImage && (a.image || SOURCE_LOGOS[a.source]) && (
        <div className={`order-3 relative shrink-0 self-stretch w-20 sm:w-28 -my-3 -mr-3 sm:-my-3.5 sm:-mr-4 rounded-l-2xl overflow-hidden ${a.image ? 'bg-gray-900' : 'bg-white'}`}>
          {a.image
            ? <img src={a.image} alt="" loading="lazy" referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
            : <img src={SOURCE_LOGOS[a.source]} alt={SOURCE_NAMES[a.source] || a.source} loading="lazy"
                className="absolute inset-0 w-full h-full object-contain p-2" />}
        </div>
      )}
    </a>
  )
}
