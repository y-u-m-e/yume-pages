/**
 * =============================================================================
 * EVENTS ENTRY POINT
 * =============================================================================
 * 
 * Entry point for the ironforged-events.emuy.gg site.
 * Renders the EventsApp instead of the main App.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import EventsApp from './EventsApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <EventsApp />
    </BrowserRouter>
  </StrictMode>,
)

