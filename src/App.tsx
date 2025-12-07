import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import InfographicMaker from '@/pages/InfographicMaker'
import CruddyPanel from '@/pages/CruddyPanel'
import Docs from '@/pages/Docs'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="infographic-maker" element={<InfographicMaker />} />
          <Route path="cruddy-panel" element={<CruddyPanel />} />
          <Route path="docs" element={<Docs />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App

