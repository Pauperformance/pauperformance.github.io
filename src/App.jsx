import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ArchetypesIndex from './pages/ArchetypesIndex'
import ArchetypePage from './pages/ArchetypePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/archetypes" element={<ArchetypesIndex />} />
      <Route path="/archetypes/:name" element={<ArchetypePage />} />
    </Routes>
  )
}

export default App
