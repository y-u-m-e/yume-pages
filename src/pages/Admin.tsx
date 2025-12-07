import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

interface DBUser {
  id: number;
  discord_id: string;
  username: string | null;
  access_cruddy: number;
  access_docs: number;
  created_at: string;
}

type Tab = 'users' | 'settings' | 'logs';

export default function Admin() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [dbUsers, setDbUsers] = useState<DBUser[]>([]);
  const [envUsers, setEnvUsers] = useState<{ cruddy: string[]; docs: string[] }>({ cruddy: [], docs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [newDiscordId, setNewDiscordId] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newAccessCruddy, setNewAccessCruddy] = useState(true);
  const [newAccessDocs, setNewAccessDocs] = useState(false);
  const [saving, setSaving] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, authLoading, isAdmin, navigate]);

  // Fetch users on mount
  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        credentials: 'include'
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

  const handleAddUser = async () => {
    if (!newDiscordId.trim()) return;
    
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_id: newDiscordId.trim(),
          username: newUsername.trim() || null,
          access_cruddy: newAccessCruddy,
          access_docs: newAccessDocs
        })
      });
      
      if (!res.ok) throw new Error('Failed to add user');
      
      setNewDiscordId('');
      setNewUsername('');
      setNewAccessCruddy(true);
      setNewAccessDocs(false);
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };

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

  const handleUpdateUser = async (dbUser: DBUser, field: 'access_cruddy' | 'access_docs') => {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_id: dbUser.discord_id,
          username: dbUser.username,
          access_cruddy: field === 'access_cruddy' ? !dbUser.access_cruddy : dbUser.access_cruddy,
          access_docs: field === 'access_docs' ? !dbUser.access_docs : dbUser.access_docs
        })
      });
      
      if (!res.ok) throw new Error('Failed to update user');
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-yume-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
    { id: 'logs', label: 'Activity Logs', icon: '📜' },
  ];

  const cruddyCount = dbUsers.filter(u => u.access_cruddy).length + envUsers.cruddy.length;
  const docsCount = dbUsers.filter(u => u.access_docs).length + envUsers.docs.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          <span className="text-yume-accent">⚙</span> Admin Panel
        </h1>
        <p className="text-gray-400">Manage users, settings, and view activity logs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Cruddy Access</div>
          <div className="text-3xl font-bold text-white">{cruddyCount}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Docs Access</div>
          <div className="text-3xl font-bold text-white">{docsCount}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">DB Users</div>
          <div className="text-3xl font-bold text-yume-accent">{dbUsers.length}</div>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Content */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Add User Form */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h3 className="font-semibold text-white mb-4">Add New User</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <input
                type="text"
                value={newDiscordId}
                onChange={(e) => setNewDiscordId(e.target.value)}
                placeholder="Discord User ID"
                className="input"
              />
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Username (optional)"
                className="input"
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={newAccessCruddy}
                    onChange={(e) => setNewAccessCruddy(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Cruddy
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={newAccessDocs}
                    onChange={(e) => setNewAccessDocs(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Docs
                </label>
              </div>
              <button 
                onClick={handleAddUser} 
                disabled={saving || !newDiscordId.trim()}
                className="btn-primary"
              >
                {saving ? 'Adding...' : 'Add User'}
              </button>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Discord ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Username</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Cruddy</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Docs</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Added</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yume-border">
                    {dbUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-yume-bg-light/50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-300">{u.discord_id}</td>
                        <td className="px-6 py-4 text-sm text-white">{u.username || '—'}</td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleUpdateUser(u, 'access_cruddy')}
                            className={`w-6 h-6 rounded ${u.access_cruddy ? 'bg-green-500' : 'bg-gray-600'}`}
                          >
                            {u.access_cruddy ? '✓' : ''}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleUpdateUser(u, 'access_docs')}
                            className={`w-6 h-6 rounded ${u.access_docs ? 'bg-green-500' : 'bg-gray-600'}`}
                          >
                            {u.access_docs ? '✓' : ''}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemoveUser(u.discord_id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Environment Users (Read-only) */}
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

      {activeTab === 'settings' && (
        <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
          <h3 className="font-semibold text-white mb-4">Application Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-yume-bg-light rounded-xl">
              <div>
                <div className="text-white font-medium">API Base URL</div>
                <div className="text-sm text-gray-500">https://api.emuy.gg</div>
              </div>
              <span className="badge-success">Active</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-yume-bg-light rounded-xl">
              <div>
                <div className="text-white font-medium">Discord OAuth</div>
                <div className="text-sm text-gray-500">Client ID: 1446582844553035918</div>
              </div>
              <span className="badge-success">Connected</span>
            </div>
            
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

      {activeTab === 'logs' && (
        <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
          <h3 className="font-semibold text-white mb-4">Recent Activity</h3>
          
          <div className="space-y-2">
            {[
              { action: 'User login', user: 'itai_', time: '2 minutes ago', type: 'auth' },
              { action: 'Record added', user: 'itai_', time: '15 minutes ago', type: 'record' },
              { action: 'Record deleted', user: 'itai_', time: '1 hour ago', type: 'record' },
              { action: 'User login', user: 'itai_', time: '3 hours ago', type: 'auth' },
            ].map((log, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-yume-bg-light rounded-xl">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  log.type === 'auth' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {log.type === 'auth' ? '🔑' : '📝'}
                </span>
                <div className="flex-1">
                  <div className="text-white">{log.action}</div>
                  <div className="text-xs text-gray-500">by {log.user}</div>
                </div>
                <div className="text-sm text-gray-400">{log.time}</div>
              </div>
            ))}
          </div>
          
          <p className="text-sm text-gray-500 mt-6 text-center">
            Full activity logs coming soon...
          </p>
        </div>
      )}
    </div>
  );
}
