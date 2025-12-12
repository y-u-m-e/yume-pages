import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

interface TileEvent {
  id: number;
  name: string;
  description?: string;
  is_active: number;
  google_sheet_id?: string;
  google_sheet_tab?: string;
  tile_count: number;
  participant_count: number;
  created_at: string;
}

interface Tile {
  id?: number;
  position: number;
  title: string;
  description?: string;
  image_url?: string;
  reward?: string;
  is_start?: number;
  is_end?: number;
}

interface Participant {
  id: number;
  discord_id: string;
  discord_username: string;
  username?: string;
  global_name?: string;
  avatar?: string;
  current_tile: number;
  tiles_unlocked: number[];
  completed_at?: string;
  updated_at: string;
}

export default function TileEventAdmin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [events, setEvents] = useState<TileEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TileEvent | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tiles' | 'participants'>('tiles');
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [editingTile, setEditingTile] = useState<Tile | null>(null);
  const [showTileForm, setShowTileForm] = useState(false);

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
      const [eventRes, participantsRes] = await Promise.all([
        fetch(`${API_BASE}/tile-events/${eventId}`, { credentials: 'include' }),
        fetch(`${API_BASE}/admin/tile-events/${eventId}/participants`, { credentials: 'include' })
      ]);
      
      if (eventRes.ok) {
        const data = await eventRes.json();
        setSelectedEvent(data.event);
        setTiles(data.tiles || []);
      }
      
      if (participantsRes.ok) {
        const data = await participantsRes.json();
        setParticipants(data.participants || []);
      }
    } catch (err) {
      console.error('Failed to fetch event details:', err);
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
      reward: ''
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
                </div>
              </div>

              {/* Tiles Tab */}
              {activeTab === 'tiles' && (
                <div className="bg-yume-card rounded-xl border border-yume-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Tile Path</h3>
                    <div className="flex gap-2">
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
                  
                  {tiles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">🎯</div>
                      <p>No tiles yet. Add your first tile to get started!</p>
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
                            {tile.reward && (
                              <div className="text-xs text-gray-500 truncate">Reward: {tile.reward}</div>
                            )}
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
                            <button
                              onClick={() => resetUserProgress(participant)}
                              className="text-xs text-red-400 hover:underline"
                            >
                              Reset
                            </button>
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
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Reward</label>
                <input
                  type="text"
                  value={editingTile.reward || ''}
                  onChange={e => setEditingTile({ ...editingTile, reward: e.target.value })}
                  placeholder="e.g., 5M GP Prize"
                  className="w-full px-4 py-2 rounded-lg bg-yume-bg-light border border-yume-border text-white placeholder:text-gray-500 focus:border-yume-accent outline-none"
                />
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
    </div>
  );
}

