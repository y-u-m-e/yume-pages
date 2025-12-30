/**
 * =============================================================================
 * EVENTS LIST - Event Discovery for Ironforged Events Site
 * =============================================================================
 * 
 * Landing page for the events app showing all available tile events.
 * This is a wrapper/adaptation of TileEvents for the events subdomain.
 * 
 * Key differences from TileEvents:
 * - Routes to /events/:id instead of /tile-events/:id
 * - No admin management link (admin is on main site)
 * - Simplified for event participants only
 * 
 * @module EventsList
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// API base URL from environment
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface TileEventSummary {
  id: number;
  name: string;
  description?: string;
  is_active: number;
  tile_count: number;
  participant_count: number;
  created_at: string;
}

export default function EventsList() {
  const { user } = useAuth();
  const [events, setEvents] = useState<TileEventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/tile-events`, {
        credentials: 'include'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const activeEvents = events.filter(e => e.is_active === 1);
  const pastEvents = events.filter(e => e.is_active === 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-white mb-2">
          {user ? `Welcome back, ${user.global_name || user.username}!` : 'Clan Events'}
        </h1>
        <p className="text-gray-400">
          Complete tiles in order to progress through clan events
        </p>
      </div>

      {/* Active Events */}
      {activeEvents.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            Active Events
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {activeEvents.map(event => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="group bg-yume-card rounded-2xl border border-yume-border p-6 hover:border-amber-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                    {event.name}
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full">
                    Active
                  </span>
                </div>
                
                {event.description && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>
                )}
                
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
                
                <div className="mt-4 pt-4 border-t border-yume-border">
                  <span className="text-amber-400 text-sm font-medium group-hover:underline">
                    View Event →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-400 mb-4">
            Past Events
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {pastEvents.map(event => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="group bg-yume-card/50 rounded-2xl border border-yume-border/50 p-6 hover:border-yume-border transition-all opacity-75 hover:opacity-100"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    {event.name}
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full">
                    Ended
                  </span>
                </div>
                
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

      {/* Empty State */}
      {events.length === 0 && (
        <div className="bg-yume-card rounded-2xl border border-yume-border p-12 text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h3 className="text-xl font-bold text-white mb-2">No Events Yet</h3>
          <p className="text-gray-400">
            Check back later for upcoming clan events.
          </p>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-3 text-2xl">
              1️⃣
            </div>
            <div className="font-medium text-white mb-1">Join an Event</div>
            <div className="text-sm text-gray-400">
              Select an active event to participate
            </div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-3 text-2xl">
              🎯
            </div>
            <div className="font-medium text-white mb-1">Complete Tasks</div>
            <div className="text-sm text-gray-400">
              Work through tiles in order - each unlocks the next
            </div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-3 text-2xl">
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

