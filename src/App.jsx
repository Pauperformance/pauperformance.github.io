import { lazy, Suspense } from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import Layout from './components/Layout'

const Home           = lazy(() => import('./pages/Home'))
const ArchetypesIndex = lazy(() => import('./pages/ArchetypesIndex'))
const ArchetypePage  = lazy(() => import('./pages/ArchetypePage'))
const FamilyPage     = lazy(() => import('./pages/FamilyPage'))
const Announcements  = lazy(() => import('./pages/Announcements'))
const PauperPool     = lazy(() => import('./pages/PauperPool'))
const MetagameIndex  = lazy(() => import('./pages/MetagameIndex'))
const MetagamePage   = lazy(() => import('./pages/MetagamePage'))
const Creators       = lazy(() => import('./pages/Creators'))
const CardsIndex     = lazy(() => import('./pages/CardsIndex'))
const CardPage       = lazy(() => import('./pages/CardPage'))
const DeckPage       = lazy(() => import('./pages/DeckPage'))
const Watch          = lazy(() => import('./pages/Watch'))
const PlayersIndex   = lazy(() => import('./pages/PlayersIndex'))
const PlayerPage     = lazy(() => import('./pages/PlayerPage'))
const BlindSpy       = lazy(() => import('./pages/BlindSpy'))
const Diff            = lazy(() => import('./pages/Diff'))
const FAQ            = lazy(() => import('./pages/FAQ'))

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
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/timeline" element={<Navigate to="/announcements" replace />} />
        <Route path="/sets" element={<PauperPool />} />
        <Route path="/metagames" element={<MetagameIndex />} />
        <Route path="/metagames/:code" element={<MetagamePage />} />
        <Route path="/creators" element={<Creators />} />
        <Route path="/cards" element={<CardsIndex />} />
        <Route path="/cards/:slug" element={<CardPage />} />
        <Route path="/decks/:id" element={<DeckPage />} />
        <Route path="/watch" element={<Watch />} />
        <Route path="/players" element={<PlayersIndex />} />
        <Route path="/players/:slug" element={<PlayerPage />} />
        <Route path="/blind-spy" element={<BlindSpy />} />
        <Route path="/diff" element={<Diff />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
