/**
 * =============================================================================
 * ADMIN PANEL - User & Permission Management (RBAC)
 * =============================================================================
 * 
 * Super-admin only dashboard for managing users and RBAC permissions.
 * This is the central control panel for access management across the application.
 * 
 * Access Control:
 * - Only users with isAdmin=true can access this page
 * - Non-admins are redirected to home
 * 
 * Features:
 * - View all users in the D1 database
 * - Add new users by Discord ID
 * - Assign/remove RBAC roles to users
 * - Manage roles and their permissions
 * - View activity logs
 * - Manage Sesh calendar author mappings
 * 
 * Database Structure:
 * - users: Unified user table with discord_id, username, avatar, rsn, notes, is_banned
 * - rbac_roles: Role definitions with permissions
 * - rbac_permissions: Available permission definitions
 * - rbac_user_roles: User-to-role mappings
 * 
 * @module Admin
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// API base URL - uses environment variable or production default
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Database user record from unified users table
 */
interface DBUser {
  id: number;                     // Auto-increment primary key
  discord_id: string;             // Discord user ID (17-20 digit string)
  username: string | null;        // Discord username (handle)
  global_name: string | null;     // Discord display name
  avatar: string | null;          // Discord avatar hash
  rsn: string | null;             // RuneScape Name (for events)
  notes: string | null;           // Admin notes about user
  is_banned: number;              // 1 = banned, 0 = not banned
  first_login_at: string | null;  // First login timestamp
  last_login_at: string | null;   // Last login timestamp
  login_count: number;            // Number of logins
  created_at: string;             // Record creation timestamp
  updated_at: string | null;      // Last update timestamp
}

/**
 * Available tabs in the admin panel
 */
type Tab = 'users' | 'roles' | 'settings' | 'logs' | 'sesh-authors';

/**
 * RBAC Permission definition
 */
interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
}

/**
 * RBAC Role definition
 */
interface Role {
  id: string;
  name: string;
  description?: string;
  color: string;
  priority: number;
  is_default?: number;
  permissions: { id: string; name: string; category: string }[];
  user_count: number;
}

/**
 * Sesh author mapping for calendar event hosts
 */
interface SeshAuthor {
  discord_id: string;
  display_name: string;
  created_at?: string;
  updated_at?: string;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<DBUser | null>(null);
  
  // Form state for adding/editing users
  const [newDiscordId, setNewDiscordId] = useState('');
  const [newUsername, setNewUsername] = useState('');
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
  
  // Sesh Author Map state
  const [seshAuthors, setSeshAuthors] = useState<SeshAuthor[]>([]);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<SeshAuthor | null>(null);
  const [newAuthorId, setNewAuthorId] = useState('');
  const [newAuthorName, setNewAuthorName] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  
  // RBAC Roles & Permissions state
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  
  // Site settings state
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRoleData, setNewRoleData] = useState({ id: '', name: '', description: '', color: '#6b7280', priority: 0, permissions: [] as string[] });
  // User roles management
  const [userRoles, setUserRoles] = useState<Record<string, { role_id: string; role_name: string; color: string }[]>>({});
  const [assigningRoleToUser, setAssigningRoleToUser] = useState<string | null>(null); // discord_id of user being edited
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close role dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigningRoleToUser && roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setAssigningRoleToUser(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [assigningRoleToUser]);

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
      // Also fetch roles for the dropdown
      fetchRoles();
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
  
  /**
   * Fetch Sesh authors when sesh-authors tab is selected
   */
  useEffect(() => {
    if (user && isAdmin && activeTab === 'sesh-authors') {
      fetchSeshAuthors();
    }
  }, [user, isAdmin, activeTab]);
  
  /**
   * Fetch roles when roles tab is selected
   */
  useEffect(() => {
    if (user && isAdmin && activeTab === 'roles') {
      fetchRoles();
      fetchPermissions();
    }
  }, [user, isAdmin, activeTab]);
  
  /**
   * Fetch site settings and roles when settings tab is selected
   */
  useEffect(() => {
    if (user && isAdmin && activeTab === 'settings') {
      fetchSiteSettings();
      fetchRoles(); // Need roles for the dropdown
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
      const users = data.users || [];
      setDbUsers(users);
      // Fetch roles for all users
      await fetchAllUserRoles(users);
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
  // SESH AUTHOR MAP HANDLERS
  // ==========================================================================
  
  /**
   * Fetch all Sesh author mappings
   */
  const fetchSeshAuthors = async () => {
    setAuthorsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/sesh-author-map`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setSeshAuthors(data.authors || []);
      }
    } catch (err) {
      console.error('Failed to fetch sesh authors:', err);
    } finally {
      setAuthorsLoading(false);
    }
  };
  
  /**
   * Add a new Sesh author mapping
   */
  const addSeshAuthor = async () => {
    if (!newAuthorId.trim() || !newAuthorName.trim()) {
      alert('Both Discord ID and display name are required');
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/admin/sesh-author-map`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_id: newAuthorId.trim(),
          display_name: newAuthorName.trim()
        })
      });
      
      if (res.ok) {
        setNewAuthorId('');
        setNewAuthorName('');
        fetchSeshAuthors();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add author');
      }
    } catch (err) {
      console.error('Failed to add sesh author:', err);
      alert('Failed to add author');
    }
  };
  
  /**
   * Update a Sesh author mapping
   */
  const updateSeshAuthor = async (discordId: string, displayName: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/sesh-author-map/${discordId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName })
      });
      
      if (res.ok) {
        setEditingAuthor(null);
        fetchSeshAuthors();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update author');
      }
    } catch (err) {
      console.error('Failed to update sesh author:', err);
      alert('Failed to update author');
    }
  };
  
  /**
   * Delete a Sesh author mapping
   */
  const deleteSeshAuthor = async (discordId: string) => {
    if (!confirm('Delete this author mapping?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/admin/sesh-author-map/${discordId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        fetchSeshAuthors();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete author');
      }
    } catch (err) {
      console.error('Failed to delete sesh author:', err);
      alert('Failed to delete author');
    }
  };
  
  /**
   * Bulk import Sesh author mappings
   */
  const bulkImportSeshAuthors = async () => {
    try {
      // Parse the bulk import text as JSON object
      const authors = JSON.parse(bulkImportText);
      
      const res = await fetch(`${API_BASE}/admin/sesh-author-map/bulk`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authors })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert(`Import complete: ${data.added} added, ${data.updated} updated${data.errors?.length ? `, ${data.errors.length} errors` : ''}`);
        setShowBulkImport(false);
        setBulkImportText('');
        fetchSeshAuthors();
      } else {
        alert(data.error || 'Failed to bulk import');
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert('Invalid JSON format. Expected format:\n{\n  "discord_id": "Display Name",\n  ...\n}');
      } else {
        console.error('Failed to bulk import:', err);
        alert('Failed to bulk import');
      }
    }
  };
  
  // ==========================================================================
  // RBAC ROLE MANAGEMENT
  // ==========================================================================
  
  /**
   * Fetch all roles with their permissions
   */
  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/roles`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setRolesLoading(false);
    }
  };
  
  /**
   * Fetch all available permissions
   */
  const fetchPermissions = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/permissions`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions || []);
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };
  
  /**
   * Fetch site settings
   */
  const fetchSiteSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/site-settings`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setSiteSettings(data.settings || {});
      }
    } catch (err) {
      console.error('Failed to fetch site settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };
  
  /**
   * Update a site setting
   */
  const updateSiteSetting = async (key: string, value: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/site-settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      
      if (res.ok) {
        setSiteSettings(prev => ({ ...prev, [key]: value }));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update setting');
      }
    } catch (err) {
      console.error('Failed to update site setting:', err);
      alert('Failed to update setting');
    }
  };
  
  /**
   * Create a new role
   */
  const createRole = async () => {
    if (!newRoleData.id.trim() || !newRoleData.name.trim()) {
      alert('Role ID and name are required');
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/admin/roles`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoleData)
      });
      
      if (res.ok) {
        setShowNewRoleModal(false);
        setNewRoleData({ id: '', name: '', description: '', color: '#6b7280', priority: 0, permissions: [] });
        fetchRoles();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create role');
      }
    } catch (err) {
      console.error('Failed to create role:', err);
      alert('Failed to create role');
    }
  };
  
  /**
   * Update an existing role
   */
  const updateRole = async (roleId: string, updates: { name?: string; description?: string; color?: string; priority?: number; permissions?: string[] }) => {
    try {
      const res = await fetch(`${API_BASE}/admin/roles/${roleId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (res.ok) {
        setEditingRole(null);
        fetchRoles();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (err) {
      console.error('Failed to update role:', err);
      alert('Failed to update role');
    }
  };
  
  /**
   * Delete a role
   */
  const deleteRole = async (roleId: string) => {
    if (!confirm(`Are you sure you want to delete this role? All users with this role will lose these permissions.`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/admin/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        fetchRoles();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete role');
      }
    } catch (err) {
      console.error('Failed to delete role:', err);
      alert('Failed to delete role');
    }
  };
  
  /**
   * Fetch roles for a specific user
   */
  const fetchUserRoles = async (discordId: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/user-roles/${discordId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setUserRoles(prev => ({
          ...prev,
          [discordId]: (data.roles || []).map((r: { role_id: string; role_name: string; color: string }) => ({
            role_id: r.role_id,
            role_name: r.role_name,
            color: r.color
          }))
        }));
      }
    } catch (err) {
      console.error('Failed to fetch user roles:', err);
    }
  };
  
  /**
   * Fetch roles for all users
   */
  const fetchAllUserRoles = async (users: DBUser[]) => {
    for (const u of users) {
      await fetchUserRoles(u.discord_id);
    }
  };
  
  /**
   * Assign a role to a user
   */
  const assignRoleToUser = async (discordId: string, roleId: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/user-roles`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord_id: discordId, role_id: roleId })
      });
      
      if (res.ok) {
        await fetchUserRoles(discordId);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to assign role');
      }
    } catch (err) {
      console.error('Failed to assign role:', err);
      alert('Failed to assign role');
    }
  };
  
  /**
   * Remove a role from a user
   */
  const removeRoleFromUser = async (discordId: string, roleId: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/user-roles`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord_id: discordId, role_id: roleId })
      });
      
      if (res.ok) {
        await fetchUserRoles(discordId);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove role');
      }
    } catch (err) {
      console.error('Failed to remove role:', err);
      alert('Failed to remove role');
    }
  };
  
  // Group permissions by category for display
  const permissionsByCategory = permissions.reduce((acc, perm) => {
    const cat = perm.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

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
    { id: 'roles', label: 'Roles & Permissions', icon: '🛡️' },
    { id: 'sesh-authors', label: 'Sesh Authors', icon: '📅' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
    { id: 'logs', label: 'Activity Logs', icon: '📜' },
  ];

  // ==========================================================================
  // STATISTICS CALCULATIONS
  // ==========================================================================

  // Calculate role-based statistics
  const usersWithRolesCount = Object.values(userRoles).filter(r => r.length > 0).length;
  const totalRolesAssigned = Object.values(userRoles).reduce((acc, r) => acc + r.length, 0);
  
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Total Users</div>
          <div className="text-3xl font-bold text-yume-accent">{dbUsers.length}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Users with Roles</div>
          <div className="text-3xl font-bold text-purple-400">{usersWithRolesCount}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Roles Assigned</div>
          <div className="text-3xl font-bold text-green-400">{totalRolesAssigned}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Available Roles</div>
          <div className="text-3xl font-bold text-blue-400">{roles.length}</div>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Roles</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Notes</th>
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
                        
                        {/* Roles Cell */}
                        <td className="px-4 py-3 relative">
                          <div className="flex flex-wrap gap-1 items-center">
                            {(userRoles[u.discord_id] || []).map(role => (
                              <span 
                                key={role.role_id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                                style={{ backgroundColor: `${role.color}20`, color: role.color, border: `1px solid ${role.color}40` }}
                              >
                                {role.role_name}
                                <button
                                  onClick={() => removeRoleFromUser(u.discord_id, role.role_id)}
                                  className="hover:text-white ml-1"
                                  title="Remove role"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            <button
                              onClick={() => setAssigningRoleToUser(assigningRoleToUser === u.discord_id ? null : u.discord_id)}
                              className="w-5 h-5 rounded-full bg-yume-bg-light hover:bg-yume-accent hover:text-yume-bg flex items-center justify-center text-xs text-gray-400"
                              title="Add role"
                            >
                              +
                            </button>
                            {/* Role dropdown */}
                            {assigningRoleToUser === u.discord_id && (
                              <div ref={roleDropdownRef} className="absolute left-4 top-full mt-1 bg-yume-card border border-yume-border rounded-lg shadow-xl z-20 min-w-[180px] max-h-[200px] overflow-y-auto">
                                {roles.filter(r => !(userRoles[u.discord_id] || []).some(ur => ur.role_id === r.id)).map(role => (
                                  <button
                                    key={role.id}
                                    onClick={() => {
                                      assignRoleToUser(u.discord_id, role.id);
                                      setAssigningRoleToUser(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-yume-bg-light flex items-center gap-2"
                                  >
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                                    <span className="text-white">{role.name}</span>
                                  </button>
                                ))}
                                {roles.filter(r => !(userRoles[u.discord_id] || []).some(ur => ur.role_id === r.id)).length === 0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500">All roles assigned</div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* Notes */}
                        <td className="px-4 py-3 text-sm text-gray-400 max-w-[200px] truncate" title={u.notes || ''}>
                          {u.notes || <span className="text-gray-600">-</span>}
                        </td>
                        
                        {/* Last Login */}
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {u.last_login_at 
                            ? new Date(u.last_login_at.replace(' ', 'T') + 'Z').toLocaleDateString() 
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

        </div>
      )}

      {/* ========== SETTINGS TAB ========== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Default Roles Section */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h3 className="font-semibold text-white mb-4">🎭 Default Roles for New Users</h3>
            <p className="text-sm text-gray-400 mb-4">
              Configure which role new users automatically receive when they first log in.
            </p>
            
            {settingsLoading ? (
              <div className="text-gray-400 text-center py-4">Loading settings...</div>
            ) : (
              <div className="space-y-4">
                {/* Default role for emuy.gg */}
                <div className="flex items-center justify-between p-4 bg-yume-bg-light rounded-xl">
                  <div>
                    <div className="text-white font-medium">emuy.gg</div>
                    <div className="text-sm text-gray-500">Role assigned to new users on the main site</div>
                  </div>
                  <select
                    value={siteSettings.default_role_emuy || 'member'}
                    onChange={(e) => updateSiteSetting('default_role_emuy', e.target.value)}
                    className="px-4 py-2 rounded-lg bg-yume-bg border border-yume-border text-white focus:border-yume-accent outline-none"
                  >
                    <option value="none">No role (none)</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Default role for ironforged-events.emuy.gg */}
                <div className="flex items-center justify-between p-4 bg-yume-bg-light rounded-xl">
                  <div>
                    <div className="text-white font-medium">ironforged-events.emuy.gg</div>
                    <div className="text-sm text-gray-500">Role assigned to new users on the events site</div>
                  </div>
                  <select
                    value={siteSettings.default_role_events || 'event_participant'}
                    onChange={(e) => updateSiteSetting('default_role_events', e.target.value)}
                    className="px-4 py-2 rounded-lg bg-yume-bg border border-yume-border text-white focus:border-yume-accent outline-none"
                  >
                    <option value="none">No role (none)</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          
          {/* System Info Section */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h3 className="font-semibold text-white mb-4">⚙️ System Information</h3>
            
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
              Note: To modify system settings, update the Worker environment variables in Cloudflare Dashboard.
            </p>
          </div>
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

      {/* ========== ROLES TAB ========== */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white text-lg">🛡️ Roles & Permissions</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Manage role-based access control. Assign roles to users to grant permissions.
                </p>
              </div>
              <button
                onClick={() => setShowNewRoleModal(true)}
                className="btn-primary"
              >
                + New Role
              </button>
            </div>
          </div>
          
          {/* Roles List */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h4 className="font-semibold text-white mb-4">Available Roles</h4>
            
            {rolesLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-yume-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : roles.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No roles found. Create one to get started.</p>
            ) : (
              <div className="space-y-4">
                {roles.map(role => (
                  <div 
                    key={role.id} 
                    className="bg-yume-bg-light rounded-xl p-4 border border-yume-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: role.color }}
                        />
                        <div>
                          <div className="font-semibold text-white">{role.name}</div>
                          <div className="text-xs text-gray-500">{role.description || role.id}</div>
                        </div>
                        <span className="text-xs bg-yume-bg px-2 py-1 rounded text-gray-400">
                          {role.user_count} user{role.user_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingRole(role)}
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          Edit
                        </button>
                        {!role.is_default && (
                          <button
                            onClick={() => deleteRole(role.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Permissions */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {role.permissions.length === 0 ? (
                        <span className="text-xs text-gray-500">No permissions</span>
                      ) : (
                        role.permissions.map(perm => (
                          <span 
                            key={perm.id}
                            className="text-xs px-2 py-1 rounded-lg bg-yume-bg text-gray-300 border border-yume-border"
                          >
                            {perm.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Permissions Reference */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h4 className="font-semibold text-white mb-4">Available Permissions</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category} className="bg-yume-bg-light rounded-lg p-3">
                  <div className="text-xs font-semibold text-gray-400 uppercase mb-2">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {perms.map(perm => (
                      <div key={perm.id} className="text-sm">
                        <span className="text-white">{perm.name}</span>
                        {perm.description && (
                          <span className="text-gray-500 text-xs ml-2">- {perm.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* New Role Modal */}
      {showNewRoleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold text-white text-lg mb-4">Create New Role</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role ID (lowercase, no spaces)</label>
                <input
                  type="text"
                  value={newRoleData.id}
                  onChange={e => setNewRoleData(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                  className="input w-full"
                  placeholder="e.g., event_host"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newRoleData.name}
                  onChange={e => setNewRoleData(prev => ({ ...prev, name: e.target.value }))}
                  className="input w-full"
                  placeholder="e.g., Event Host"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={newRoleData.description}
                  onChange={e => setNewRoleData(prev => ({ ...prev, description: e.target.value }))}
                  className="input w-full"
                  placeholder="e.g., Can host and manage events"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newRoleData.color}
                    onChange={e => setNewRoleData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newRoleData.color}
                    onChange={e => setNewRoleData(prev => ({ ...prev, color: e.target.value }))}
                    className="input flex-1"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Priority</label>
                <input
                  type="number"
                  value={newRoleData.priority}
                  onChange={e => setNewRoleData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Higher priority roles are displayed first. Use negative values for lower priority.</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Permissions</label>
                <div className="max-h-48 overflow-y-auto space-y-2 bg-yume-bg rounded-lg p-3">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category}>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{category}</div>
                      {perms.map(perm => (
                        <label key={perm.id} className="flex items-center gap-2 py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newRoleData.permissions.includes(perm.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setNewRoleData(prev => ({ ...prev, permissions: [...prev.permissions, perm.id] }));
                              } else {
                                setNewRoleData(prev => ({ ...prev, permissions: prev.permissions.filter(p => p !== perm.id) }));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-white">{perm.name}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewRoleModal(false);
                  setNewRoleData({ id: '', name: '', description: '', color: '#6b7280', priority: 0, permissions: [] });
                }}
                className="flex-1 px-4 py-2 bg-yume-bg rounded-lg text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={createRole}
                className="flex-1 btn-primary"
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Role Modal */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold text-white text-lg mb-4">Edit Role: {editingRole.name}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editingRole.name}
                  onChange={e => setEditingRole(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={editingRole.description || ''}
                  onChange={e => setEditingRole(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={editingRole.color}
                    onChange={e => setEditingRole(prev => prev ? { ...prev, color: e.target.value } : null)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingRole.color}
                    onChange={e => setEditingRole(prev => prev ? { ...prev, color: e.target.value } : null)}
                    className="input flex-1"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Priority</label>
                <input
                  type="number"
                  value={editingRole.priority}
                  onChange={e => setEditingRole(prev => prev ? { ...prev, priority: parseInt(e.target.value) || 0 } : null)}
                  className="input w-full"
                  placeholder="Higher = more important"
                />
                <p className="text-xs text-gray-500 mt-1">Higher priority roles are displayed first. Use negative values for lower priority.</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Permissions</label>
                <div className="max-h-48 overflow-y-auto space-y-2 bg-yume-bg rounded-lg p-3">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category}>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{category}</div>
                      {perms.map(perm => (
                        <label key={perm.id} className="flex items-center gap-2 py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingRole.permissions.some(p => p.id === perm.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setEditingRole(prev => prev ? { 
                                  ...prev, 
                                  permissions: [...prev.permissions, { id: perm.id, name: perm.name, category: perm.category }] 
                                } : null);
                              } else {
                                setEditingRole(prev => prev ? { 
                                  ...prev, 
                                  permissions: prev.permissions.filter(p => p.id !== perm.id) 
                                } : null);
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-white">{perm.name}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingRole(null)}
                className="flex-1 px-4 py-2 bg-yume-bg rounded-lg text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingRole) {
                    updateRole(editingRole.id, {
                      name: editingRole.name,
                      description: editingRole.description,
                      color: editingRole.color,
                      priority: editingRole.priority,
                      permissions: editingRole.permissions.map(p => p.id)
                    });
                  }
                }}
                className="flex-1 btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== SESH AUTHORS TAB ========== */}
      {activeTab === 'sesh-authors' && (
        <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-white text-lg">📅 Sesh Author Map</h3>
              <p className="text-sm text-gray-500 mt-1">
                Map Discord IDs to display names for calendar event hosts
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkImport(true)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yume-bg-light text-gray-300 hover:text-white border border-yume-border hover:border-yume-accent transition-colors"
              >
                📥 Bulk Import
              </button>
              <button
                onClick={fetchSeshAuthors}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yume-accent/20 text-yume-accent hover:bg-yume-accent/30"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
          
          {/* Add New Author Form */}
          <div className="mb-6 p-4 bg-yume-bg-light rounded-xl">
            <h4 className="text-sm font-medium text-white mb-3">Add New Author</h4>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Discord ID (e.g., 357165893135892482)"
                value={newAuthorId}
                onChange={(e) => setNewAuthorId(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-yume-bg border border-yume-border text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-yume-accent font-mono"
              />
              <input
                type="text"
                placeholder="Display Name"
                value={newAuthorName}
                onChange={(e) => setNewAuthorName(e.target.value)}
                className="flex-1 min-w-[150px] px-3 py-2 rounded-lg bg-yume-bg border border-yume-border text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-yume-accent"
              />
              <button
                onClick={addSeshAuthor}
                disabled={!newAuthorId.trim() || !newAuthorName.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium text-sm hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add
              </button>
            </div>
          </div>
          
          {/* Authors List */}
          {authorsLoading ? (
            <div className="text-center py-8 text-gray-400">Loading authors...</div>
          ) : seshAuthors.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📅</div>
              <p>No author mappings yet</p>
              <p className="text-xs mt-2">Add authors above or use bulk import</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {seshAuthors.map(author => (
                <div
                  key={author.discord_id}
                  className="p-3 rounded-lg bg-yume-bg-light flex items-center justify-between group"
                >
                  {editingAuthor?.discord_id === author.discord_id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const displayName = (form.elements.namedItem('displayName') as HTMLInputElement).value;
                        updateSeshAuthor(author.discord_id, displayName);
                      }}
                      className="flex items-center gap-3 flex-1"
                    >
                      <code className="text-xs text-gray-500 font-mono">{author.discord_id}</code>
                      <input
                        name="displayName"
                        defaultValue={author.display_name}
                        className="flex-1 px-2 py-1 rounded bg-yume-bg border border-yume-border text-white text-sm"
                        autoFocus
                      />
                      <button type="submit" className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30">
                        ✓
                      </button>
                      <button type="button" onClick={() => setEditingAuthor(null)} className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30">
                        ✕
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <code className="text-xs text-gray-500 font-mono">{author.discord_id}</code>
                        <span className="text-white font-medium">{author.display_name}</span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingAuthor(author)}
                          className="px-2 py-1 rounded text-sm text-blue-400 hover:bg-blue-500/20"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteSeshAuthor(author.discord_id)}
                          className="px-2 py-1 rounded text-sm text-red-400 hover:bg-red-500/20"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-500">
            {seshAuthors.length} author{seshAuthors.length !== 1 ? 's' : ''} configured
          </div>
        </div>
      )}
      
      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-yume-card rounded-2xl border border-yume-border max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">📥 Bulk Import Author Map</h3>
            <p className="text-gray-400 text-sm mb-4">
              Paste a JSON object mapping Discord IDs to display names.
            </p>
            
            <textarea
              value={bulkImportText}
              onChange={(e) => setBulkImportText(e.target.value)}
              placeholder={`{
  "357165893135892482": "x flavored",
  "279100975170453507": "BT VividGrey",
  "279060499600113666": "BT Nick Nak"
}`}
              rows={10}
              className="w-full px-4 py-3 rounded-lg bg-yume-bg-light border border-yume-border text-white font-mono text-sm placeholder:text-gray-500 focus:border-yume-accent outline-none resize-y"
            />
            
            <p className="text-xs text-gray-500 mt-2">
              Existing entries will be updated. New entries will be added.
            </p>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowBulkImport(false); setBulkImportText(''); }}
                className="flex-1 px-4 py-2 rounded-lg border border-yume-border text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={bulkImportSeshAuthors}
                disabled={!bulkImportText.trim()}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
