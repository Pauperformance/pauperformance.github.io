import { formatShortDate } from '../utils/dates'
import { LANG_FLAG, LANG_CANONICAL, LANG_NAME } from '../utils/languages'
import CalendarIcon from './CalendarIcon'

const ARTICLE_COLOR = '#d9822b'
const SOURCE_NAMES = { cardsrealm: 'Cards Realm' }

// An article from one of the sites that publish Pauper ones, in the look of a
// Newspauper entry: the date on the left, the picture full-height on the right.
export default function ArticleCard({ article: a }) {
  // the language's flag and name (the sources write it as "ENG", "PT"...)
  const code = a.language && (LANG_CANONICAL[a.language] ?? LANG_CANONICAL[a.language.toLowerCase()])
  const lang = code ? { flag: LANG_FLAG[code], name: LANG_NAME[code] } : null
  return (
    <a href={a.link} target="_blank" rel="noopener noreferrer"
      className="relative flex items-stretch gap-4 pl-6 pr-4 py-3.5 rounded-xl border border-gray-700 bg-gray-800 overflow-hidden hover:border-amber-400/40 transition-colors group">
      {/* the colour down the left edge */}
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: ARTICLE_COLOR }} />
      <div className="shrink-0 flex flex-col items-center justify-center rounded-lg px-4 py-3 min-w-[5.5rem]"
        style={{ background: `${ARTICLE_COLOR}1f` }}>
        <CalendarIcon className="w-4 h-4 mb-1.5 text-gray-500" />
        <span className="text-xl font-bold font-mono leading-none text-gray-200">{Number(a.date.slice(8, 10))}</span>
        <span className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">{formatShortDate(a.date).split(' ')[0]}</span>
      </div>
      <div className="min-w-0 flex-1 self-center">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: ARTICLE_COLOR }}>
          {SOURCE_NAMES[a.source] || a.source}
        </div>
        <div className="mt-0.5 text-base font-semibold text-white group-hover:text-amber-400 transition-colors leading-snug">{a.title}</div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
          <span className="text-sm text-gray-400">by {a.author}</span>
          {lang && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-gray-300 bg-gray-700 shrink-0">
              <span className="text-base leading-none">{lang.flag}</span>
              {lang.name}
            </span>
          )}
        </div>
      </div>
      {/* the article's picture, as full-height as the card art in Newspauper */}
      {a.image && (
        <div className="relative shrink-0 self-stretch w-20 sm:w-28 -my-3.5 -mr-4 rounded-l-2xl bg-gray-900 overflow-hidden">
          <img src={a.image} alt="" loading="lazy" referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
        </div>
      )}
    </a>
  )
}
