/**
 * =============================================================================
 * YUME PAGES - Main Application Entry Point
 * =============================================================================
 * 
 * Root component for the Yume Tools React application.
 * Sets up routing and authentication context for all pages.
 * 
 * Architecture:
 * - React Router v6 for client-side routing
 * - AuthProvider wraps entire app for global auth state
 * - Layout component provides consistent nav/footer
 * - All routes are nested under Layout for consistent structure
 * 
 * Hosted on Cloudflare Pages with automatic deployments from GitHub.
 * 
 * @author Yume Tools Team
 */

import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'

// =============================================================================
// PAGE IMPORTS
// =============================================================================
// All page components are lazy-loadable but imported directly for simplicity

import Home from '@/pages/Home'              // Landing page with status dashboard
import CruddyPanel from '@/pages/CruddyPanel' // Attendance tracking interface
import Docs from '@/pages/Docs'              // API documentation
import Admin from '@/pages/Admin'            // User management (admin only)
import DevOps from '@/pages/DevOps'          // System status & deployment info
import Profile from '@/pages/Profile'        // User profile page
import AIDebug from '@/pages/AIDebug'        // AI scan debug/testing (admin)
import Architecture from '@/pages/Architecture' // System architecture diagrams

/**
 * Main Application Component
 * 
 * Sets up the routing structure and global providers.
 * All routes are wrapped in AuthProvider for authentication state.
 */
function App() {
  return (
    // AuthProvider: Makes auth state available to all components via useAuth()
    <AuthProvider>
      <Routes>
        {/* 
          Layout Route: Provides consistent navigation, header, and footer
          All child routes render inside Layout's <Outlet /> component
        */}
        <Route path="/" element={<Layout />}>
          
          {/* PUBLIC ROUTES - Accessible to all users */}
          <Route index element={<Home />} />            {/* / - Landing page */}
          
          {/* PROTECTED ROUTES - Require authentication */}
          <Route path="cruddy-panel" element={<CruddyPanel />} /> {/* /cruddy-panel */}
          <Route path="docs" element={<Docs />} />               {/* /docs */}
          <Route path="architecture" element={<Architecture />} /> {/* /architecture */}
          <Route path="profile" element={<Profile />} />         {/* /profile */}
          
          {/* ADMIN ROUTES - Require admin permissions */}
          <Route path="admin" element={<Admin />} />             {/* /admin - User mgmt */}
          <Route path="devops" element={<DevOps />} />           {/* /devops - System status */}
          <Route path="admin/ai-debug" element={<AIDebug />} />  {/* AI scan testing */}
          
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
