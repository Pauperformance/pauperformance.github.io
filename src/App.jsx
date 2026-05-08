import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ArchetypesIndex from './pages/ArchetypesIndex'
import ArchetypePage from './pages/ArchetypePage'
import FamilyPage from './pages/FamilyPage'
import FormatTimeline from './pages/FormatTimeline'
import PauperPool from './pages/PauperPool'
import Creators from './pages/Creators'
import CardsIndex from './pages/CardsIndex'
import CardPage from './pages/CardPage'
import DeckPage from './pages/DeckPage'
import FAQ from './pages/FAQ'
import Contact from './pages/Contact'
import BlindSpy from './pages/BlindSpy'

function App() {
  return (
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
      <Route path="/blind-spy" element={<BlindSpy />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/contact" element={<Contact />} />
    </Routes>
  )
}

export default App
