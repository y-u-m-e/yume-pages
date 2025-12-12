import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import CruddyPanel from '@/pages/CruddyPanel'
import Docs from '@/pages/Docs'
import Admin from '@/pages/Admin'
import DevOps from '@/pages/DevOps'
import Profile from '@/pages/Profile'
import TileEvents from '@/pages/TileEvents'
import TileEvent from '@/pages/TileEvent'
import TileEventAdmin from '@/pages/TileEventAdmin'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="cruddy-panel" element={<CruddyPanel />} />
          <Route path="docs" element={<Docs />} />
          <Route path="admin" element={<Admin />} />
          <Route path="devops" element={<DevOps />} />
          <Route path="profile" element={<Profile />} />
          <Route path="tile-events" element={<TileEvents />} />
          <Route path="tile-events/:eventId" element={<TileEvent />} />
          <Route path="admin/tile-events" element={<TileEventAdmin />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
