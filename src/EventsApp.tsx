/**
 * =============================================================================
 * IRONFORGED EVENTS - Standalone Events Application
 * =============================================================================
 * 
 * Dedicated app for the tile events system, hosted on ironforged-events.emuy.gg
 * This is a streamlined version focused only on event participation.
 * 
 * Features:
 * - Events landing page with login
 * - Event listing and participation
 * - Progress tracking
 * - Screenshot submission
 * - Admin panel for event management (requires events permission)
 * 
 * @author Yume Tools Team
 */

import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import EventsLayout from '@/components/EventsLayout'

// Event pages
import EventsHome from '@/pages/events/EventsHome'
import EventsList from '@/pages/events/EventsList'
import TileEvent from '@/pages/TileEvent'

// Admin pages (reused from main app)
import TileEventAdmin from '@/pages/TileEventAdmin'
import AIDebug from '@/pages/AIDebug'

/**
 * Events Application Component
 * 
 * Simplified routing for the events-only site.
 * All routes use the EventsLayout for consistent branding.
 */
function EventsApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<EventsLayout />}>
          {/* Landing page with login */}
          <Route index element={<EventsHome />} />
          
          {/* Event listing - uses events-specific component with /events/ routes */}
          <Route path="events" element={<EventsList />} />
          
          {/* Individual event view - reuses TileEvent component */}
          <Route path="events/:eventId" element={<TileEvent />} />
          
          {/* Admin routes - requires events permission */}
          <Route path="admin" element={<TileEventAdmin />} />
          <Route path="admin/ai-debug" element={<AIDebug />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default EventsApp

