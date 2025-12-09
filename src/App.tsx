import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import CruddyPanel from '@/pages/CruddyPanel'
import Docs from '@/pages/Docs'
import Admin from '@/pages/Admin'
import DevOps from '@/pages/DevOps'
import Profile from '@/pages/Profile'

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
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
