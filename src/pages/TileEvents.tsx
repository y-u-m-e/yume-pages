/**
 * =============================================================================
 * TILE EVENTS LIST - Event Discovery Hub
 * =============================================================================
 * 
 * Landing page for the tile events system. Displays all available tile events
 * and allows users to browse and select events to participate in.
 * 
 * Features:
 * - List of active tile events (highlighted, with pulse animation)
 * - List of past/ended events (dimmed, for historical reference)
 * - Event statistics (tile count, participant count)
 * - Admin link to event management (if admin)
 * - "How It Works" section explaining the tile system
 * 
 * Event Cards Display:
 * - Event name and description
 * - Active/Ended status badge
 * - Number of tiles in the event
 * - Number of participants
 * - Click-through to event detail page
 * 
 * Empty State:
 * - Shown when no events exist
 * - Different message for admins vs regular users
 * - Admin can navigate to create first event
 * 
 * Access Control:
 * - Anyone can view the list (public discovery)
 * - Requires login to actually participate in events
 * - Admin badge and management link for admins
 * 
 * @module TileEvents
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// API base URL from environment
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Summary data for a tile event
 * Includes aggregate counts for display in list
 */
interface TileEventSummary {
  id: number;               // Database ID (used for routing)
  name: string;             // Event display name
  description?: string;     // Optional event description
  is_active: number;        // 1 = active, 0 = ended
  tile_count: number;       // Number of tiles in event path
  participant_count: number;// Number of users who have joined
  created_at: string;       // ISO timestamp of creation
}

/**
 * Tile Events List Page Component
 * 
 * Displays all tile events in categorized sections (active/past)
 * with navigation to individual event pages.
 */
export default function TileEvents() {
  // ==========================================================================
  // AUTH STATE
  // ==========================================================================
  
  const { isAdmin } = useAuth();
  
  // ==========================================================================
  // STATE
  // ==========================================================================
  
  const [events, setEvents] = useState<TileEventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  /**
   * Fetch all events on component mount
   */
  useEffect(() => {
    fetchEvents();
  }, []);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  /**
   * Fetch all tile events from the API
   * Public endpoint - no authentication required for listing
   */
  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/tile-events`, {
        credentials: 'include'  // Include auth for potential future permission checks
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yume-accent"></div>
      </div>
    );
  }

  // ==========================================================================
  // EVENT CATEGORIZATION
  // ==========================================================================

  // Separate active and past events for display
  const activeEvents = events.filter(e => e.is_active === 1);
  const pastEvents = events.filter(e => e.is_active === 0);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tile Events</h1>
          <p className="text-gray-400">
            Complete tiles in order to progress through clan events
          </p>
        </div>
        
        {/* Admin Management Link */}
        {isAdmin && (
          <Link 
            to="/admin/tile-events"
            className="btn-primary flex items-center gap-2"
          >
            <span>⚙</span>
            Manage Events
          </Link>
        )}
      </div>

      {/* ========== ACTIVE EVENTS SECTION ========== */}
      {activeEvents.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            {/* Pulsing green dot indicator */}
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            Active Events
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {activeEvents.map(event => (
              <Link
                key={event.id}
                to={`/tile-events/${event.id}`}
                className="group bg-yume-card rounded-2xl border border-yume-border p-6 hover:border-yume-accent transition-all"
              >
                {/* Event Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-white group-hover:text-yume-accent transition-colors">
                    {event.name}
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full">
                    Active
                  </span>
                </div>
                
                {/* Event Description (if available) */}
                {event.description && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>
                )}
                
                {/* Event Statistics */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <span>🎯</span>
                    <span>{event.tile_count} tiles</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <span>👥</span>
                    <span>{event.participant_count} participants</span>
                  </div>
                </div>
                
                {/* Call to Action */}
                <div className="mt-4 pt-4 border-t border-yume-border">
                  <span className="text-yume-accent text-sm font-medium group-hover:underline">
                    View Event →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ========== PAST EVENTS SECTION ========== */}
      {pastEvents.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-400 mb-4">
            Past Events
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {pastEvents.map(event => (
              <Link
                key={event.id}
                to={`/tile-events/${event.id}`}
                className="group bg-yume-card/50 rounded-2xl border border-yume-border/50 p-6 hover:border-yume-border transition-all opacity-75 hover:opacity-100"
              >
                {/* Event Header (Dimmed) */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    {event.name}
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full">
                    Ended
                  </span>
                </div>
                
                {/* Event Statistics */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{event.tile_count} tiles</span>
                  <span>•</span>
                  <span>{event.participant_count} participants</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ========== EMPTY STATE ========== */}
      {events.length === 0 && (
        <div className="bg-yume-card rounded-2xl border border-yume-border p-12 text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h3 className="text-xl font-bold text-white mb-2">No Events Yet</h3>
          <p className="text-gray-400 mb-6">
            {isAdmin 
              ? "Create your first tile event to get started!"
              : "Check back later for upcoming clan events."}
          </p>
          {isAdmin && (
            <Link to="/admin/tile-events" className="btn-primary">
              Create Event
            </Link>
          )}
        </div>
      )}

      {/* ========== HOW IT WORKS SECTION ========== */}
      <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
        <div className="grid sm:grid-cols-3 gap-6">
          {/* Step 1: Join */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-yume-accent/20 flex items-center justify-center mx-auto mb-3 text-2xl">
              1️⃣
            </div>
            <div className="font-medium text-white mb-1">Join an Event</div>
            <div className="text-sm text-gray-400">
              Login with Discord and select an active event
            </div>
          </div>
          {/* Step 2: Complete */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-yume-accent/20 flex items-center justify-center mx-auto mb-3 text-2xl">
              🎯
            </div>
            <div className="font-medium text-white mb-1">Complete Tasks</div>
            <div className="text-sm text-gray-400">
              Work through tiles in order - each unlocks the next
            </div>
          </div>
          {/* Step 3: Finish */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-yume-accent/20 flex items-center justify-center mx-auto mb-3 text-2xl">
              🏆
            </div>
            <div className="font-medium text-white mb-1">Finish the Event</div>
            <div className="text-sm text-gray-400">
              Complete all tiles to finish the event!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
