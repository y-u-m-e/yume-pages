/**
 * =============================================================================
 * ADMIN PANEL - User & Permission Management
 * =============================================================================
 * 
 * Super-admin only dashboard for managing users and their granular permissions.
 * This is the central control panel for access management across the application.
 * 
 * Access Control:
 * - Only users with isAdmin=true can access this page
 * - Non-admins are redirected to home
 * 
 * Features:
 * - View all users in the D1 database
 * - Add new users by Discord ID
 * - Edit existing user permissions
 * - Toggle individual permissions with one click
 * - Remove users from the database
 * - View environment variable users (read-only reference)
 * - Application settings overview
 * - Activity logs (placeholder for future implementation)
 * 
 * Permission Types:
 * - is_admin: Full admin access (can access this panel)
 * - access_cruddy: Attendance tracking system
 * - access_docs: Documentation access
 * - access_devops: DevOps control panel
 * - access_events: Events admin panel (create/manage tile events)
 * - is_banned: Blocks all access
 * 
 * Database Table: admin_users
 * - discord_id (unique identifier)
 * - username, global_name, avatar (from Discord)
 * - Permission flags (is_admin, access_*, is_banned)
 * - notes, last_login, created_at, updated_at
 * 
 * @module Admin
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// API base URL - uses environment variable or production default
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Database user record from admin_users table
 * Contains all permission flags and metadata
 */
interface DBUser {
  id: number;                   // Auto-increment primary key
  discord_id: string;           // Discord user ID (17-20 digit string)
  username: string | null;      // Discord username (handle)
  global_name: string | null;   // Discord display name
  avatar: string | null;        // Discord avatar hash
  is_admin: number;             // 1 = admin, 0 = not admin
  access_cruddy: number;        // 1 = has access, 0 = no access
  access_docs: number;          // 1 = has access, 0 = no access
  access_devops: number;        // 1 = has access, 0 = no access
  access_events: number;        // 1 = has access (events admin), 0 = no access
  is_banned: number;            // 1 = banned, 0 = not banned
  notes: string | null;         // Admin notes about user
  last_login: string | null;    // Last login timestamp
  created_at: string;           // Record creation timestamp
  updated_at: string | null;    // Last update timestamp
}

/**
 * Available tabs in the admin panel
 */
type Tab = 'users' | 'settings' | 'logs';

/**
 * Admin Panel Component
 * 
 * Main admin interface with tabs for different management functions.
 * Handles user CRUD operations and permission management.
 */
export default function Admin() {
  // ==========================================================================
  // AUTH & NAVIGATION
  // ==========================================================================
  
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  
  // Tab and data state
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [dbUsers, setDbUsers] = useState<DBUser[]>([]);
  const [envUsers, setEnvUsers] = useState<{ cruddy: string[]; docs: string[] }>({ cruddy: [], docs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<DBUser | null>(null);
  
  // Form state for adding/editing users
  const [newDiscordId, setNewDiscordId] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newAccessCruddy, setNewAccessCruddy] = useState(true);
  const [newAccessDocs, setNewAccessDocs] = useState(false);
  const [newAccessDevops, setNewAccessDevops] = useState(false);
  const [newAccessEvents, setNewAccessEvents] = useState(false);
  const [newIsBanned, setNewIsBanned] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Activity logs state
  interface ActivityLog {
    id: number;
    discord_id: string;
    discord_username: string;
    global_name?: string;
    avatar?: string;
    action: string;
    details?: string;
    ip_address?: string;
    created_at: string;
  }
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [actionCounts, setActionCounts] = useState<{action: string; count: number}[]>([]);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  /**
   * Redirect non-admin users to home page
   * Runs when auth state changes
   */
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, authLoading, isAdmin, navigate]);

  /**
   * Fetch users when admin is authenticated
   */
  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin]);
  
  /**
   * Fetch activity logs when logs tab is selected
   */
  useEffect(() => {
    if (user && isAdmin && activeTab === 'logs') {
      fetchActivityLogs();
    }
  }, [user, isAdmin, activeTab]);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  /**
   * Fetch all users from the API
   * Gets both DB users and environment variable users
   */
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        credentials: 'include'  // Include auth cookie
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setDbUsers(data.users || []);
      setEnvUsers(data.env_users || { cruddy: [], docs: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Fetch activity logs from the API
   */
  const fetchActivityLogs = async (action?: string) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (action) params.set('action', action);
      
      const res = await fetch(`${API_BASE}/admin/activity-logs?${params}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setActivityLogs(data.logs || []);
      setActionCounts(data.action_counts || []);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // ==========================================================================
  // USER MANAGEMENT HANDLERS
  // ==========================================================================

  /**
   * Add a new user or update existing user
   * Uses POST endpoint which handles upsert logic
   */
  const handleAddUser = async () => {
    if (!newDiscordId.trim()) return;
    
    // Validate Discord ID format (17-20 digits)
    if (!/^\d{17,20}$/.test(newDiscordId.trim())) {
      alert('Invalid Discord ID. Must be 17-20 digits.');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_id: newDiscordId.trim(),
          username: newUsername.trim() || null,
          is_admin: newIsAdmin,
          access_cruddy: newAccessCruddy,
          access_docs: newAccessDocs,
          access_devops: newAccessDevops,
          access_events: newAccessEvents,
          is_banned: newIsBanned,
          notes: newNotes.trim() || null
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add user');
      }
      
      // Reset form after successful add
      resetForm();
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };
  
  /**
   * Populate form with existing user data for editing
   */
  const handleEditUser = (u: DBUser) => {
    setEditingUser(u);
    setNewDiscordId(u.discord_id);
    setNewUsername(u.username || '');
    setNewIsAdmin(u.is_admin === 1);
    setNewAccessCruddy(u.access_cruddy === 1);
    setNewAccessDocs(u.access_docs === 1);
    setNewAccessDevops(u.access_devops === 1);
    setNewAccessEvents(u.access_events === 1);
    setNewIsBanned(u.is_banned === 1);
    setNewNotes(u.notes || '');
  };
  
  /**
   * Cancel editing and reset form
   */
  const handleCancelEdit = () => {
    setEditingUser(null);
    resetForm();
  };

  /**
   * Reset all form fields to defaults
   */
  const resetForm = () => {
    setNewDiscordId('');
    setNewUsername('');
    setNewIsAdmin(false);
    setNewAccessCruddy(true);  // Default: grant cruddy access
    setNewAccessDocs(false);
    setNewAccessDevops(false);
    setNewAccessEvents(false);
    setNewIsBanned(false);
    setNewNotes('');
    setEditingUser(null);
  };

  /**
   * Remove a user from the database
   * Requires confirmation before deletion
   */
  const handleRemoveUser = async (discordId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/admin/users/${discordId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to remove user');
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  /**
   * Toggle a single permission for a user
   * Preserves all other permissions while flipping the target one
   */
  const handleTogglePermission = async (dbUser: DBUser, field: keyof DBUser) => {
    const currentValue = dbUser[field];
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_id: dbUser.discord_id,
          username: dbUser.username,
          global_name: dbUser.global_name,
          // Toggle the target field, keep others unchanged
          is_admin: field === 'is_admin' ? !currentValue : dbUser.is_admin,
          access_cruddy: field === 'access_cruddy' ? !currentValue : dbUser.access_cruddy,
          access_docs: field === 'access_docs' ? !currentValue : dbUser.access_docs,
          access_devops: field === 'access_devops' ? !currentValue : dbUser.access_devops,
          access_events: field === 'access_events' ? !currentValue : dbUser.access_events,
          is_banned: field === 'is_banned' ? !currentValue : dbUser.is_banned,
          notes: dbUser.notes
        })
      });
      
      if (!res.ok) throw new Error('Failed to update user');
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  // ==========================================================================
  // LOADING STATES
  // ==========================================================================

  // Show loading spinner while auth is checking
  if (authLoading || !user || !isAdmin) {
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
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
    { id: 'logs', label: 'Activity Logs', icon: '📜' },
  ];

  // ==========================================================================
  // STATISTICS CALCULATIONS
  // ==========================================================================

  const adminCount = dbUsers.filter(u => u.is_admin).length;
  const cruddyCount = dbUsers.filter(u => u.access_cruddy).length + envUsers.cruddy.length;
  const docsCount = dbUsers.filter(u => u.access_docs).length + envUsers.docs.length;
  const bannedCount = dbUsers.filter(u => u.is_banned).length;
  
  // Helper function for time ago display
  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString.replace(' ', 'T') + 'Z');
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          <span className="text-yume-accent">⚙</span> Admin Panel
        </h1>
        <p className="text-gray-400">Manage users, settings, and view activity logs</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Total Users</div>
          <div className="text-3xl font-bold text-yume-accent">{dbUsers.length}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Admins</div>
          <div className="text-3xl font-bold text-purple-400">{adminCount}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Cruddy</div>
          <div className="text-3xl font-bold text-white">{cruddyCount}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Docs</div>
          <div className="text-3xl font-bold text-white">{docsCount}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Banned</div>
          <div className="text-3xl font-bold text-red-400">{bannedCount}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
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

      {/* ========== USERS TAB ========== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Add/Edit User Form */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">
                {editingUser ? '✏️ Edit User' : '➕ Add New User'}
              </h3>
              {editingUser && (
                <button onClick={handleCancelEdit} className="text-sm text-gray-400 hover:text-white">
                  Cancel Edit
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Discord ID & Username */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Discord User ID *</label>
                  <input
                    type="text"
                    value={newDiscordId}
                    onChange={(e) => setNewDiscordId(e.target.value)}
                    placeholder="e.g., 166201366228762624"
                    className="input w-full font-mono"
                    disabled={!!editingUser}  // Can't change ID when editing
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Username (optional)</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g., itai_"
                    className="input w-full"
                  />
                </div>
              </div>
              
              {/* Permission Toggles */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Permissions</label>
                <div className="flex flex-wrap gap-4">
                  {/* Admin Permission */}
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    newIsAdmin ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-yume-bg-light border-yume-border text-gray-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newIsAdmin}
                      onChange={(e) => setNewIsAdmin(e.target.checked)}
                      className="w-4 h-4 rounded accent-purple-500"
                    />
                    <span className="text-sm">👑 Admin</span>
                  </label>
                  
                  {/* Cruddy Permission */}
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    newAccessCruddy ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-yume-bg-light border-yume-border text-gray-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newAccessCruddy}
                      onChange={(e) => setNewAccessCruddy(e.target.checked)}
                      className="w-4 h-4 rounded accent-green-500"
                    />
                    <span className="text-sm">◉ Cruddy</span>
                  </label>
                  
                  {/* Docs Permission */}
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    newAccessDocs ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-yume-bg-light border-yume-border text-gray-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newAccessDocs}
                      onChange={(e) => setNewAccessDocs(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-500"
                    />
                    <span className="text-sm">📄 Docs</span>
                  </label>
                  
                  {/* DevOps Permission */}
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    newAccessDevops ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'bg-yume-bg-light border-yume-border text-gray-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newAccessDevops}
                      onChange={(e) => setNewAccessDevops(e.target.checked)}
                      className="w-4 h-4 rounded accent-orange-500"
                    />
                    <span className="text-sm">🚀 DevOps</span>
                  </label>
                  
                  {/* Events Admin Permission */}
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    newAccessEvents ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-yume-bg-light border-yume-border text-gray-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newAccessEvents}
                      onChange={(e) => setNewAccessEvents(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                    <span className="text-sm">⚔️ Events Admin</span>
                  </label>
                  
                  {/* Banned Status */}
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    newIsBanned ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-yume-bg-light border-yume-border text-gray-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newIsBanned}
                      onChange={(e) => setNewIsBanned(e.target.checked)}
                      className="w-4 h-4 rounded accent-red-500"
                    />
                    <span className="text-sm">🚫 Banned</span>
                  </label>
                </div>
              </div>
              
              {/* Admin Notes */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g., Clan officer, Alt account of..."
                  className="input w-full"
                />
              </div>
              
              {/* Submit Button */}
              <div className="flex gap-2">
                <button 
                  onClick={handleAddUser} 
                  disabled={saving || !newDiscordId.trim()}
                  className="btn-primary flex-1 sm:flex-none"
                >
                  {saving ? 'Saving...' : editingUser ? 'Update User' : 'Add User'}
                </button>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-yume-card rounded-2xl border border-yume-border overflow-hidden">
            <div className="px-6 py-4 border-b border-yume-border flex items-center justify-between">
              <h3 className="font-semibold text-white">Database Users</h3>
              <button onClick={fetchUsers} className="text-sm text-yume-accent hover:underline">
                🔄 Refresh
              </button>
            </div>
            
            {loading ? (
              <div className="p-6 text-center text-gray-400">Loading...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-400">{error}</div>
            ) : dbUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No users in database. Add users above or they are managed via environment variables.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-yume-bg-light">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase" title="Admin">👑</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase" title="Cruddy">◉</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase" title="Docs">📄</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase" title="DevOps">🚀</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase" title="Events Admin">⚔️</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase" title="Banned">🚫</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Last Login</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yume-border">
                    {dbUsers.map((u) => (
                      <tr key={u.id} className={`hover:bg-yume-bg-light/50 ${u.is_banned ? 'opacity-50' : ''}`}>
                        {/* User Info Cell */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            {u.avatar ? (
                              <img
                                src={`https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png?size=32`}
                                alt=""
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white">
                                {(u.username || u.global_name || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="text-sm text-white font-medium">
                                {u.global_name || u.username || 'Unknown'}
                                {u.is_banned === 1 && <span className="ml-2 text-red-400 text-xs">BANNED</span>}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">{u.discord_id}</div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Permission Toggle Cells */}
                        <td className="px-2 py-3 text-center">
                          <button 
                            onClick={() => handleTogglePermission(u, 'is_admin')}
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-colors ${
                              u.is_admin ? 'bg-purple-500 text-white' : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                          >
                            {u.is_admin ? '✓' : ''}
                          </button>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button 
                            onClick={() => handleTogglePermission(u, 'access_cruddy')}
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-colors ${
                              u.access_cruddy ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                          >
                            {u.access_cruddy ? '✓' : ''}
                          </button>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button 
                            onClick={() => handleTogglePermission(u, 'access_docs')}
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-colors ${
                              u.access_docs ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                          >
                            {u.access_docs ? '✓' : ''}
                          </button>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button 
                            onClick={() => handleTogglePermission(u, 'access_devops')}
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-colors ${
                              u.access_devops ? 'bg-orange-500 text-white' : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                          >
                            {u.access_devops ? '✓' : ''}
                          </button>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button 
                            onClick={() => handleTogglePermission(u, 'access_events')}
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-colors ${
                              u.access_events ? 'bg-amber-500 text-white' : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                          >
                            {u.access_events ? '✓' : ''}
                          </button>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button 
                            onClick={() => handleTogglePermission(u, 'is_banned')}
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-colors ${
                              u.is_banned ? 'bg-red-500 text-white' : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                          >
                            {u.is_banned ? '✓' : ''}
                          </button>
                        </td>
                        
                        {/* Last Login */}
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {u.last_login 
                            ? new Date(u.last_login.replace(' ', 'T') + 'Z').toLocaleDateString() 
                            : 'Never'}
                        </td>
                        
                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditUser(u)}
                              className="text-gray-400 hover:text-white text-sm"
                              title="Edit user details"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleRemoveUser(u.discord_id)}
                              className="text-red-400 hover:text-red-300 text-sm"
                              title="Remove user"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Environment Variable Users (Read-only) */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h3 className="font-semibold text-white mb-4">Environment Variable Users (Read-only)</h3>
            <p className="text-sm text-gray-400 mb-4">
              These users are configured in the Worker's environment variables. To modify, update <code className="text-yume-accent">wrangler.jsonc</code>.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-2">ALLOWED_USER_IDS_CRUDDY</div>
                <div className="text-sm font-mono text-gray-300 bg-yume-bg-light p-3 rounded-lg break-all">
                  {envUsers.cruddy.length > 0 ? envUsers.cruddy.join(', ') : '(empty)'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-2">ALLOWED_USER_IDS_DOCS</div>
                <div className="text-sm font-mono text-gray-300 bg-yume-bg-light p-3 rounded-lg break-all">
                  {envUsers.docs.length > 0 ? envUsers.docs.join(', ') : '(empty)'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== SETTINGS TAB ========== */}
      {activeTab === 'settings' && (
        <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
          <h3 className="font-semibold text-white mb-4">Application Settings</h3>
          
          <div className="space-y-4">
            {/* API Base URL */}
            <div className="flex items-center justify-between p-4 bg-yume-bg-light rounded-xl">
              <div>
                <div className="text-white font-medium">API Base URL</div>
                <div className="text-sm text-gray-500">https://api.emuy.gg</div>
              </div>
              <span className="badge-success">Active</span>
            </div>
            
            {/* Discord OAuth */}
            <div className="flex items-center justify-between p-4 bg-yume-bg-light rounded-xl">
              <div>
                <div className="text-white font-medium">Discord OAuth</div>
                <div className="text-sm text-gray-500">Client ID: 1446582844553035918</div>
              </div>
              <span className="badge-success">Connected</span>
            </div>
            
            {/* D1 Database */}
            <div className="flex items-center justify-between p-4 bg-yume-bg-light rounded-xl">
              <div>
                <div className="text-white font-medium">D1 Database</div>
                <div className="text-sm text-gray-500">event_tracking</div>
              </div>
              <span className="badge-success">Connected</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mt-6">
            Note: To modify these settings, update the Worker environment variables in Cloudflare Dashboard.
          </p>
        </div>
      )}

      {/* ========== LOGS TAB ========== */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Action Filter */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-gray-400">Filter by action:</span>
              <button
                onClick={() => { setActionFilter(''); fetchActivityLogs(); }}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  !actionFilter ? 'bg-yume-accent text-black' : 'bg-yume-bg-light text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
              {actionCounts.map(({ action, count }) => (
                <button
                  key={action}
                  onClick={() => { setActionFilter(action); fetchActivityLogs(action); }}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    actionFilter === action ? 'bg-yume-accent text-black' : 'bg-yume-bg-light text-gray-400 hover:text-white'
                  }`}
                >
                  {action.replace('_', ' ')} ({count})
                </button>
              ))}
              <button
                onClick={() => fetchActivityLogs(actionFilter || undefined)}
                className="ml-auto text-sm text-yume-accent hover:underline"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
          
          {/* Activity Logs List */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h3 className="font-semibold text-white mb-4">Recent Activity</h3>
            
            {logsLoading ? (
              <div className="text-center text-gray-400 py-8">Loading...</div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No activity logs yet. Logs are recorded when users login or submit screenshots.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {activityLogs.map((log) => {
                  const actionIcons: Record<string, { icon: string; bgColor: string; textColor: string }> = {
                    'user_login': { icon: '🔑', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
                    'tile_submission': { icon: '📸', bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400' },
                    'admin_action': { icon: '⚙️', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' },
                  };
                  const style = actionIcons[log.action] || { icon: '📝', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400' };
                  const details = log.details ? JSON.parse(log.details) : null;
                  const timeAgo = getTimeAgo(log.created_at);
                  
                  return (
                    <div key={log.id} className="flex items-start gap-4 p-3 bg-yume-bg-light rounded-xl">
                      {/* Avatar or Icon */}
                      {log.avatar ? (
                        <img
                          src={`https://cdn.discordapp.com/avatars/${log.discord_id}/${log.avatar}.png?size=32`}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${style.bgColor} ${style.textColor}`}>
                          {style.icon}
                        </span>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {log.global_name || log.discord_username || 'Unknown'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${style.bgColor} ${style.textColor}`}>
                            {log.action.replace('_', ' ')}
                          </span>
                        </div>
                        
                        {/* Action-specific details */}
                        {log.action === 'tile_submission' && details && (
                          <div className="text-xs text-gray-500 mt-1">
                            Tile: {details.tile_title} • {details.status === 'approved' ? '✅ Auto-approved' : '⏳ Pending'}
                          </div>
                        )}
                        {log.action === 'user_login' && details?.source && (
                          <div className="text-xs text-gray-500 mt-1">
                            Source: {details.source}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-600 mt-1 font-mono">
                          {log.discord_id}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-400 whitespace-nowrap">
                        {timeAgo}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
