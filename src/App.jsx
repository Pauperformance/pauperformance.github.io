import { lazy, Suspense } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Layout from './components/Layout'

const Home           = lazy(() => import('./pages/Home'))
const ArchetypesIndex = lazy(() => import('./pages/ArchetypesIndex'))
const ArchetypePage  = lazy(() => import('./pages/ArchetypePage'))
const FamilyPage     = lazy(() => import('./pages/FamilyPage'))
const FormatTimeline = lazy(() => import('./pages/FormatTimeline'))
const PauperPool     = lazy(() => import('./pages/PauperPool'))
const Creators       = lazy(() => import('./pages/Creators'))
const CardsIndex     = lazy(() => import('./pages/CardsIndex'))
const CardPage       = lazy(() => import('./pages/CardPage'))
const DeckPage       = lazy(() => import('./pages/DeckPage'))
const Watch          = lazy(() => import('./pages/Watch'))
const PlayersIndex   = lazy(() => import('./pages/PlayersIndex'))
const PlayerPage     = lazy(() => import('./pages/PlayerPage'))
const BlindSpy       = lazy(() => import('./pages/BlindSpy'))
const FAQ            = lazy(() => import('./pages/FAQ'))
const Contact        = lazy(() => import('./pages/Contact'))

function NotFound() {
  return (
    <Layout>
      <div className="text-center py-20">
        <p className="text-4xl font-bold text-gray-600 mb-4">404</p>
        <p className="text-gray-400 mb-6">Page not found.</p>
        <Link to="/" className="text-amber-400 hover:underline text-sm">← Back to home</Link>
      </div>
    </Layout>
  )
}

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/archetypes" element={<ArchetypesIndex />} />
        <Route path="/archetypes/:name" element={<ArchetypePage />} />
        <Route path="/families/:name" element={<FamilyPage />} />
        <Route path="/timeline" element={<FormatTimeline />} />
        <Route path="/sets" element={<PauperPool />} />
        <Route path="/creators" element={<Creators />} />
        <Route path="/cards" element={<CardsIndex />} />
        <Route path="/cards/:slug" element={<CardPage />} />
        <Route path="/decks/:id" element={<DeckPage />} />
        <Route path="/watch" element={<Watch />} />
        <Route path="/players" element={<PlayersIndex />} />
        <Route path="/players/:slug" element={<PlayerPage />} />
        <Route path="/blind-spy" element={<BlindSpy />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
