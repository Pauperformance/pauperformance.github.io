import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ArchetypesIndex from './pages/ArchetypesIndex'
import ArchetypePage from './pages/ArchetypePage'
import SetIndex from './pages/SetIndex'
import FormatTimeline from './pages/FormatTimeline'
import PauperPool from './pages/PauperPool'
import PhDGuidelines from './pages/PhDGuidelines'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/archetypes" element={<ArchetypesIndex />} />
      <Route path="/archetypes/:name" element={<ArchetypePage />} />
      <Route path="/sets" element={<SetIndex />} />
      <Route path="/timeline" element={<FormatTimeline />} />
      <Route path="/pool" element={<PauperPool />} />
      <Route path="/phd-guidelines" element={<PhDGuidelines />} />
    </Routes>
  )
}

export default App
