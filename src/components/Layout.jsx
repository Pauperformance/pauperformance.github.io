import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/archetypes', label: 'Archetypes' },
]

const SOCIAL_LINKS = [
  { href: 'https://www.twitch.tv/pauperformance', label: 'Twitch' },
  { href: 'https://www.youtube.com/channel/UCDUiIskNnmuJ3XJ1SdQqs0A', label: 'YouTube' },
  { href: 'https://www.instagram.com/pauperformance/', label: 'Instagram' },
  { href: 'https://discord.gg/fYQbpjjkQ3', label: 'Discord' },
]

export default function Layout({ children }) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="border-b border-gray-700 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-8">
          <Link to="/" className="shrink-0">
            <div className="text-xl font-bold tracking-tight text-white">
              Pauperformance <span className="text-amber-400">Academy</span>
            </div>
            <div className="text-xs text-gray-500 tracking-wide mt-0.5">A common journey to optimal Pauper</div>
          </Link>
          <nav className="flex gap-1 flex-1">
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
          <div className="hidden sm:flex gap-4 shrink-0">
            {SOCIAL_LINKS.map(({ href, label }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer"
                className="text-sm text-gray-500 hover:text-amber-400 transition-colors">
                {label}
              </a>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {children}
      </main>

      <footer className="border-t border-gray-700 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8 text-center text-sm text-gray-500">
          Pauperformance Academy
        </div>
      </footer>
    </div>
  )
}
