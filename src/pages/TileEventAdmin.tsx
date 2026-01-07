/**
 * =============================================================================
 * TILE EVENT ADMIN - Event Management Dashboard
 * =============================================================================
 * 
 * Admin interface for creating and managing tile events.
 * Requires 'events' permission or admin access.
 * 
 * Features:
 * - Create/edit/delete tile events
 * - Add/edit/reorder tiles manually
 * - Sync tiles from Google Sheets (public sheets only)
 * - View and manage participants
 * - Unlock tiles for specific users
 * - Reset or remove participants
 * 
 * Layout:
 * - Left sidebar: List of events
 * - Right panel: Selected event details
 *   - Tiles tab: Manage tile path
 *   - Participants tab: View/manage participants
 * 
 * @module TileEventAdmin
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// API base URL from environment
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Tile event summary (from list endpoint)
 * Includes aggregate counts for display
 */
interface TileEvent {
  id: number;                   // Database ID
  name: string;                 // Event name
  description?: string;         // Optional description
  is_active: number;            // 1 = active, 0 = ended
  google_sheet_id?: string;     // Google Sheet ID for sync
  google_sheet_tab?: string;    // Sheet tab name for sync
  required_keyword?: string;    // Mandatory keyword for OCR verification
  webhook_url?: string;         // Discord webhook URL for notifications
  webhook_template?: string;    // Custom webhook embed template (JSON)
  tile_count: number;           // Number of tiles in event
  participant_count: number;    // Number of participants
  created_at: string;           // ISO timestamp
}

/**
 * Individual tile in an event
 * Can be created manually or synced from Google Sheets
 */
interface Tile {
  id?: number;            // Database ID (undefined for new tiles)
  position: number;       // Order in the snake path (0-indexed)
  title: string;          // Tile name/title
  description?: string;   // Detailed description
  image_url?: string;     // Optional image URL
  is_start?: number;      // 1 if first tile
  is_end?: number;        // 1 if final tile
  unlock_keywords?: string; // Comma-separated keywords for AI auto-approval
  required_submissions?: number; // Number of approved submissions needed (default 1)
}

/**
 * Participant progress data
 * Includes Discord user info from admin_users table
 */
interface Participant {
  id: number;                   // Progress record ID
  discord_id: string;           // Discord user ID
  discord_username: string;     // Discord username
  username?: string;            // From users table
  global_name?: string;         // Discord display name
  avatar?: string;              // Discord avatar hash
  rsn?: string;                 // RuneScape name
  current_tile: number;         // Highest tile position
  tiles_unlocked: number[];     // Array of completed tile positions
  skips_used: number;           // Number of skips used
  completed_at?: string;        // ISO timestamp if finished
  updated_at: string;           // Last activity timestamp
}

/**
 * Event user with RSN and notes
 * Users who have logged in via the events subdomain
 */
interface EventUser {
  id: number;
  discord_id: string;
  username: string;
  global_name?: string;
  avatar?: string;
  rsn?: string;                 // RuneScape name
  notes?: string;               // Admin notes
  first_login_at: string;
  last_login_at: string;
  login_count: number;
}

/**
 * Tile Event Admin Page Component
 * 
 * Full admin dashboard for tile event management.
 * Redirects non-admins to home page.
 */
export default function TileEventAdmin() {
  const { isEventsAdmin } = useAuth();
  const navigate = useNavigate();
  
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  
  // Event list and selection
  const [events, setEvents] = useState<TileEvent[]>([]);           // All events
  const [selectedEvent, setSelectedEvent] = useState<TileEvent | null>(null); // Current
  const [tiles, setTiles] = useState<Tile[]>([]);                  // Selected event's tiles
  const [participants, setParticipants] = useState<Participant[]>([]); // Participants
  const [loading, setLoading] = useState(true);                    // Initial load state
  const [activeTab, setActiveTab] = useState<'tiles' | 'participants' | 'submissions' | 'settings'>('tiles');
  
  // Submissions state
  interface Submission {
    id: number;
    tile_id: number;
    discord_id: string;
    discord_username: string;
    global_name?: string;
    avatar?: string;
    rsn?: string;               // RuneScape name
    username?: string;          // Discord username from users table
    image_url: string;
    status: string;
    ocr_text?: string;
    ai_confidence?: number;
    admin_notes?: string;
    created_at: string;
    tile_title: string;
    tile_position: number;
  }
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [submissionFilter, setSubmissionFilter] = useState<string>('pending');
  const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null);
  
  // Event creation/editing form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventRequiredKeyword, setNewEventRequiredKeyword] = useState('');
  
  // Tile editing
  const [editingTile, setEditingTile] = useState<Tile | null>(null);
  const [showTileForm, setShowTileForm] = useState(false);
  const [savingTiles, setSavingTiles] = useState(false);
  
  // Sheet sync states
  const [sheetId, setSheetId] = useState('');
  const [sheetTab, setSheetTab] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showSheetConfig, setShowSheetConfig] = useState(false);
  
  // Tile submissions view (for viewing approved images per tile)
  const [viewingTileSubmissions, setViewingTileSubmissions] = useState<{
    tile: Tile;
    participant: Participant;
    submissions: Submission[];
  } | null>(null);
  const [loadingTileSubmissions, setLoadingTileSubmissions] = useState(false);
  
  // Event users management (RSN linking)
  const [showUsersView, setShowUsersView] = useState(false);
  const [eventUsers, setEventUsers] = useState<EventUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'with_rsn' | 'without_rsn'>('all');
  const [editingUser, setEditingUser] = useState<EventUser | null>(null);

  useEffect(() => {
    if (!isEventsAdmin) {
      navigate('/');
      return;
    }
    fetchEvents();
  }, [isEventsAdmin, navigate]);

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

  const fetchEventDetails = async (eventId: number) => {
    try {
      const [eventRes, participantsRes, submissionsRes] = await Promise.all([
        fetch(`${API_BASE}/tile-events/${eventId}`, { credentials: 'include' }),
        fetch(`${API_BASE}/admin/tile-events/${eventId}/participants`, { credentials: 'include' }),
        fetch(`${API_BASE}/admin/tile-events/${eventId}/submissions?status=${submissionFilter}`, { credentials: 'include' })
      ]);
      
      if (eventRes.ok) {
        const data = await eventRes.json();
        setSelectedEvent(data.event);
        setTiles(data.tiles || []);
        // Set sheet config from event
        setSheetId(data.event.google_sheet_id || '');
        setSheetTab(data.event.google_sheet_tab || '');
      }
      
      if (participantsRes.ok) {
        const data = await participantsRes.json();
        setParticipants(data.participants || []);
      }
      
      if (submissionsRes.ok) {
        const data = await submissionsRes.json();
        setSubmissions(data.submissions || []);
        setSubmissionCounts(data.counts || { total: 0, pending: 0, approved: 0, rejected: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch event details:', err);
    }
  };
  
  /**
   * Fetch submissions with current filter
   */
  const fetchSubmissions = async () => {
    if (!selectedEvent) return;
    try {
      const res = await fetch(
        `${API_BASE}/admin/tile-events/${selectedEvent.id}/submissions?status=${submissionFilter}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setSubmissionCounts(data.counts || { total: 0, pending: 0, approved: 0, rejected: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    }
  };
  
  /**
   * Fetch all event users for RSN management
   */
  const fetchEventUsers = async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set('search', userSearch);
      if (userFilter === 'with_rsn') params.set('has_rsn', 'true');
      if (userFilter === 'without_rsn') params.set('has_rsn', 'false');
      
      const res = await fetch(
        `${API_BASE}/admin/event-users?${params.toString()}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setEventUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch event users:', err);
    } finally {
      setUsersLoading(false);
    }
  };
  
  /**
   * Update a user's RSN and/or notes
   */
  const updateEventUser = async (discordId: string, rsn: string, notes: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/event-users/${discordId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsn, notes })
      });
      if (res.ok) {
        // Update local state
        setEventUsers(users => users.map(u => 
          u.discord_id === discordId ? { ...u, rsn, notes } : u
        ));
        setEditingUser(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (err) {
      console.error('Failed to update user:', err);
      alert('Failed to update user');
    }
  };
  
  /**
   * Review a submission (approve/reject)
   */
  const reviewSubmission = async (submissionId: number, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events/submissions/${submissionId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      
      if (res.ok) {
        setReviewingSubmission(null);
        fetchSubmissions();
        if (selectedEvent) {
          fetchEventDetails(selectedEvent.id);
        }
      } else {
        const data = await res.json();
        alert(`Failed to update: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to review submission:', err);
      alert('Failed to review submission');
    }
  };
  
  /**
   * Delete a submission
   */
  const deleteSubmission = async (submissionId: number) => {
    if (!confirm('Delete this submission?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events/submissions/${submissionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        fetchSubmissions();
      }
    } catch (err) {
      console.error('Failed to delete submission:', err);
    }
  };

  const createEvent = async () => {
    if (!newEventName.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEventName,
          description: newEventDesc,
          required_keyword: newEventRequiredKeyword
        })
      });
      
      if (res.ok) {
        setNewEventName('');
        setNewEventDesc('');
        setNewEventRequiredKeyword('');
        setShowCreateForm(false);
        fetchEvents();
      } else {
        const data = await res.json();
        alert(`Failed to create event: ${data.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Failed to create event:', err);
      alert('Failed to create event. Check console for details.');
    }
  };

  const toggleEventActive = async (event: TileEvent) => {
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events/${event.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          is_active: event.is_active ? 0 : 1
        })
      });
      
      if (res.ok) {
        fetchEvents();
        if (selectedEvent?.id === event.id) {
          fetchEventDetails(event.id);
        }
      }
    } catch (err) {
      console.error('Failed to toggle event:', err);
    }
  };

  const deleteEvent = async (eventId: number) => {
    if (!confirm('Are you sure? This will delete all tiles and progress!')) return;
    
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        if (selectedEvent?.id === eventId) {
          setSelectedEvent(null);
          setTiles([]);
          setParticipants([]);
        }
        fetchEvents();
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const saveTiles = async () => {
    if (!selectedEvent || savingTiles) return;
    
    setSavingTiles(true);
    try {
      // Normalize tiles to ensure clean data without duplicates
      const cleanTiles = tiles.map((tile, index) => ({
        title: tile.title || '',
        description: tile.description || '',
        image_url: tile.image_url || '',
        unlock_keywords: tile.unlock_keywords || '',
        required_submissions: tile.required_submissions || 1,
        position: index
      }));
      
      const res = await fetch(`${API_BASE}/admin/tile-events/${selectedEvent.id}/tiles/bulk`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiles: cleanTiles })
      });
      
      if (res.ok) {
        await fetchEventDetails(selectedEvent.id);
        fetchEvents();
      } else {
        const data = await res.json();
        alert(`Failed to save: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to save tiles:', err);
      alert('Failed to save tiles');
    } finally {
      setSavingTiles(false);
    }
  };

  const addTile = () => {
    const newTile: Tile = {
      position: tiles.length,
      title: '',
      description: '',
      image_url: '',
      unlock_keywords: '',
      required_submissions: 1
    };
    setEditingTile(newTile);
    setShowTileForm(true);
  };

  const saveTile = () => {
    if (!editingTile || !editingTile.title.trim()) return;
    
    if (editingTile.position < tiles.length) {
      // Update existing
      setTiles(prev => prev.map((t, i) => i === editingTile.position ? editingTile : t));
    } else {
      // Add new
      setTiles(prev => [...prev, editingTile]);
    }
    
    setEditingTile(null);
    setShowTileForm(false);
  };

  const removeTile = (index: number) => {
    setTiles(prev => prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, position: i })));
  };

  const moveTile = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === tiles.length - 1)) return;
    
    const newTiles = [...tiles];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newTiles[index], newTiles[swapIndex]] = [newTiles[swapIndex], newTiles[index]];
    setTiles(newTiles.map((t, i) => ({ ...t, position: i })));
  };

  const unlockTile = async (participant: Participant, tilePosition: number) => {
    if (!selectedEvent) return;
    
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events/${selectedEvent.id}/unlock`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_id: participant.discord_id,
          tile_position: tilePosition,
          username: participant.discord_username
        })
      });
      
      if (res.ok) {
        fetchEventDetails(selectedEvent.id);
      }
    } catch (err) {
      console.error('Failed to unlock tile:', err);
    }
  };

  const lockTile = async (participant: Participant, tilePosition: number) => {
    if (!selectedEvent) return;
    
    // Confirm before stepping back
    const tileName = tiles[tilePosition]?.title || `Tile ${tilePosition + 1}`;
    if (!confirm(`Step ${participant.rsn || participant.global_name || participant.discord_username} back to before "${tileName}"? This will also remove any tiles after it.`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events/${selectedEvent.id}/lock`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_id: participant.discord_id,
          tile_position: tilePosition
        })
      });
      
      if (res.ok) {
        fetchEventDetails(selectedEvent.id);
      }
    } catch (err) {
      console.error('Failed to lock tile:', err);
    }
  };

  const resetUserProgress = async (participant: Participant) => {
    if (!selectedEvent || !confirm(`Reset progress for ${participant.rsn || participant.global_name || participant.discord_username}?`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events/${selectedEvent.id}/reset-user`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord_id: participant.discord_id })
      });
      
      if (res.ok) {
        fetchEventDetails(selectedEvent.id);
      }
    } catch (err) {
      console.error('Failed to reset progress:', err);
    }
  };

  const removeParticipant = async (participant: Participant) => {
    if (!selectedEvent || !confirm(`Remove ${participant.rsn || participant.global_name || participant.discord_username} from this event? Their progress will be deleted.`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events/${selectedEvent.id}/participants/${participant.discord_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        fetchEventDetails(selectedEvent.id);
        fetchEvents();
      }
    } catch (err) {
      console.error('Failed to remove participant:', err);
    }
  };

  const adjustSkips = async (participant: Participant, newSkipsUsed: number) => {
    if (!selectedEvent) return;
    
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events/${selectedEvent.id}/participants/${participant.discord_id}/skips`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skips_used: newSkipsUsed })
      });
      
      if (res.ok) {
        fetchEventDetails(selectedEvent.id);
      } else {
        const data = await res.json();
        alert(`Failed to adjust skips: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to adjust skips:', err);
    }
  };

  const viewTileSubmissions = async (participant: Participant, tile: Tile) => {
    if (!selectedEvent) return;
    
    setLoadingTileSubmissions(true);
    try {
      const res = await fetch(
        `${API_BASE}/admin/tile-events/${selectedEvent.id}/participants/${participant.discord_id}/tiles/${tile.position}/submissions`,
        { credentials: 'include' }
      );
      
      if (res.ok) {
        const data = await res.json();
        setViewingTileSubmissions({
          tile,
          participant,
          submissions: data.submissions || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch tile submissions:', err);
    } finally {
      setLoadingTileSubmissions(false);
    }
  };

  const saveSheetConfig = async () => {
    if (!selectedEvent) return;
    
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events/${selectedEvent.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedEvent,
          google_sheet_id: sheetId,
          google_sheet_tab: sheetTab
        })
      });
      
      if (res.ok) {
        setShowSheetConfig(false);
        fetchEventDetails(selectedEvent.id);
        alert('Sheet configuration saved!');
      } else {
        const data = await res.json();
        alert(`Failed to save: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to save sheet config:', err);
      alert('Failed to save sheet configuration');
    }
  };

  const syncFromSheet = async () => {
    if (!selectedEvent) return;
    
    if (!sheetId || !sheetTab) {
      setShowSheetConfig(true);
      return;
    }
    
    if (!confirm(`This will replace all existing tiles with data from the Google Sheet. Continue?`)) return;
    
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events/${selectedEvent.id}/sync-sheet`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert(data.message || `Synced ${data.tilesImported} tiles from sheet!`);
        fetchEventDetails(selectedEvent.id);
        fetchEvents();
      } else {
        alert(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to sync from sheet:', err);
      alert('Failed to sync from Google Sheet');
    } finally {
      setSyncing(false);
    }
  };

  if (!isEventsAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yume-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tile Event Manager</h1>
          <p className="text-gray-400 text-sm">Create and manage tile-based clan events</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <span>+</span>
          New Event
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Events List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-white">Events</h2>
          
          {events.length === 0 ? (
            <div className="bg-yume-card rounded-xl border border-yume-border p-6 text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-400 text-sm">No events yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(event => (
                <button
                  key={event.id}
                  onClick={() => { fetchEventDetails(event.id); setShowUsersView(false); }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedEvent?.id === event.id && !showUsersView
                      ? 'bg-yume-accent/20 border-yume-accent'
                      : 'bg-yume-card border-yume-border hover:border-yume-accent/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-medium text-white">{event.name}</div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      event.is_active 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {event.is_active ? 'Active' : 'Ended'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {event.tile_count} tiles • {event.participant_count} participants
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* Manage Users Button */}
          <button
            onClick={() => { setShowUsersView(true); setSelectedEvent(null); fetchEventUsers(); }}
            className={`w-full p-4 rounded-xl border transition-all flex items-center gap-3 ${
              showUsersView
                ? 'bg-purple-500/20 border-purple-500'
                : 'bg-yume-card border-yume-border hover:border-purple-500/50'
            }`}
          >
            <span className="text-2xl">👥</span>
            <div className="text-left">
              <div className="font-medium text-white">Manage Users</div>
              <div className="text-xs text-gray-500">Link Discord IDs to RSNs</div>
            </div>
          </button>
        </div>

        {/* Event Details */}
        <div className="lg:col-span-2">
          {selectedEvent ? (
            <div className="space-y-4">
              {/* Event Header */}
              <div className="bg-yume-card rounded-xl border border-yume-border p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedEvent.name}</h2>
                    {selectedEvent.description && (
                      <p className="text-gray-400 text-sm mt-1">{selectedEvent.description}</p>
                    )}
                    {selectedEvent.required_keyword && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-500">🔐 Required:</span>
                        <code className="text-xs bg-yume-bg-light px-2 py-0.5 rounded text-emerald-400">
                          {selectedEvent.required_keyword}
                        </code>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleEventActive(selectedEvent)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedEvent.is_active
                          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                      }`}
                    >
                      {selectedEvent.is_active ? 'End Event' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteEvent(selectedEvent.id)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-2 border-t border-yume-border pt-4">
                  <button
                    onClick={() => setActiveTab('tiles')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'tiles'
                        ? 'bg-yume-accent text-yume-bg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Tiles ({tiles.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('participants')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'participants'
                        ? 'bg-yume-accent text-yume-bg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Participants ({participants.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('submissions'); fetchSubmissions(); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                      activeTab === 'submissions'
                        ? 'bg-yume-accent text-yume-bg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Submissions
                    {submissionCounts.pending > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {submissionCounts.pending}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'settings'
                        ? 'bg-yume-accent text-yume-bg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    ⚙️ Settings
                  </button>
                </div>
              </div>

              {/* Tiles Tab */}
              {activeTab === 'tiles' && (
                <div className="bg-yume-card rounded-xl border border-yume-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Tile Path</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowSheetConfig(true)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        title="Configure Google Sheet"
                      >
                        ⚙️ Sheet
                      </button>
                      <button
                        onClick={syncFromSheet}
                        disabled={syncing}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                      >
                        {syncing ? '⏳ Syncing...' : '📥 Sync from Sheet'}
                      </button>
                      <button
                        onClick={addTile}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yume-bg-light text-white hover:bg-yume-accent hover:text-yume-bg transition-colors"
                      >
                        + Add Tile
                      </button>
                      <button
                        onClick={saveTiles}
                        disabled={savingTiles}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingTiles ? '⏳ Saving...' : 'Save All'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Sheet config indicator */}
                  {(sheetId || sheetTab) && (
                    <div className="mb-4 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300">
                      📊 Sheet: <span className="font-mono">{sheetId || '(not set)'}</span> / Tab: <span className="font-mono">{sheetTab || '(not set)'}</span>
                    </div>
                  )}
                  
                  {tiles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">🎯</div>
                      <p>No tiles yet. Add your first tile or sync from a Google Sheet!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tiles.map((tile, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg bg-yume-bg-light group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-yume-accent/20 flex items-center justify-center text-yume-accent font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">{tile.title || 'Untitled'}</div>
                            <div className="flex gap-3 text-xs">
                              {tile.unlock_keywords && (
                                <span 
                                  className="text-emerald-400 cursor-help" 
                                  title={tile.unlock_keywords}
                                >
                                  🔑 {tile.unlock_keywords.split(',').filter(k => k.trim()).length} keywords
                                </span>
                              )}
                              {(tile.required_submissions || 1) > 1 && (
                                <span className="text-amber-400">
                                  📸 ×{tile.required_submissions}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => moveTile(index, 'up')}
                              disabled={index === 0}
                              className="p-1.5 rounded hover:bg-yume-bg disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveTile(index, 'down')}
                              disabled={index === tiles.length - 1}
                              className="p-1.5 rounded hover:bg-yume-bg disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => {
                                setEditingTile({ ...tile, position: index });
                                setShowTileForm(true);
                              }}
                              className="p-1.5 rounded hover:bg-yume-bg text-blue-400"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => removeTile(index)}
                              className="p-1.5 rounded hover:bg-yume-bg text-red-400"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Participants Tab */}
              {activeTab === 'participants' && (
                <div className="bg-yume-card rounded-xl border border-yume-border p-5">
                  <h3 className="font-semibold text-white mb-4">Participant Progress</h3>
                  
                  {participants.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">👥</div>
                      <p>No participants yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {participants.map(participant => (
                        <div
                          key={participant.id}
                          className="p-4 rounded-lg bg-yume-bg-light"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {participant.avatar ? (
                                <img
                                  src={`https://cdn.discordapp.com/avatars/${participant.discord_id}/${participant.avatar}.png?size=32`}
                                  alt=""
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm">
                                  👤
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-white">
                                  {participant.rsn || participant.global_name || participant.username || participant.discord_username}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-3">
                                  <span>{participant.tiles_unlocked.length}/{tiles.length} tiles</span>
                                  <span className="text-purple-400">
                                    ⏭️ {participant.skips_used || 0} skips used
                                  </span>
                                  {participant.completed_at && (
                                    <span className="text-emerald-400">✓ Completed</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Skip controls */}
                              <div className="flex items-center gap-1 bg-purple-500/10 rounded-lg px-2 py-1">
                                <button
                                  onClick={() => adjustSkips(participant, Math.max(0, (participant.skips_used || 0) - 1))}
                                  disabled={(participant.skips_used || 0) <= 0}
                                  className="w-5 h-5 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white disabled:opacity-30 text-xs"
                                  title="Remove a skip"
                                >
                                  −
                                </button>
                                <span className="text-xs text-purple-400 w-4 text-center">{participant.skips_used || 0}</span>
                                <button
                                  onClick={() => adjustSkips(participant, (participant.skips_used || 0) + 1)}
                                  className="w-5 h-5 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white text-xs"
                                  title="Add a skip"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                onClick={() => resetUserProgress(participant)}
                                className="text-xs text-yellow-400 hover:underline"
                              >
                                Reset
                              </button>
                              <button
                                onClick={() => removeParticipant(participant)}
                                className="text-xs text-red-400 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          
                          {/* Tile progress grid - click to view submissions, right-click to toggle */}
                          <div className="flex flex-wrap gap-1">
                            {tiles.map((tile, index) => {
                              const isUnlocked = participant.tiles_unlocked.includes(index);
                              const isNext = !isUnlocked && (index === 0 || participant.tiles_unlocked.includes(index - 1));
                              
                              return (
                                <button
                                  key={index}
                                  onClick={() => isUnlocked ? viewTileSubmissions(participant, tile) : unlockTile(participant, index)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    isUnlocked ? lockTile(participant, index) : unlockTile(participant, index);
                                  }}
                                  className={`w-8 h-8 rounded text-xs font-bold transition-all cursor-pointer ${
                                    isUnlocked
                                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                      : isNext
                                      ? 'bg-yume-accent/20 text-yume-accent hover:bg-yume-accent hover:text-yume-bg'
                                      : 'bg-gray-700 text-gray-500 hover:bg-gray-600'
                                  }`}
                                  title={`${tile.title} - ${isUnlocked ? 'Click to view submissions, right-click to lock' : 'Click to unlock'}`}
                                >
                                  {isUnlocked ? '✓' : index + 1}
                                </button>
                              );
                            })}
                          </div>
                          
                          {/* Navigation arrows */}
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => {
                                // Step back: lock the highest unlocked tile
                                const maxUnlocked = participant.tiles_unlocked.length > 0 
                                  ? Math.max(...participant.tiles_unlocked) 
                                  : -1;
                                if (maxUnlocked >= 0) {
                                  lockTile(participant, maxUnlocked);
                                }
                              }}
                              disabled={participant.tiles_unlocked.length === 0}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white"
                              title="Step back one tile"
                            >
                              <span>←</span>
                              <span>Back</span>
                            </button>
                            
                            <div className="flex-1 text-center text-xs text-gray-500">
                              Tile {participant.tiles_unlocked.length > 0 ? Math.max(...participant.tiles_unlocked) + 1 : 0} of {tiles.length}
                            </div>
                            
                            <button
                              onClick={() => {
                                // Advance: unlock the next tile
                                const maxUnlocked = participant.tiles_unlocked.length > 0 
                                  ? Math.max(...participant.tiles_unlocked) 
                                  : -1;
                                const nextTile = maxUnlocked + 1;
                                if (nextTile < tiles.length) {
                                  unlockTile(participant, nextTile);
                                }
                              }}
                              disabled={participant.tiles_unlocked.length >= tiles.length}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                              title="Advance one tile"
                            >
                              <span>Next</span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Submissions Tab */}
              {activeTab === 'submissions' && (
                <div className="bg-yume-card rounded-xl border border-yume-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Screenshot Submissions</h3>
                    <div className="flex gap-2">
                      <select
                        value={submissionFilter}
                        onChange={(e) => { setSubmissionFilter(e.target.value); }}
                        className="px-3 py-1.5 rounded-lg text-sm bg-yume-bg-light border border-yume-border text-white"
                      >
                        <option value="">All ({submissionCounts.total})</option>
                        <option value="pending">Pending ({submissionCounts.pending})</option>
                        <option value="approved">Approved ({submissionCounts.approved})</option>
                        <option value="rejected">Rejected ({submissionCounts.rejected})</option>
                      </select>
                      <button
                        onClick={fetchSubmissions}
                        className="px-3 py-1.5 rounded-lg text-sm bg-yume-bg-light text-gray-400 hover:text-white"
                      >
                        🔄
                      </button>
                    </div>
                  </div>
                  
                  {submissions.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">📸</div>
                      <p>No submissions {submissionFilter ? `with status "${submissionFilter}"` : 'yet'}.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {submissions.map(submission => (
                        <div
                          key={submission.id}
                          className="p-4 rounded-lg bg-yume-bg-light"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {submission.avatar ? (
                                <img
                                  src={`https://cdn.discordapp.com/avatars/${submission.discord_id}/${submission.avatar}.png?size=32`}
                                  alt=""
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm">
                                  👤
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-white">
                                  {submission.rsn || submission.global_name || submission.username || submission.discord_username}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Tile #{submission.tile_position + 1}: {submission.tile_title}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                submission.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                submission.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {submission.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(submission.created_at + 'Z').toLocaleString()}
                              </span>
                            </div>
                          </div>
                          
                          {/* Screenshot Preview - Uses crossOrigin for authenticated R2 access */}
                          <div className="mb-3">
                            <a 
                              href={submission.image_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block w-full h-48 bg-yume-bg rounded-lg overflow-hidden hover:ring-2 hover:ring-yume-accent transition-all"
                            >
                              <img
                                src={submission.image_url}
                                alt="Submission"
                                crossOrigin="use-credentials"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📷</text></svg>';
                                }}
                              />
                            </a>
                          </div>
                          
                          {/* AI Analysis Info */}
                          {(submission.ai_confidence !== null || submission.ocr_text) && (
                            <div className="mb-3 p-2 bg-yume-bg rounded text-xs">
                              {submission.ai_confidence != null && (
                                <div className="text-gray-400">
                                  AI Confidence: <span className={(submission.ai_confidence ?? 0) >= 0.8 ? 'text-emerald-400' : (submission.ai_confidence ?? 0) >= 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                                    {Math.round((submission.ai_confidence ?? 0) * 100)}%
                                  </span>
                                </div>
                              )}
                              {submission.ocr_text && (
                                <details className="mt-1">
                                  <summary className="text-gray-500 cursor-pointer hover:text-gray-300">OCR Text</summary>
                                  <p className="mt-1 text-gray-400 whitespace-pre-wrap">{submission.ocr_text}</p>
                                </details>
                              )}
                            </div>
                          )}
                          
                          {/* Actions */}
                          {submission.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => reviewSubmission(submission.id, 'approved')}
                                className="flex-1 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => setReviewingSubmission(submission)}
                                className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium"
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}
                          
                          {submission.status !== 'pending' && (
                            <div className="flex justify-end">
                              <button
                                onClick={() => deleteSubmission(submission.id)}
                                className="text-xs text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="bg-yume-card rounded-xl border border-yume-border p-5">
                  <h3 className="font-semibold text-white mb-4">Event Settings</h3>
                  
                  <div className="space-y-4">
                    {/* Event Name */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Event Name</label>
                      <input
                        type="text"
                        defaultValue={selectedEvent.name}
                        id="settings-name"
                        className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white focus:border-yume-accent outline-none"
                      />
                    </div>
                    
                    {/* Description */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Description</label>
                      <textarea
                        defaultValue={selectedEvent.description || ''}
                        id="settings-description"
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white focus:border-yume-accent outline-none resize-none"
                      />
                    </div>
                    
                    {/* Required Keyword */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        🔐 Required Keyword <span className="text-gray-500">(event identifier)</span>
                      </label>
                      <input
                        type="text"
                        defaultValue={selectedEvent.required_keyword || ''}
                        id="settings-required-keyword"
                        placeholder="e.g., clan event december 2024"
                        className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This phrase MUST appear in all screenshots to prove they're from this event. 
                        Leave empty to skip this verification.
                      </p>
                    </div>
                    
                    {/* Google Sheet Config */}
                    <div className="border-t border-yume-border pt-4 mt-4">
                      <h4 className="text-sm font-medium text-white mb-3">Google Sheet Sync</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Sheet ID</label>
                          <input
                            type="text"
                            defaultValue={selectedEvent.google_sheet_id || ''}
                            id="settings-sheet-id"
                            placeholder="1ABC..."
                            className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Tab Name</label>
                          <input
                            type="text"
                            defaultValue={selectedEvent.google_sheet_tab || ''}
                            id="settings-sheet-tab"
                            placeholder="Sheet1"
                            className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Discord Webhook */}
                    <div className="border-t border-yume-border pt-4 mt-4">
                      <h4 className="text-sm font-medium text-white mb-3">🔔 Discord Webhook</h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Send notifications to Discord when participants submit screenshots.
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Webhook URL</label>
                          <input
                            type="text"
                            defaultValue={selectedEvent.webhook_url || ''}
                            id="settings-webhook-url"
                            placeholder="https://discord.com/api/webhooks/..."
                            className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Get this from Discord: Server Settings → Integrations → Webhooks
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">
                            Custom Embed Template <span className="text-gray-500">(optional JSON)</span>
                          </label>
                          <textarea
                            defaultValue={selectedEvent.webhook_template || ''}
                            id="settings-webhook-template"
                            rows={6}
                            placeholder='Leave empty for default template, or customize with JSON...'
                            className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none font-mono text-xs resize-y"
                          />
                          
                          {/* Placeholder Cheat Sheet */}
                          <details className="mt-2">
                            <summary className="text-xs text-amber-400 cursor-pointer hover:text-amber-300">
                              📋 Available Placeholders (click to expand)
                            </summary>
                            <div className="mt-2 p-3 bg-yume-bg-light rounded-lg text-xs font-mono space-y-1">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-emerald-400">{'{rsn}'}</span>
                                  <span className="text-gray-500"> - RuneScape name</span>
                                </div>
                                <div>
                                  <span className="text-emerald-400">{'{rsn_or_username}'}</span>
                                  <span className="text-gray-500"> - RSN or Discord name</span>
                                </div>
                                <div>
                                  <span className="text-amber-400">{'{username}'}</span>
                                  <span className="text-gray-500"> - Discord username</span>
                                </div>
                                <div>
                                  <span className="text-amber-400">{'{user_id}'}</span>
                                  <span className="text-gray-500"> - Discord user ID</span>
                                </div>
                                <div>
                                  <span className="text-amber-400">{'{event_name}'}</span>
                                  <span className="text-gray-500"> - Event name</span>
                                </div>
                                <div>
                                  <span className="text-amber-400">{'{event_id}'}</span>
                                  <span className="text-gray-500"> - Event ID</span>
                                </div>
                                <div>
                                  <span className="text-amber-400">{'{tile_title}'}</span>
                                  <span className="text-gray-500"> - Tile name</span>
                                </div>
                                <div>
                                  <span className="text-amber-400">{'{tile_position}'}</span>
                                  <span className="text-gray-500"> - Tile number</span>
                                </div>
                                <div>
                                  <span className="text-amber-400">{'{status}'}</span>
                                  <span className="text-gray-500"> - ✅/⏳ status</span>
                                </div>
                                <div>
                                  <span className="text-amber-400">{'{status_raw}'}</span>
                                  <span className="text-gray-500"> - approved/pending</span>
                                </div>
                                <div>
                                  <span className="text-cyan-400">{'{ocr_status}'}</span>
                                  <span className="text-gray-500"> - Overall OCR status</span>
                                </div>
                                <div>
                                  <span className="text-cyan-400">{'{ocr_result}'}</span>
                                  <span className="text-gray-500"> - Both keyword checks</span>
                                </div>
                                <div>
                                  <span className="text-cyan-400">{'{event_keyword_status}'}</span>
                                  <span className="text-gray-500"> - Event keyword check</span>
                                </div>
                                <div>
                                  <span className="text-cyan-400">{'{tile_keyword_status}'}</span>
                                  <span className="text-gray-500"> - Tile keyword check</span>
                                </div>
                                <div>
                                  <span className="text-amber-400">{'{image_url}'}</span>
                                  <span className="text-gray-500"> - Screenshot URL</span>
                                </div>
                                <div>
                                  <span className="text-amber-400">{'{ocr_text}'}</span>
                                  <span className="text-gray-500"> - Detected text</span>
                                </div>
                                <div>
                                  <span className="text-amber-400">{'{timestamp}'}</span>
                                  <span className="text-gray-500"> - Human readable</span>
                                </div>
                                <div>
                                  <span className="text-amber-400">{'{iso_timestamp}'}</span>
                                  <span className="text-gray-500"> - ISO format</span>
                                </div>
                              </div>
                              <div className="border-t border-yume-border pt-2 mt-2">
                                <p className="text-gray-400 mb-1">Example template:</p>
                                <pre className="text-[10px] text-gray-300 whitespace-pre-wrap">{`{
  "embeds": [{
    "title": "📸 {rsn_or_username} completed {tile_title}!",
    "color": 16753920,
    "image": { "url": "{image_url}" },
    "footer": { "text": "{event_name}" }
  }]
}`}</pre>
                              </div>
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                    
                    {/* Save Button */}
                    <div className="pt-4">
                      <button
                        onClick={async () => {
                          const name = (document.getElementById('settings-name') as HTMLInputElement)?.value;
                          const description = (document.getElementById('settings-description') as HTMLTextAreaElement)?.value;
                          const requiredKeyword = (document.getElementById('settings-required-keyword') as HTMLInputElement)?.value;
                          const googleSheetId = (document.getElementById('settings-sheet-id') as HTMLInputElement)?.value;
                          const googleSheetTab = (document.getElementById('settings-sheet-tab') as HTMLInputElement)?.value;
                          const webhookUrl = (document.getElementById('settings-webhook-url') as HTMLInputElement)?.value;
                          const webhookTemplate = (document.getElementById('settings-webhook-template') as HTMLTextAreaElement)?.value;
                          
                          // Validate webhook template if provided
                          if (webhookTemplate?.trim()) {
                            try {
                              JSON.parse(webhookTemplate);
                            } catch (e) {
                              alert('Invalid JSON in webhook template. Please check your syntax.');
                              return;
                            }
                          }
                          
                          try {
                            const res = await fetch(`${API_BASE}/admin/tile-events/${selectedEvent.id}`, {
                              method: 'PUT',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                name,
                                description,
                                required_keyword: requiredKeyword,
                                google_sheet_id: googleSheetId,
                                google_sheet_tab: googleSheetTab,
                                webhook_url: webhookUrl,
                                webhook_template: webhookTemplate || null,
                                is_active: selectedEvent.is_active
                              })
                            });
                            
                            if (res.ok) {
                              fetchEvents();
                              fetchEventDetails(selectedEvent.id);
                              alert('Settings saved!');
                            } else {
                              const data = await res.json();
                              alert(`Error: ${data.error}`);
                            }
                          } catch (err) {
                            console.error('Failed to save settings:', err);
                            alert('Failed to save settings');
                          }
                        }}
                        className="w-full btn-primary"
                      >
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : showUsersView ? (
            /* ========== USERS VIEW ========== */
            <div className="space-y-4">
              <div className="bg-yume-card rounded-xl border border-yume-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      👥 Event Users
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                      Link Discord accounts to RuneScape names
                    </p>
                  </div>
                  <button
                    onClick={fetchEventUsers}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yume-accent/20 text-yume-accent hover:bg-yume-accent/30"
                  >
                    🔄 Refresh
                  </button>
                </div>
                
                {/* Search & Filter */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Search by name, RSN, or Discord ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchEventUsers()}
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-yume-bg border border-yume-border text-white text-sm focus:outline-none focus:border-yume-accent"
                  />
                  <select
                    value={userFilter}
                    onChange={(e) => { setUserFilter(e.target.value as 'all' | 'with_rsn' | 'without_rsn'); }}
                    className="px-3 py-2 rounded-lg bg-yume-bg border border-yume-border text-white text-sm focus:outline-none focus:border-yume-accent"
                  >
                    <option value="all">All Users</option>
                    <option value="with_rsn">With RSN</option>
                    <option value="without_rsn">Missing RSN</option>
                  </select>
                  <button
                    onClick={fetchEventUsers}
                    className="px-4 py-2 rounded-lg bg-yume-accent text-yume-bg font-medium text-sm hover:bg-yume-accent/90"
                  >
                    Search
                  </button>
                </div>
                
                {/* Users List */}
                {usersLoading ? (
                  <div className="text-center py-8 text-gray-400">Loading users...</div>
                ) : eventUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">👥</div>
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {eventUsers.map(eu => (
                      <div
                        key={eu.discord_id}
                        className="p-4 rounded-lg bg-yume-bg-light"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {eu.avatar ? (
                              <img
                                src={`https://cdn.discordapp.com/avatars/${eu.discord_id}/${eu.avatar}.png`}
                                alt={eu.username}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-lg">
                                👤
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-white">
                                {eu.global_name || eu.username}
                              </div>
                              <div className="text-xs text-gray-500">
                                {eu.rsn ? <span className="text-emerald-400">{eu.rsn}</span> : eu.username}
                                {eu.rsn && <span> • {eu.username}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {editingUser?.discord_id === eu.discord_id ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const form = e.target as HTMLFormElement;
                                  const rsn = (form.elements.namedItem('rsn') as HTMLInputElement).value;
                                  const notes = (form.elements.namedItem('notes') as HTMLInputElement).value;
                                  updateEventUser(eu.discord_id, rsn, notes);
                                }}
                                className="flex items-center gap-2"
                              >
                                <input
                                  name="rsn"
                                  defaultValue={eu.rsn || ''}
                                  placeholder="RSN"
                                  className="w-32 px-2 py-1 rounded bg-yume-bg border border-yume-border text-white text-sm"
                                />
                                <input
                                  name="notes"
                                  defaultValue={eu.notes || ''}
                                  placeholder="Notes"
                                  className="w-40 px-2 py-1 rounded bg-yume-bg border border-yume-border text-white text-sm"
                                />
                                <button type="submit" className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30">
                                  ✓
                                </button>
                                <button type="button" onClick={() => setEditingUser(null)} className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30">
                                  ✕
                                </button>
                              </form>
                            ) : (
                              <>
                                <div className="text-right">
                                  {eu.rsn ? (
                                    <div className="text-emerald-400 font-medium">{eu.rsn}</div>
                                  ) : (
                                    <div className="text-gray-500 italic text-sm">No RSN</div>
                                  )}
                                  {eu.notes && (
                                    <div className="text-xs text-gray-500 max-w-[200px] truncate" title={eu.notes}>
                                      {eu.notes}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => setEditingUser(eu)}
                                  className="px-3 py-1.5 rounded-lg text-sm bg-yume-accent/20 text-yume-accent hover:bg-yume-accent/30"
                                >
                                  Edit
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>First login: {new Date(eu.first_login_at).toLocaleDateString()}</span>
                          <span>Last login: {new Date(eu.last_login_at).toLocaleDateString()}</span>
                          <span>Logins: {eu.login_count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-4 text-xs text-gray-500">
                  {eventUsers.length} user{eventUsers.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yume-card rounded-xl border border-yume-border p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-white mb-2">Select an Event</h3>
              <p className="text-gray-400">
                Choose an event from the list to manage tiles and participants.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Submission Modal */}
      {reviewingSubmission && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-yume-card rounded-2xl border border-yume-border max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Reject Submission</h3>
            <p className="text-gray-400 mb-4">
              Rejecting submission from <span className="text-white">{reviewingSubmission.rsn || reviewingSubmission.global_name || reviewingSubmission.discord_username}</span> for tile #{reviewingSubmission.tile_position + 1}.
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Reason (optional)</label>
              <textarea
                id="rejectNotes"
                placeholder="e.g., Screenshot doesn't show the required item..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setReviewingSubmission(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-yume-border text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const notes = (document.getElementById('rejectNotes') as HTMLTextAreaElement)?.value;
                  reviewSubmission(reviewingSubmission.id, 'rejected', notes);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-yume-card rounded-2xl border border-yume-border max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Create New Event</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Event Name *</label>
                <input
                  type="text"
                  value={newEventName}
                  onChange={e => setNewEventName(e.target.value)}
                  placeholder="e.g., Summer Bingo 2024"
                  className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={newEventDesc}
                  onChange={e => setNewEventDesc(e.target.value)}
                  placeholder="Describe the event..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  🔐 Required Keyword <span className="text-gray-500">(event identifier)</span>
                </label>
                <input
                  type="text"
                  value={newEventRequiredKeyword}
                  onChange={e => setNewEventRequiredKeyword(e.target.value)}
                  placeholder="e.g., clan event december 2024"
                  className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This phrase MUST appear in all screenshots for auto-approval
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-yume-border text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createEvent}
                disabled={!newEventName.trim()}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tile Modal */}
      {showTileForm && editingTile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-yume-card rounded-2xl border border-yume-border max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingTile.position < tiles.length ? 'Edit Tile' : 'Add New Tile'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={editingTile.title}
                  onChange={e => setEditingTile({ ...editingTile, title: e.target.value })}
                  placeholder="e.g., Complete 10 Clue Scrolls"
                  className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={editingTile.description || ''}
                  onChange={e => setEditingTile({ ...editingTile, description: e.target.value })}
                  placeholder="Details about this task..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Image URL</label>
                <input
                  type="text"
                  value={editingTile.image_url || ''}
                  onChange={e => setEditingTile({ ...editingTile, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none"
                />
              </div>
              
              {/* Drop Keywords for this tile - Tag Editor */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  🎯 Drop Keywords 
                  <span className="text-gray-500 ml-2">
                    ({(editingTile.unlock_keywords || '').split(',').filter(k => k.trim()).length} keywords)
                  </span>
                </label>
                
                {/* Keyword Tags Display */}
                <div className="min-h-[80px] max-h-[200px] overflow-y-auto p-3 rounded-lg bg-yume-bg-light border border-yume-border mb-2">
                  {(editingTile.unlock_keywords || '').split(',').filter(k => k.trim()).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(editingTile.unlock_keywords || '').split(',').filter(k => k.trim()).map((keyword, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm group"
                        >
                          <span>{keyword.trim()}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const keywords = (editingTile.unlock_keywords || '').split(',').filter(k => k.trim());
                              keywords.splice(idx, 1);
                              setEditingTile({ ...editingTile, unlock_keywords: keywords.join(', ') });
                            }}
                            className="w-4 h-4 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 flex items-center justify-center text-xs opacity-60 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">No keywords added yet</div>
                  )}
                </div>
                
                {/* Add Keywords Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="keyword-input"
                    placeholder="Type keyword and press Enter (or paste comma-separated list)"
                    className="flex-1 px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.currentTarget;
                        const newKeywords = input.value.split(',').map(k => k.trim()).filter(k => k);
                        if (newKeywords.length > 0) {
                          const existing = (editingTile.unlock_keywords || '').split(',').map(k => k.trim()).filter(k => k);
                          const combined = [...new Set([...existing, ...newKeywords])]; // Dedupe
                          setEditingTile({ ...editingTile, unlock_keywords: combined.join(', ') });
                          input.value = '';
                        }
                      }
                    }}
                    onPaste={(e) => {
                      // Handle paste of comma-separated keywords
                      setTimeout(() => {
                        const input = e.currentTarget;
                        const newKeywords = input.value.split(',').map(k => k.trim()).filter(k => k);
                        if (newKeywords.length > 1) {
                          const existing = (editingTile.unlock_keywords || '').split(',').map(k => k.trim()).filter(k => k);
                          const combined = [...new Set([...existing, ...newKeywords])];
                          setEditingTile({ ...editingTile, unlock_keywords: combined.join(', ') });
                          input.value = '';
                        }
                      }, 0);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('keyword-input') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        const newKeywords = input.value.split(',').map(k => k.trim()).filter(k => k);
                        const existing = (editingTile.unlock_keywords || '').split(',').map(k => k.trim()).filter(k => k);
                        const combined = [...new Set([...existing, ...newKeywords])];
                        setEditingTile({ ...editingTile, unlock_keywords: combined.join(', ') });
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm"
                  >
                    Add
                  </button>
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    At least ONE keyword must appear in the screenshot
                  </p>
                  {(editingTile.unlock_keywords || '').split(',').filter(k => k.trim()).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditingTile({ ...editingTile, unlock_keywords: '' })}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
              
              {/* Required Submissions */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  📸 Required Submissions
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={editingTile.required_submissions || 1}
                  onChange={e => setEditingTile({ ...editingTile, required_submissions: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-24 px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of approved submissions needed before tile unlocks (default: 1)
                </p>
              </div>
              
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingTile(null);
                  setShowTileForm(false);
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-yume-border text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveTile}
                disabled={!editingTile.title.trim()}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Save Tile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet Config Modal */}
      {showSheetConfig && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-yume-card rounded-2xl border border-yume-border max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">📊 Google Sheet Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Spreadsheet ID *</label>
                <input
                  type="text"
                  value={sheetId}
                  onChange={e => setSheetId(e.target.value)}
                  placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Find this in the Google Sheet URL: docs.google.com/spreadsheets/d/<span className="text-yume-accent">[ID]</span>/edit
                </p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tab/Sheet Name *</label>
                <input
                  type="text"
                  value={sheetTab}
                  onChange={e => setSheetTab(e.target.value)}
                  placeholder="e.g., Tiles"
                  className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The name of the tab at the bottom of your spreadsheet
                </p>
              </div>
              
              <div className="bg-yume-bg-light rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-2">Expected Sheet Format</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[500px]">
                    <thead>
                      <tr className="text-gray-400">
                        <th className="text-left py-1 px-2 border-b border-yume-border">A: Title</th>
                        <th className="text-left py-1 px-2 border-b border-yume-border">B: Description</th>
                        <th className="text-left py-1 px-2 border-b border-yume-border">C: Image URL</th>
                        <th className="text-left py-1 px-2 border-b border-yume-border">D: 🤖 Keywords</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr>
                        <td className="py-1 px-2">Get a Drop</td>
                        <td className="py-1 px-2">Any rare drop</td>
                        <td className="py-1 px-2">https://...</td>
                        <td className="py-1 px-2 text-emerald-400">dragon, pet</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  🤖 Keywords column E: Comma-separated words for AI auto-approval
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSheetConfig(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-yume-border text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSheetConfig}
                disabled={!sheetId.trim() || !sheetTab.trim()}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tile Submissions Modal - View accepted images for a tile */}
      {viewingTileSubmissions && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-yume-card rounded-2xl border border-yume-border max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-yume-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {viewingTileSubmissions.tile.title}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Submissions by {viewingTileSubmissions.participant.rsn || viewingTileSubmissions.participant.global_name || viewingTileSubmissions.participant.discord_username}
                  </p>
                </div>
                <button
                  onClick={() => setViewingTileSubmissions(null)}
                  className="w-8 h-8 rounded-lg bg-yume-bg-light text-gray-400 hover:text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingTileSubmissions ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="animate-spin w-8 h-8 border-2 border-yume-accent border-t-transparent rounded-full mx-auto mb-2" />
                  Loading submissions...
                </div>
              ) : viewingTileSubmissions.submissions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">📭</div>
                  <p>No submissions for this tile yet.</p>
                  <p className="text-sm text-gray-500 mt-1">
                    This tile may have been skipped or unlocked manually.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {viewingTileSubmissions.submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className={`rounded-xl border p-4 ${
                        submission.status === 'approved' 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : submission.status === 'rejected'
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            submission.status === 'approved' 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : submission.status === 'rejected'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {submission.status.toUpperCase()}
                          </span>
                          {submission.ai_confidence && (
                            <span className="text-xs text-gray-500">
                              AI: {Math.round(submission.ai_confidence * 100)}%
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(submission.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Submission Image */}
                      {submission.image_url && (
                        <a
                          href={submission.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={submission.image_url}
                            alt="Submission"
                            className="w-full max-h-64 object-contain rounded-lg bg-black/30 hover:opacity-90 transition-opacity"
                          />
                        </a>
                      )}
                      
                      {/* Admin notes */}
                      {submission.admin_notes && (
                        <div className="mt-3 text-sm text-gray-400 bg-yume-bg-light/50 rounded-lg p-2">
                          <span className="text-gray-500">Admin notes:</span> {submission.admin_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

