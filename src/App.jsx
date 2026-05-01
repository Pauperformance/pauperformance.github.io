import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ArchetypesIndex from './pages/ArchetypesIndex'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/archetypes" element={<ArchetypesIndex />} />
    </Routes>
  )
}

export default App
