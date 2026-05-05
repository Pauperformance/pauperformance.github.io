import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/archetypes', label: 'Archetypes' },
  { to: '/sets', label: 'Set Index' },
  { to: '/timeline', label: 'Format Timeline' },
  { to: '/pool', label: 'Pauper Pool' },
  { to: '/phd-guidelines', label: 'PhD Guidelines' },
]

const SOCIAL_LINKS = [
  { href: 'https://www.twitch.tv/pauperformance', label: 'Twitch' },
  { href: 'https://www.youtube.com/channel/UCDUiIskNnmuJ3XJ1SdQqs0A', label: 'YouTube' },
  { href: 'https://www.instagram.com/pauperformance/', label: 'Instagram' },
  { href: 'https://discord.gg/fYQbpjjkQ3', label: 'Discord' },
]

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="border-b border-gray-700 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 py-4 flex items-center gap-8">
          <Link to="/" className="shrink-0">
            <div className="text-xl font-bold tracking-tight text-white">
              Pauperformance <span className="text-amber-400">Academy</span>
            </div>
            <div className="text-xs text-gray-500 tracking-wide mt-0.5">A common journey to optimal Pauper</div>
          </Link>
          <nav className="hidden lg:flex gap-1 flex-1">
            {NAV_ITEMS.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === to
                    ? 'bg-amber-400/10 text-amber-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                {label}
              </Link>
            ))}
          </nav>
          <button
            className="lg:hidden ml-auto p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-700 bg-gray-950 px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === to
                    ? 'bg-amber-400/10 text-amber-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                {label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 py-10">
        {children}
      </main>

      <footer className="border-t border-gray-700 mt-16">
        <div className="max-w-screen-2xl mx-auto px-4 py-8 flex flex-col items-center gap-4 text-sm text-gray-500">
          <div className="flex gap-6">
            {SOCIAL_LINKS.map(({ href, label }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer"
                className="hover:text-amber-400 transition-colors">
                {label}
              </a>
            ))}
          </div>
          <span>Pauperformance Academy</span>
        </div>
      </footer>
    </div>
  )
}
