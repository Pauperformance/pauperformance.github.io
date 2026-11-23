import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { formatDateTime, formatShortDate } from '../utils/dates'

const NAV_ITEMS = [
  { to: '/archetypes', label: 'Archetypes' },
  { to: '/cards', label: 'Cards' },
  { to: '/sets', label: 'Sets' },
  { to: '/metagames', label: 'Metagames' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/watch', label: 'Watch' },
  { to: '/articles', label: 'Articles' },
  { to: '/theory', label: 'Theory' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/players', label: 'Players' },
  { to: '/creators', label: 'Creators' },
  { to: '/wordle', label: 'Wordle' },
  // FAQ ('/faq') is hidden for now: its page and route are still there, add it back here to link it
]

// Phones: the bottom bar. The pages that have an entry of their own (their
// path in NAV_ITEMS), then "Other" with all the remaining pages of NAV_ITEMS.
// Icons: Lucide-style stroke paths on a 24x24 grid.
const BAR_ITEMS = [
  { to: '/archetypes', label: 'Archetypes',
    x: [2, 22],
    icon: <><path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="m13 19 6-6" /><path d="m16 16 4 4" /><path d="m19 21 2-2" /><path d="M14.5 6.5 18 3h3v3l-3.5 3.5" /><path d="m5 14 4 4" /><path d="m7 17-3 3" /><path d="m3 19 2 2" /></> },
  { to: '/articles', label: 'Articles',
    x: [2, 22],
    icon: <><path d="M12 5.5v16" /><path d="M12 5.5 3 3v16.5l9 2" /><path d="M12 5.5 21 3v16.5l-9 2" /><path d="M5.5 8h4" /><path d="M5.5 12h4" /><path d="M5.5 16h4" /><path d="M14.5 8h4" /><path d="M14.5 12h4" /><path d="M14.5 16h4" /></> },
  { to: '/tournaments', label: 'Tournaments',
    x: [1, 23],
    icon: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></> },
  { to: '/watch', label: 'Watch',
    x: [1, 23],
    icon: <><path d="M10 7.75a.75.75 0 0 1 1.142-.638l3.664 2.249a.75.75 0 0 1 0 1.278l-3.664 2.25a.75.75 0 0 1-1.142-.638z" /><path d="M12 17v4" /><path d="M8 21h8" /><rect x="2" y="3" width="20" height="14" rx="2" /></> },
  { to: '/metagames', label: 'Metagames',
    x: [1, 23],
    icon: <><path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z" /><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /></> },
]
// Icons of the pages in the "Other" menu
const OTHER_ICONS = {
  // three cards fanned out from a point below them, like a starting hand; the side cards are cut away where the
  // middle one covers them (the mask), so that their lines don't show through it
  '/cards': <>
    <mask id="cards-hand">
      <rect x="-4" y="-4" width="32" height="32" fill="white" stroke="none" />
      <rect x="7.15" y="3.4" width="9.7" height="18.2" rx="2.4" fill="black" stroke="none" />
    </mask>
    <g mask="url(#cards-hand)">
      <rect x="8.75" y="5" width="6.5" height="15" rx="1.5" transform="rotate(-20 12 28)" />
      <rect x="8.75" y="5" width="6.5" height="15" rx="1.5" transform="rotate(20 12 28)" />
    </g>
    <rect x="8.75" y="5" width="6.5" height="15" rx="1.5" />
  </>,
  '/sets': <><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></>,
  '/announcements': <><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
  // a graduation cap
  '/theory': <><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /><path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></>,
  '/players': <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  '/creators': <><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" /><path d="m6.2 5.3 3.1 3.9" /><path d="m12.4 3.4 3.1 4" /><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></>,
  // a row of letter tiles, the middle one filled
  '/wordle': <><rect x="2" y="8" width="5" height="8" rx="1" /><rect x="9.5" y="8" width="5" height="8" rx="1" fill="currentColor" /><rect x="17" y="8" width="5" height="8" rx="1" /></>,
  '/faq': <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></>,
}
const BAR_PATHS = BAR_ITEMS.map(i => i.to)
const OTHER_ITEMS = NAV_ITEMS.filter(i => !BAR_PATHS.includes(i.to))
const BAR_BUTTON = 'shrink-0 px-3 flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium transition-colors'

function BottomBar({ pathname }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  // "Other" is lit on the pages it holds (the page itself, not those below it)
  const inOther = pathname === '/settings' || OTHER_ITEMS.some(i => pathname === i.to)
  // The icon is cropped to what it draws (x = its range on the 24-grid, stroke included),
  // so the width of the svg is the width you see and the gaps between icons are the same.
  const svg = (icon, [x0, x1]) => (
    <svg className="h-6 shrink-0" style={{ width: x1 - x0 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox={`${x0} 0 ${x1 - x0} 24`} aria-hidden="true">{icon}</svg>
  )
  // the label is centred under the icon and doesn't count in the width of the button
  const label = text => (
    <span className="relative block h-3 w-full">
      <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap leading-3">{text}</span>
    </span>
  )
  return (
    <>
      {/* a tap anywhere else closes the menu */}
      {open && <div className="xl:hidden fixed inset-0 z-20" onClick={() => setOpen(false)} />}
      <nav aria-label="Main" className={`xl:hidden fixed inset-x-0 bottom-0 ${open ? 'z-[60]' : 'z-30'} border-t border-gray-700 bg-gray-950 pb-[env(safe-area-inset-bottom)]`}>
        {open && (
          <div className="absolute bottom-full right-0 w-52 origin-bottom-right rounded-t-xl border border-b-0 border-gray-700 bg-gray-950 p-1.5 shadow-2xl flex flex-col">
            {OTHER_ITEMS.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === to ? 'bg-amber-400/10 text-amber-400' : 'text-gray-300 active:bg-gray-800'
                }`}>
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">{OTHER_ICONS[to]}</svg>
                {label}
              </Link>
            ))}
            <div className="my-1 border-t border-gray-800" />
            <Link to="/settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/settings' ? 'bg-amber-400/10 text-amber-400' : 'text-gray-300 active:bg-gray-800'
              }`}>
              <GearIcon className="w-5 h-5 shrink-0" />
              Settings
            </Link>
          </div>
        )}
        <div className="flex items-stretch justify-around">
          {BAR_ITEMS.map(({ to, label: text, icon, x }) => {
            const active = pathname === to
            return (
              <Link key={to} to={to} aria-current={active ? 'page' : undefined}
                className={`${BAR_BUTTON} ${active ? 'text-amber-400' : 'text-gray-400 active:text-white'}`}>
                {svg(icon, x)}
                {label(text)}
              </Link>
            )
          })}
          <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu"
            className={`${BAR_BUTTON} ${open || inOther ? 'text-amber-400' : 'text-gray-400 active:text-white'}`}>
            {svg(<><circle cx="12" cy="12" r="1" /><circle cx="20" cy="12" r="1" /><circle cx="4" cy="12" r="1" /></>, [2, 22])}
            {label('Other')}
          </button>
        </div>
      </nav>
    </>
  )
}

// Desktop: the "Other" entry of the header, with the pages that have no entry of their own in a menu under it
function HeaderOther({ pathname }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const inOther = OTHER_ITEMS.some(i => pathname === i.to)
  return (
    <div className="relative">
      {/* a click anywhere else closes the menu */}
      {open && <div className="fixed inset-0" onClick={() => setOpen(false)} />}
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu"
        className={`flex items-center gap-1 px-2 2xl:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          open || inOther ? 'bg-amber-400/10 text-amber-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}>
        Other
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-52 rounded-xl border border-gray-700 bg-gray-950 p-1.5 shadow-2xl flex flex-col">
          {OTHER_ITEMS.map(({ to, label }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === to ? 'bg-amber-400/10 text-amber-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}>
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">{OTHER_ICONS[to]}</svg>
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Where to find Pauperformance, in the footer of every page (but the hidden ones).
const CONTACTS = [
  {
    label: 'Twitch',
    value: 'pauperformance',
    href: 'https://www.twitch.tv/pauperformance',
    icon: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z',
  },
  {
    label: 'YouTube',
    value: 'Pauperformance',
    href: 'https://www.youtube.com/channel/UCDUiIskNnmuJ3XJ1SdQqs0A',
    icon: 'M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z',
  },
  {
    label: 'Instagram',
    value: 'pauperformance',
    href: 'https://www.instagram.com/pauperformance/',
    icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
  },
  {
    label: 'Discord',
    value: 'Pauperformance server',
    href: 'https://discord.gg/fYQbpjjkQ3',
    icon: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.011.028.028.053.046.067a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z',
  },
  {
    label: 'Twitter / X',
    hidden: true,
    value: '@pauperformance',
    href: 'https://twitter.com/pauperformance',
    icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'Telegram',
    hidden: true,
    value: 'pauperformance',
    href: 'https://telegram.me/pauperformance',
    icon: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
  },
  {
    label: 'GitHub',
    value: 'Pauperformance',
    href: 'https://github.com/Pauperformance',
    icon: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
  {
    label: 'MTGGoldfish',
    value: 'Pauperformance',
    href: 'https://www.mtggoldfish.com/player/Pauperformance',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z',
  },
  {
    label: 'Moxfield',
    value: 'Pauperformance',
    href: 'https://moxfield.com/users/Pauperformance',
    // two stacked cards: the deck archive
    icon: 'M9 6h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM5 4a2 2 0 0 1 2-2h9v2H7v13H5z',
  },
  {
    label: 'Email',
    value: 'pauperformance@gmail.com',
    href: 'mailto:pauperformance@gmail.com',
    icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  },
]

// The Heroicons "cog-6-tooth" outline
function GearIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function when(fetchedAt, date, label) {
  if (fetchedAt) return `${label}: ${formatDateTime(fetchedAt)}.`
  if (date) return `${label}: ${formatShortDate(date)}.`
  return null
}

// On the home page only: when the decks were last refreshed (from
// stats.json, built by build-data.mjs), with the time when Myr recorded when
// they were fetched, else the date alone. Whatever is missing is left out.
function DataFreshness() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/data/stats.json').then(r => r.json()).then(setStats).catch(() => setStats(null))
  }, [])

  if (!stats) return null
  const parts = [
    when(stats.lastDecksFetchedAt, stats.lastDecksUpdate, 'Last decks update'),
  ].filter(Boolean)
  if (!parts.length) return null
  return <span className="text-xs text-gray-500 text-center">{parts.join(' ')}</span>
}

// The face of the coins: a conic sweep of gold tones and a bright spot at the top left
const FACE = 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95) 0, rgba(255,255,255,0) 38%), conic-gradient(from 210deg, #b8860b, #ffe066, #fff7c2, #ffd23f, #c99700, #ffe680, #b8860b)'

// How thick the coins are (px) and the number of discs that make up their edge
const COIN_THICKNESS = 5
const COIN_DISCS = 9

// The easter egg's coins, each: how far across the mascot (%), when it starts (ms), how long it takes to fall (ms),
// its size (px) and how fast it turns (ms per two turns; negative: the other way). Uneven on purpose.
const COINS = [[41, 0, 880, 16, 1150], [68, 70, 960, 14, -1050], [53, 240, 800, 18, 1250], [85, 280, 920, 15, -1100], [35, 520, 1000, 17, 1050], [76, 640, 840, 14, -1200]]

// topBar: a bar for the page (its section icons on phones), kept under the header
export default function Layout({ children, topBar = null }) {
  // The header and every page share one width, so the menu doesn't move from
  // page to page: wide screens use up to 1920px.
  const maxW = 'max-w-[1920px]'
  const { pathname } = useLocation()
  // Easter egg: each click on the mascot drops a burst of coins in front of it (clicks in a row, more of them
  // at once). It goes nowhere: the logo and the title are the ways home.
  const [bursts, setBursts] = useState([])
  const burstId = useRef(0)
  const clickMascot = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = ++burstId.current
    const jitter = n => (Math.random() * 2 - 1) * n
    const coins = COINS.map(([left, delay, fall, size, turn]) => [
      Math.min(88, Math.max(30, left + jitter(9))), Math.max(0, delay + jitter(90)), fall * (1 + jitter(0.1)), size + Math.round(jitter(1)), turn * (1 + jitter(0.15)),
    ])
    // at most 8 bursts (48 coins) at a time
    setBursts(prev => [...prev.slice(-7), { id, coins }])
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 1700)
  }
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="border-b border-gray-700 bg-gray-950 sticky top-0 z-10">
        <div className={`${maxW} mx-auto px-4 h-16 sm:h-[4.75rem] xl:h-auto xl:py-4 flex items-center gap-4 2xl:gap-8 xl:grid xl:grid-cols-[1fr_auto_1fr] relative`}>
          <Link to="/" className="relative z-10 xl:shrink-0">
            <div className="text-base sm:text-xl font-bold tracking-tight text-white whitespace-nowrap">
              Pauperformance <span className="text-amber-400">Academy</span>
            </div>
            <div className="text-[11px] sm:text-xs text-gray-500 tracking-wide mt-0.5 whitespace-nowrap">A common journey to optimal Pauper</div>
          </Link>
          {/* The main pages are in the bar from xl (1280px) up, the others under "Other" (as on phones): with Settings beside it, more doesn't fit. From xl the header is three columns (logo, bar, an empty one), so the bar is centred on the page, not between the logo and the edge. */}
          <nav className="hidden xl:flex justify-center items-center 2xl:gap-1">
            {BAR_ITEMS.map(({ to, label, icon }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-2 2xl:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === to
                    ? 'bg-amber-400/10 text-amber-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>
                {label}
              </Link>
            ))}
            <HeaderOther pathname={pathname} />
            <Link to="/settings"
              className={`flex items-center gap-1.5 px-2 2xl:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === '/settings'
                  ? 'bg-amber-400/10 text-amber-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <GearIcon className="w-4 h-4" />
              Settings
            </Link>
          </nav>
          {/* the mascot is always top right, out of the layout (absolute) so the bar keeps its height: as tall as the bar, which has a fixed height below xl (so the mascot stays small there and the texts are one line) */}
          <button type="button" aria-label="Gary the mascot" onClick={clickMascot} className="absolute right-0 xl:right-4 top-0 h-full overflow-hidden cursor-pointer">
            <img src="/images/logo-color-crop.png" alt="" width="511" height="210" fetchPriority="high" className="block h-full w-auto max-w-none -mr-[10px] xl:mr-0" />
            {/* the coins fall from the top of the bar and fade out at its bottom edge, in front of the mascot; overflow-hidden on the link, so that they never go past the bar */}
            {bursts.flatMap(b => b.coins.map(([left, delay, fall, size, turn], i) => (
              <span key={`${b.id}-${i}`} aria-hidden="true" className="coin-drop pointer-events-none absolute"
                style={{ left: `${left}%`, width: size, height: size, animationDelay: `${delay}ms`, animationDuration: `${fall}ms`, perspective: 160 }}>
                {/* a coin in 3D: its faces and a stack of discs between them for the edge, turning on its axis */}
                <span className="coin-turn relative block w-full h-full"
                  style={{ animationDuration: `${Math.abs(turn)}ms`, animationDirection: turn < 0 ? 'reverse' : 'normal' }}>
                  {/* the coin is COIN_THICKNESS thick, centred on the plane it turns around */}
                  {Array.from({ length: COIN_DISCS }, (_, k) => (
                    <span key={k} className="absolute inset-0 rounded-full"
                      style={{ transform: `translateZ(${COIN_THICKNESS / 2 - (k + 1) * COIN_THICKNESS / (COIN_DISCS + 1)}px)`, background: k % 2 ? '#d9a300' : '#9a6f00' }} />
                  ))}
                  {/* the back face, then the front face with its shine */}
                  <span className="absolute inset-0 rounded-full" style={{ transform: `translateZ(${-COIN_THICKNESS / 2}px) rotateY(180deg)`, background: FACE, border: '1px solid #9a6f00' }} />
                  <span className="absolute inset-0 overflow-hidden rounded-full"
                    style={{ transform: `translateZ(${COIN_THICKNESS / 2}px)`, background: FACE, border: '1px solid #9a6f00', boxShadow: 'inset 0 0 0 2px rgba(255, 245, 170, 0.5), 0 0 6px rgba(255, 210, 60, 0.7)' }}>
                    {/* the glint sweeping over the coin */}
                    <span className="coin-glint absolute inset-y-0 -left-1/2 w-1/2"
                      style={{ background: 'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.9) 50%, transparent 100%)' }} />
                  </span>
                </span>
              </span>
            )))}
          </button>
        </div>
        {topBar}
      </header>

      <main className={`${maxW} mx-auto px-4 pt-5 pb-10`}>
        {children}
      </main>

      <footer className="border-t border-gray-700 mt-16 pb-16 xl:pb-0">
        <div className="max-w-[1920px] mx-auto px-4 py-8 flex flex-col items-center gap-4 text-sm text-gray-500">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {CONTACTS.filter(c => !c.hidden).map(({ href, label, icon }) => (
              <a key={label} href={href} target={href.startsWith('mailto') ? undefined : '_blank'} rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-amber-400 transition-colors">
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d={icon} />
                </svg>
                {label}
              </a>
            ))}
          </div>
          <p className="max-w-4xl text-center text-xs leading-relaxed">
            Pauperformance Academy is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards.{' '}
            <br className="hidden md:inline" />
            Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
          </p>
          {pathname === '/' && <DataFreshness />}
        </div>
      </footer>

      <BottomBar pathname={pathname} />
    </div>
  )
}
