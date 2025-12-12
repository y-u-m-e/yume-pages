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
}

/**
 * Participant progress data
 * Includes Discord user info from admin_users table
 */
interface Participant {
  id: number;                   // Progress record ID
  discord_id: string;           // Discord user ID
  discord_username: string;     // Discord username
  username?: string;            // From admin_users table
  global_name?: string;         // Discord display name
  avatar?: string;              // Discord avatar hash
  current_tile: number;         // Highest tile position
  tiles_unlocked: number[];     // Array of completed tile positions
  completed_at?: string;        // ISO timestamp if finished
  updated_at: string;           // Last activity timestamp
}

/**
 * Tile Event Admin Page Component
 * 
 * Full admin dashboard for tile event management.
 * Redirects non-admins to home page.
 */
export default function TileEventAdmin() {
  const { isAdmin } = useAuth();
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
  const [activeTab, setActiveTab] = useState<'tiles' | 'participants' | 'submissions'>('tiles');
  
  // Submissions state
  interface Submission {
    id: number;
    tile_id: number;
    discord_id: string;
    discord_username: string;
    global_name?: string;
    avatar?: string;
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
  
  // Tile editing
  const [editingTile, setEditingTile] = useState<Tile | null>(null);
  const [showTileForm, setShowTileForm] = useState(false);
  
  // Sheet sync states
  const [sheetId, setSheetId] = useState('');
  const [sheetTab, setSheetTab] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showSheetConfig, setShowSheetConfig] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchEvents();
  }, [isAdmin, navigate]);

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
          description: newEventDesc
        })
      });
      
      if (res.ok) {
        setNewEventName('');
        setNewEventDesc('');
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
    if (!selectedEvent) return;
    
    try {
      const res = await fetch(`${API_BASE}/admin/tile-events/${selectedEvent.id}/tiles/bulk`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiles })
      });
      
      if (res.ok) {
        fetchEventDetails(selectedEvent.id);
        fetchEvents();
      }
    } catch (err) {
      console.error('Failed to save tiles:', err);
    }
  };

  const addTile = () => {
    const newTile: Tile = {
      position: tiles.length,
      title: '',
      description: '',
      image_url: '',
      unlock_keywords: ''
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

  const resetUserProgress = async (participant: Participant) => {
    if (!selectedEvent || !confirm(`Reset progress for ${participant.global_name || participant.discord_username}?`)) return;
    
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
    if (!selectedEvent || !confirm(`Remove ${participant.global_name || participant.discord_username} from this event? Their progress will be deleted.`)) return;
    
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

  if (!isAdmin) {
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
                  onClick={() => fetchEventDetails(event.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedEvent?.id === event.id
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
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      >
                        Save All
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
                                  {participant.global_name || participant.username || participant.discord_username}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {participant.tiles_unlocked.length}/{tiles.length} tiles
                                  {participant.completed_at && (
                                    <span className="text-emerald-400 ml-2">✓ Completed</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
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
                          
                          {/* Tile progress grid */}
                          <div className="flex flex-wrap gap-1">
                            {tiles.map((tile, index) => {
                              const isUnlocked = participant.tiles_unlocked.includes(index);
                              const isNext = !isUnlocked && (index === 0 || participant.tiles_unlocked.includes(index - 1));
                              
                              return (
                                <button
                                  key={index}
                                  onClick={() => !isUnlocked && unlockTile(participant, index)}
                                  disabled={isUnlocked}
                                  className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                                    isUnlocked
                                      ? 'bg-emerald-500 text-white'
                                      : isNext
                                      ? 'bg-yume-accent/20 text-yume-accent hover:bg-yume-accent hover:text-yume-bg cursor-pointer'
                                      : 'bg-gray-700 text-gray-500'
                                  }`}
                                  title={`${tile.title} - ${isUnlocked ? 'Completed' : isNext ? 'Click to unlock' : 'Locked'}`}
                                >
                                  {isUnlocked ? '✓' : index + 1}
                                </button>
                              );
                            })}
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
                                  {submission.global_name || submission.discord_username}
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
              Rejecting submission from <span className="text-white">{reviewingSubmission.global_name || reviewingSubmission.discord_username}</span> for tile #{reviewingSubmission.tile_position + 1}.
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
              
              {/* AI Auto-Approval Keywords */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  🤖 OCR Keywords <span className="text-gray-500">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={editingTile.unlock_keywords || ''}
                  onChange={e => setEditingTile({ ...editingTile, unlock_keywords: e.target.value })}
                  placeholder="exact:You have a funny feeling, dragon warhammer"
                  className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Keywords matched as whole words. Use <code className="text-yellow-400">exact:</code> for phrases, <code className="text-yellow-400">all:</code> to require ALL matches
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
                        <th className="text-left py-1 px-2 border-b border-yume-border">D: Reward</th>
                        <th className="text-left py-1 px-2 border-b border-yume-border">E: 🤖 Keywords</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr>
                        <td className="py-1 px-2">Get a Drop</td>
                        <td className="py-1 px-2">Any rare drop</td>
                        <td className="py-1 px-2">https://...</td>
                        <td className="py-1 px-2">5M GP</td>
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
    </div>
  );
}

