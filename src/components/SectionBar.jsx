import { useEffect, useMemo, useState } from 'react'
import { scrollToSection } from './TableOfContents'

// Lucide-style stroke paths (24x24 grid), by section id
const ICONS = {
  // a rising line: how much the archetype is played over time
  popularity: <><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></>,
  // a list of lines: the typical decklist
  'typical-list': <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>,
  // a book: guides and resources
  resources: <><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></>,
  // a bookmark: the reference decks
  'reference-decks': <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />,
  // stacked cards: the decks
  decks: <><rect x="8" y="3" width="13" height="17" rx="2" /><path d="M5 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h9" /></>,
  // a double helix: how the cards evolve, metagame by metagame
  evolution: <><path d="m10 16 1.5 1.5" /><path d="m14 8-1.5-1.5" /><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" /><path d="m16.5 10.5 1 1" /><path d="m17 6-2.891-2.891" /><path d="M2 15c6.667-6 13.333 0 20-6" /><path d="m20 9 .891.891" /><path d="M3.109 14.109 4 15" /><path d="m6.5 12.5 1 1" /><path d="m7 18 2.891 2.891" /><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" /></>,
  // a video camera
  videos: <><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" /></>,
}
const HOME_ICONS = {
  // swords: the top archetypes
  'top-archetypes': <><path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="m13 19 6-6" /><path d="m16 16 4 4" /><path d="m19 21 2-2" /><path d="M14.5 6.5 18 3h3v3l-3.5 3.5" /><path d="m5 14 4 4" /><path d="m7 17-3 3" /><path d="m3 19 2 2" /></>,
  // a pie: the metagame
  metagame: <><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></>,
  // a counter: the Academy in numbers
  stats: <><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="m19 9-5 5-4-4-3 3" /></>,
  // a trophy: the tournaments
  tournaments: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></>,
  // an open newspaper: the articles
  articles: <><path d="M12 5.5v16" /><path d="M12 5.5 3 3v16.5l9 2" /><path d="M12 5.5 21 3v16.5l-9 2" /><path d="M5.5 8h4" /><path d="M5.5 12h4" /><path d="M5.5 16h4" /><path d="M14.5 8h4" /><path d="M14.5 12h4" /><path d="M14.5 16h4" /></>,
  // a megaphone: the Academy's news
  newspauper: <><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
}
Object.assign(ICONS, HOME_ICONS, {
  pie: HOME_ICONS.metagame,
  archetypes: HOME_ICONS['top-archetypes'],
  // arrows up and down: the cards that rose and fell
  cards: <><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></>,
})
const FALLBACK = <circle cx="12" cy="12" r="4" />

// The page's table of contents as a row of icons, for phones: it goes in the
// Layout's `topBar`, which stays fixed under the header while the page scrolls.
// sections: [{ id, label, count }], as for TableOfContents. The section being
// read is lit.
export default function SectionBar({ sections: all }) {
  const [current, setCurrent] = useState(null)
  // the sections the page has on screen (some load late, or not at all)
  const [present, setPresent] = useState(null)
  useEffect(() => {
    let frame
    const check = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const ids = all.filter(s => document.getElementById(s.id)).map(s => s.id).join()
        setPresent(prev => (prev === ids ? prev : ids))
      })
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [all])
  const sections = useMemo(() => (present === null ? all : all.filter(s => present.split(',').includes(s.id))), [all, present])

  useEffect(() => {
    const onScroll = () => {
      // the last section whose top has passed under the header and this bar
      const line = (document.querySelector('header')?.offsetHeight ?? 112) + 24
      let id = null
      for (const s of sections) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= line) id = s.id
      }
      setCurrent(id)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sections])

  return (
    <nav aria-label="On this page" className="md:hidden border-t border-gray-800 bg-gray-950">
      <ul className="flex items-stretch px-1">
        {sections.map(({ id, label, short }) => (
          <li key={id} className="flex-1 min-w-0">
            <button onClick={() => scrollToSection(id)} aria-label={label} title={label}
              aria-current={current === id ? 'true' : undefined}
              className={`relative w-full flex flex-col items-center gap-0.5 pt-1.5 pb-1.5 transition-colors ${current === id ? 'text-amber-400' : 'text-gray-400 active:text-white'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                {ICONS[id] || FALLBACK}
              </svg>
              <span className="max-w-full truncate px-0.5 text-[10px] font-medium leading-none">{short ?? label}</span>
              {current === id && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-amber-400" />}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
