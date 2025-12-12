/**
 * =============================================================================
 * CRUDDY PANEL - Clan Event Attendance Tracker
 * =============================================================================
 * 
 * The main attendance tracking system for OSRS clan events.
 * "Cruddy" stands for Create, Read, Update, Delete + Dashboard - CRUD + D!
 * 
 * Access Control:
 * - Requires authentication (redirect to home if not logged in)
 * - Requires 'cruddy' permission from admin_users table
 * 
 * Features:
 * - RECORDS TAB: View all attendance records with filtering
 *   - Search by player name
 *   - Filter by event type
 *   - Date range filtering
 *   - Pagination support
 * 
 * - EVENTS TAB: Group records by event+date
 *   - Expandable event groups
 *   - Copy ingots command for Discord bot
 *   - Delete entire event groups
 * 
 * - LEADERBOARD TAB: Player rankings
 *   - Configurable top N (5, 10, 25, 50)
 *   - Date range filtering
 *   - Visual progress bars
 *   - Statistics summary
 * 
 * - ADD RECORD TAB: Single record entry
 *   - Player name, event, date fields
 * 
 * - ADD EVENT TAB: Bulk record entry
 *   - Event name and date
 *   - Multiple players (newline or comma separated)
 *   - Real-time player count preview
 * 
 * Database Table: attendance_records
 * - id, name (player RSN), event, date
 * 
 * @module CruddyPanel
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { records, AttendanceRecord, LeaderboardEntry } from '@/lib/api';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Available tabs in the Cruddy Panel
 */
type Tab = 'records' | 'events' | 'leaderboard' | 'add' | 'add-event';

/**
 * Grouped event data for the Events tab
 * Multiple attendance records grouped by event+date
 */
interface EventGroup {
  event: string;                              // Event name
  date: string;                               // Date (YYYY-MM-DD)
  attendees: { id: number; name: string }[];  // Players who attended
}

/**
 * Cruddy Panel Component
 * 
 * Main attendance tracking interface with multiple tabs for
 * different views and operations.
 */
export default function CruddyPanel() {
  // ==========================================================================
  // AUTH & NAVIGATION
  // ==========================================================================
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  
  // Tab and data state
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [recordsData, setRecordsData] = useState<AttendanceRecord[]>([]);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  // Filter state (shared across tabs)
  const [filterName, setFilterName] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [leaderTop, setLeaderTop] = useState(10);
  
  // Add single record form state
  const [addName, setAddName] = useState('');
  const [addEvent, setAddEvent] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Add bulk event form state
  const [bulkEventName, setBulkEventName] = useState('');
  const [bulkEventDate, setBulkEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkPlayers, setBulkPlayers] = useState('');
  
  // Edit modal state
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editEvent, setEditEvent] = useState('');
  const [editDate, setEditDate] = useState('');
  
  // Expanded event groups (for Events tab)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Form submission state
  const [submitting, setSubmitting] = useState(false);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  /**
   * Redirect unauthenticated users to home
   */
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // ==========================================================================
  // DATA FETCHING CALLBACKS
  // ==========================================================================

  /**
   * Load individual records with filters
   * Used by the Records tab
   */
  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await records.getAll({
      limit: 50,
      name: filterName || undefined,
      event: filterEvent || undefined,
      start: filterStart || undefined,
      end: filterEnd || undefined,
    });
    
    if (result.success && result.data) {
      setRecordsData(result.data.results || []);
      setTotal(result.data.total || 0);
    } else {
      setError(result.error || 'Failed to load records');
    }
    
    setLoading(false);
  }, [filterName, filterEvent, filterStart, filterEnd]);

  /**
   * Load records grouped by event+date
   * Used by the Events tab
   */
  const loadEventGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Fetch a large batch to group locally
    const result = await records.getAll({
      limit: 5000,
      event: filterEvent || undefined,
      start: filterStart || undefined,
      end: filterEnd || undefined,
    });
    
    if (result.success && result.data) {
      // Group records by event+date combination
      const groups: Record<string, EventGroup> = {};
      for (const record of result.data.results || []) {
        const key = `${record.event}|||${record.date}`;
        if (!groups[key]) {
          groups[key] = { event: record.event, date: record.date, attendees: [] };
        }
        groups[key].attendees.push({ id: record.id, name: record.name });
      }
      // Sort by date descending (most recent first)
      const sorted = Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
      setEventGroups(sorted);
    } else {
      setError(result.error || 'Failed to load events');
    }
    
    setLoading(false);
  }, [filterEvent, filterStart, filterEnd]);

  /**
   * Load leaderboard rankings
   * Used by the Leaderboard tab
   */
  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await records.getLeaderboard({
      top: leaderTop,
      start: filterStart || undefined,
      end: filterEnd || undefined,
    });
    
    if (result.success && result.data) {
      setLeaderboardData(Array.isArray(result.data) ? result.data : []);
    } else {
      setError(result.error || 'Failed to load leaderboard');
    }
    
    setLoading(false);
  }, [leaderTop, filterStart, filterEnd]);

  /**
   * Fetch data when tab changes or user authenticates
   */
  useEffect(() => {
    if (!user) return;
    
    if (activeTab === 'records') loadRecords();
    else if (activeTab === 'events') loadEventGroups();
    else if (activeTab === 'leaderboard') loadLeaderboard();
  }, [activeTab, user, loadRecords, loadEventGroups, loadLeaderboard]);

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  /**
   * Show success message temporarily
   */
  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  // ==========================================================================
  // CRUD HANDLERS
  // ==========================================================================

  /**
   * Add a single attendance record
   */
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addEvent || !addDate) {
      setError('All fields are required');
      return;
    }
    
    setSubmitting(true);
    const result = await records.add({ name: addName, event: addEvent, date: addDate });
    
    if (result.success) {
      setAddName('');
      showSuccess('Record added successfully!');
      setActiveTab('records');
      loadRecords();
    } else {
      setError(result.error || 'Failed to add record');
    }
    setSubmitting(false);
  };

  /**
   * Add multiple attendance records for a single event
   * Parses newline or comma-separated player names
   */
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkEventName || !bulkEventDate || !bulkPlayers.trim()) {
      setError('All fields are required');
      return;
    }
    
    // Parse player names from input (supports newlines and commas)
    const players = bulkPlayers
      .split(/[\n,]+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    if (players.length === 0) {
      setError('Please enter at least one player');
      return;
    }
    
    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    
    // Add each player as a separate record
    for (const player of players) {
      const result = await records.add({ name: player, event: bulkEventName, date: bulkEventDate });
      if (result.success) successCount++;
      else failCount++;
    }
    
    if (failCount === 0) {
      showSuccess(`Added ${successCount} records!`);
      setBulkEventName('');
      setBulkPlayers('');
      setActiveTab('events');
      loadEventGroups();
    } else {
      setError(`Added ${successCount}, failed ${failCount}`);
    }
    setSubmitting(false);
  };

  /**
   * Update an existing record
   */
  const handleEditRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord || !editName || !editEvent || !editDate) return;
    
    setSubmitting(true);
    const result = await records.update(editRecord.id, { name: editName, event: editEvent, date: editDate });
    
    if (result.success) {
      setEditRecord(null);
      showSuccess('Record updated!');
      if (activeTab === 'records') loadRecords();
      else if (activeTab === 'events') loadEventGroups();
    } else {
      setError(result.error || 'Failed to update');
    }
    setSubmitting(false);
  };

  /**
   * Delete a single record with confirmation
   */
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete record for "${name}"?`)) return;
    
    const result = await records.delete(id);
    if (result.success) {
      showSuccess('Deleted!');
      if (activeTab === 'records') loadRecords();
      else if (activeTab === 'events') loadEventGroups();
    } else {
      setError(result.error || 'Failed to delete');
    }
  };

  /**
   * Delete all records for an event group
   */
  const handleDeleteEventGroup = async (group: EventGroup) => {
    if (!confirm(`Delete all ${group.attendees.length} records for "${group.event}" on ${group.date}?`)) return;
    
    setSubmitting(true);
    for (const attendee of group.attendees) {
      await records.delete(attendee.id);
    }
    showSuccess(`Deleted ${group.attendees.length} records`);
    loadEventGroups();
    setSubmitting(false);
  };

  /**
   * Copy Discord ingots command for event group
   * Format: /add_remove_ingots players:name1, name2 ingots:10,000 reason:clan event - EventName
   */
  const copyIngots = async (group: EventGroup) => {
    const players = group.attendees.map(a => a.name).join(', ');
    const cmd = `/add_remove_ingots players:${players} ingots: 10,000 reason: clan event - ${group.event}`;
    await navigator.clipboard.writeText(cmd);
    showSuccess('Ingots command copied!');
  };

  /**
   * Open edit modal with record data
   */
  const openEditModal = (record: AttendanceRecord | { id: number; name: string; event: string; date: string }) => {
    setEditRecord(record as AttendanceRecord);
    setEditName(record.name);
    setEditEvent(record.event);
    setEditDate(record.date);
  };

  /**
   * Toggle event group expansion
   */
  const toggleGroup = (key: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setExpandedGroups(newSet);
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setFilterName('');
    setFilterEvent('');
    setFilterStart('');
    setFilterEnd('');
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-yume-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ==========================================================================
  // TAB CONFIGURATION
  // ==========================================================================

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'records', label: 'Records', icon: '📋' },
    { id: 'events', label: 'Events', icon: '📅' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { id: 'add', label: 'Add Record', icon: '➕' },
    { id: 'add-event', label: 'Add Event', icon: '📝' },
  ];

  // Parse bulk player input for preview count
  const parsedPlayers = bulkPlayers.split(/[\n,]+/).map(p => p.trim()).filter(p => p.length > 0);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          <span className="text-yume-accent">◉</span> Cruddy Panel
        </h1>
        <p className="text-gray-400">Track clan event attendance • {total} total records</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-yume-accent text-yume-bg'
                : 'bg-yume-card text-gray-400 hover:text-white border border-yume-border hover:border-yume-border-accent'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="hover:text-red-200">×</button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400">
          {success}
        </div>
      )}

      {/* Filters (for records, events, leaderboard tabs) */}
      {['records', 'events', 'leaderboard'].includes(activeTab) && (
        <div className="bg-yume-card rounded-2xl border border-yume-border p-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Name filter (records only) */}
            {activeTab === 'records' && (
              <input
                type="text"
                placeholder="Filter by name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="input"
              />
            )}
            {/* Event filter (records & events) */}
            {['records', 'events'].includes(activeTab) && (
              <input
                type="text"
                placeholder="Filter by event..."
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="input"
              />
            )}
            {/* Top N selector (leaderboard only) */}
            {activeTab === 'leaderboard' && (
              <select
                value={leaderTop}
                onChange={(e) => setLeaderTop(Number(e.target.value))}
                className="input"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
              </select>
            )}
            {/* Date range filters */}
            <input
              type="date"
              placeholder="Start date"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              className="input"
            />
            <input
              type="date"
              placeholder="End date"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              className="input"
            />
            {/* Search & Clear buttons */}
            <div className="flex gap-2">
              <button onClick={() => {
                if (activeTab === 'records') loadRecords();
                else if (activeTab === 'events') loadEventGroups();
                else loadLeaderboard();
              }} className="btn-primary flex-1">Search</button>
              <button onClick={clearFilters} className="btn-secondary">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-yume-card rounded-2xl border border-yume-border overflow-hidden">
        {loading ? (
          /* Loading Spinner */
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-yume-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'records' ? (
          /* ========== RECORDS TABLE ========== */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-yume-bg-light border-b border-yume-border">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">ID</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Player</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Event</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Date</th>
                  <th className="text-right text-sm font-medium text-gray-400 px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yume-border">
                {recordsData.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No records found</td></tr>
                ) : recordsData.map((r) => (
                  <tr key={r.id} className="hover:bg-yume-bg-light/50">
                    <td className="px-6 py-4 text-gray-500">{r.id}</td>
                    <td className="px-6 py-4 text-white font-medium">{r.name}</td>
                    <td className="px-6 py-4 text-gray-300">{r.event}</td>
                    <td className="px-6 py-4 text-gray-400">{r.date}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openEditModal(r)} className="text-yume-accent hover:underline text-sm">Edit</button>
                      <button onClick={() => handleDelete(r.id, r.name)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'events' ? (
          /* ========== EVENTS GROUPED VIEW ========== */
          <div className="p-4 space-y-3">
            {eventGroups.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No events found</div>
            ) : eventGroups.map((group) => {
              const key = `${group.event}|||${group.date}`;
              const isExpanded = expandedGroups.has(key);
              return (
                <div key={key} className="bg-yume-bg-light rounded-xl border border-yume-border overflow-hidden">
                  {/* Event Header (clickable to expand) */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-yume-card"
                    onClick={() => toggleGroup(key)}
                  >
                    <div>
                      <div className="text-white font-semibold">{group.event}</div>
                      <div className="text-sm text-gray-500">{group.date}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="badge-accent">{group.attendees.length} players</span>
                      <button onClick={(e) => { e.stopPropagation(); copyIngots(group); }} className="text-sm text-blue-400 hover:underline">📋 Copy</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteEventGroup(group); }} className="text-sm text-red-400 hover:underline">🗑</button>
                      <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </div>
                  {/* Expanded attendee list */}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-yume-border">
                      <div className="flex flex-wrap gap-2">
                        {group.attendees.map((a) => (
                          <div key={a.id} className="flex items-center gap-2 bg-yume-card px-3 py-2 rounded-lg border border-yume-border">
                            <span className="text-white text-sm">{a.name}</span>
                            <button onClick={() => openEditModal({ ...a, event: group.event, date: group.date })} className="text-xs text-yume-accent">✎</button>
                            <button onClick={() => handleDelete(a.id, a.name)} className="text-xs text-red-400">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : activeTab === 'leaderboard' ? (
          /* ========== LEADERBOARD ========== */
          <div className="p-6 space-y-3">
            {leaderboardData.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No data</div>
            ) : (
              <>
                {/* Leaderboard entries */}
                {leaderboardData.map((entry, i) => {
                  const maxCount = leaderboardData[0]?.count || 1;
                  return (
                    <div key={entry.name} className={`flex items-center gap-4 p-4 rounded-xl ${
                      i === 0 ? 'bg-yume-accent/20 border border-yume-accent/30' :
                      i === 1 ? 'bg-gray-400/10 border border-gray-400/20' :
                      i === 2 ? 'bg-amber-600/10 border border-amber-600/20' :
                      'bg-yume-bg-light'
                    }`}>
                      {/* Rank badge */}
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        i === 0 ? 'bg-yume-accent text-yume-bg' :
                        i === 1 ? 'bg-gray-400 text-gray-900' :
                        i === 2 ? 'bg-amber-600 text-white' :
                        'bg-yume-card text-gray-400'
                      }`}>{i + 1}</span>
                      {/* Player name */}
                      <span className="font-medium text-white flex-1">{entry.name}</span>
                      {/* Progress bar */}
                      <div className="w-32 h-2 bg-yume-bg rounded-full overflow-hidden">
                        <div className="h-full bg-yume-accent" style={{ width: `${(entry.count / maxCount) * 100}%` }} />
                      </div>
                      {/* Count */}
                      <span className="text-yume-accent font-semibold">{entry.count}</span>
                    </div>
                  );
                })}
                {/* Statistics summary */}
                <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-yume-bg-light rounded-xl">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yume-accent">{leaderboardData.reduce((s, e) => s + e.count, 0)}</div>
                    <div className="text-xs text-gray-500">Total Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{leaderboardData.length}</div>
                    <div className="text-xs text-gray-500">Participants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {(leaderboardData.reduce((s, e) => s + e.count, 0) / leaderboardData.length || 0).toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">Avg/Person</div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : activeTab === 'add' ? (
          /* ========== ADD SINGLE RECORD FORM ========== */
          <form onSubmit={handleAddRecord} className="p-6 max-w-md space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Player Name</label>
              <input type="text" value={addName} onChange={(e) => setAddName(e.target.value)} className="input" placeholder="e.g. y u m e" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Event Name</label>
              <input type="text" value={addEvent} onChange={(e) => setAddEvent(e.target.value)} className="input" placeholder="e.g. Wildy Wednesday" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="input" required />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Adding...' : 'Add Record'}
            </button>
          </form>
        ) : (
          /* ========== ADD BULK EVENT FORM ========== */
          <form onSubmit={handleAddEvent} className="p-6 max-w-lg space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Event Name</label>
              <input type="text" value={bulkEventName} onChange={(e) => setBulkEventName(e.target.value)} className="input" placeholder="e.g. Wildy Wednesday" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input type="date" value={bulkEventDate} onChange={(e) => setBulkEventDate(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Attendees <span className="text-gray-600">(one per line or comma-separated)</span></label>
              <textarea
                value={bulkPlayers}
                onChange={(e) => setBulkPlayers(e.target.value)}
                className="input min-h-[150px]"
                placeholder="Player1&#10;Player2&#10;Player3"
              />
            </div>
            {/* Preview count */}
            {parsedPlayers.length > 0 && (
              <div className="text-sm text-gray-500">📝 {parsedPlayers.length} attendee{parsedPlayers.length !== 1 ? 's' : ''} will be added</div>
            )}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Adding...' : 'Add Event'}
            </button>
          </form>
        )}
      </div>

      {/* ========== EDIT RECORD MODAL ========== */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setEditRecord(null)}>
          <form onSubmit={handleEditRecord} onClick={(e) => e.stopPropagation()} className="bg-yume-card rounded-2xl border border-yume-border p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-white">Edit Record #{editRecord.id}</h3>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Player Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Event</label>
              <input type="text" value={editEvent} onChange={(e) => setEditEvent(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="input" required />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditRecord(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
