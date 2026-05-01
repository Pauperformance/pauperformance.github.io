import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const PAGES = [
  { to: '/archetypes', label: 'Archetypes Index', description: 'A curated list of the most important Pauper archetypes.' },
  { href: './pages/set_index.html', label: 'Set Index', description: 'Reference numbers used by Pauperformance to uniquely identify Magic sets.' },
  { href: './pages/pauper_pool.html', label: 'Pauper Pool', description: 'How the pool of legal Pauper cards has grown over time.' },
  { href: './pages/format_timeline.html', label: 'Format Timeline', description: 'The most important events in Pauper history.' },
]

const PHDS = [
  { href: './phds/PAUPERGANDA.html', label: 'PAUPERGANDA' },
  { href: './phds/tarmogoyf_ita.html', label: 'tarmogoyf_ita' },
  { href: './phds/Heisen01.html', label: 'Heisen01' },
  { href: './phds/Adepto Terra.html', label: 'Adepto Terra' },
]

const NEWS = [
  { flag: '🇬🇧', href: 'https://magic.wizards.com/en/articles/archive/news/march-7-2022-banned-and-restricted-announcement', title: 'MARCH 7, 2022 BANNED AND RESTRICTED ANNOUNCEMENT', author: 'Wizards of the Coast', date: '2022-03-07' },
  { flag: '🇬🇧', href: 'https://magic.wizards.com/en/articles/archive/news/explanation-pauper-bans-march-7-2022', title: 'EXPLANATION OF PAUPER BANS FOR MARCH 7, 2022', author: 'Gavin Verhey', date: '2022-03-07' },
  { flag: '🇬🇧', href: 'https://www.youtube.com/watch?v=orMPmImTFN4', title: 'MTG School Club - Each One Teach One', author: 'Eisenherz', date: '2022-03-05' },
  { flag: '🇬🇧', href: 'https://magic.wizards.com/en/articles/archive/news/january-20-2022-banned-and-restricted-announcement', title: 'JANUARY 20, 2022 BANNED AND RESTRICTED ANNOUNCEMENT', author: 'Gavin Verhey', date: '2022-01-20' },
  { flag: '🇬🇧', href: 'https://magic.wizards.com/en/articles/archive/news/announcing-pauper-format-panel-2022-01-10', title: 'ANNOUNCING THE PAUPER FORMAT PANEL', author: 'Gavin Verhey', date: '2022-01-10' },
]

function PageCard({ to, href, label, description }) {
  const cls = 'block bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-amber-400/50 transition-all group'
  const inner = (
    <>
      <p className="font-semibold text-white group-hover:text-amber-400 transition-colors">{label}</p>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </>
  )
  return to
    ? <Link to={to} className={cls}>{inner}</Link>
    : <a href={href} className={cls}>{inner}</a>
}

export default function Home() {
  return (
    <Layout>
      <div className="space-y-12">
        <section>
          <p className="text-lg text-gray-300 leading-relaxed">
            Hello Pauper player, and welcome to the <strong className="text-white">Academy</strong>!
          </p>
          <p className="mt-4 text-gray-400 leading-relaxed">
            This website aims to be the online encyclopedia for Pauper, collecting and organising resources
            for players with different skill levels. The Academy is currently under construction — read the{' '}
            <a href="./pages/faq.html" className="text-amber-400 hover:underline">FAQs</a>{' '}
            to learn more about this project and its roadmap.
          </p>
        </section>

        <section className="bg-gray-800 border border-amber-400/30 rounded-xl p-6">
          <p className="text-gray-300 leading-relaxed">
            <strong className="text-white">If you are a content creator</strong>, you can join the Pauperformance
            network and autonomously contribute to the Academy with original content. Read the{' '}
            <a href="./pages/phd_guidelines.html" className="text-amber-400 hover:underline">PhD Guidelines</a>.
          </p>
          <p className="mt-3 text-gray-400 text-sm">
            {PHDS.length} PhDs have already joined the Academy:{' '}
            {PHDS.map(({ href, label }, i) => (
              <span key={label}>
                <a href={href} className="text-amber-400 hover:underline">{label}</a>
                {i < PHDS.length - 1 ? ', ' : ''}
              </span>
            ))}! 🎉
          </p>
        </section>

        <section className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">Current code</p>
          <p className="text-2xl font-bold text-white">
            1069 <span className="text-base font-normal text-gray-400">— Secrets of Strixhaven</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">Released 2026-04-24</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Pages</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAGES.map(p => <PageCard key={p.label} {...p} />)}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Newspauper</h2>
          <div className="divide-y divide-gray-700 border border-gray-700 rounded-xl overflow-hidden">
            {NEWS.map(({ flag, href, title, author, date }) => (
              <a key={href} href={href} target="_blank" rel="noreferrer"
                className="flex items-start gap-3 px-5 py-4 bg-gray-800 hover:bg-gray-750 transition-colors group">
                <span className="text-lg shrink-0">{flag}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-200 group-hover:text-amber-400 transition-colors leading-snug">{title}</p>
                  <p className="text-xs text-gray-500 mt-1">{author} · {date}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}
