import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AllowedUser {
  id: string;
  username: string;
  addedAt: string;
  addedBy: string;
}

// Mock data for now - will be replaced with API calls
const mockCruddyUsers: AllowedUser[] = [
  { id: '166201366228762624', username: 'itai_', addedAt: '2024-12-01', addedBy: 'System' },
  { id: '667951474856427528', username: 'user2', addedAt: '2024-12-05', addedBy: 'itai_' },
];

const mockDocsUsers: AllowedUser[] = [
  { id: '166201366228762624', username: 'itai_', addedAt: '2024-12-01', addedBy: 'System' },
];

type Tab = 'users' | 'settings' | 'logs';

export default function Admin() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [cruddyUsers, setCruddyUsers] = useState<AllowedUser[]>(mockCruddyUsers);
  const [docsUsers, setDocsUsers] = useState<AllowedUser[]>(mockDocsUsers);
  const [newUserId, setNewUserId] = useState('');
  const [addingTo, setAddingTo] = useState<'cruddy' | 'docs' | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, authLoading, isAdmin, navigate]);

  const handleAddUser = (type: 'cruddy' | 'docs') => {
    if (!newUserId.trim()) return;
    
    const newUser: AllowedUser = {
      id: newUserId,
      username: `User ${newUserId.slice(-4)}`,
      addedAt: new Date().toISOString().split('T')[0],
      addedBy: user?.username || 'Unknown',
    };
    
    if (type === 'cruddy') {
      setCruddyUsers([...cruddyUsers, newUser]);
    } else {
      setDocsUsers([...docsUsers, newUser]);
    }
    
    setNewUserId('');
    setAddingTo(null);
  };

  const handleRemoveUser = (type: 'cruddy' | 'docs', userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    
    if (type === 'cruddy') {
      setCruddyUsers(cruddyUsers.filter(u => u.id !== userId));
    } else {
      setDocsUsers(docsUsers.filter(u => u.id !== userId));
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
          <div className="text-sm text-gray-400 mb-1">Cruddy Users</div>
          <div className="text-3xl font-bold text-white">{cruddyUsers.length}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Docs Users</div>
          <div className="text-3xl font-bold text-white">{docsUsers.length}</div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-1">Total Unique</div>
          <div className="text-3xl font-bold text-yume-accent">
            {new Set([...cruddyUsers, ...docsUsers].map(u => u.id)).size}
          </div>
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
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Cruddy Panel Users */}
          <div className="bg-yume-card rounded-2xl border border-yume-border overflow-hidden">
            <div className="px-6 py-4 border-b border-yume-border flex items-center justify-between">
              <h3 className="font-semibold text-white">Cruddy Panel Access</h3>
              <button
                onClick={() => setAddingTo(addingTo === 'cruddy' ? null : 'cruddy')}
                className="text-sm text-yume-accent hover:underline"
              >
                {addingTo === 'cruddy' ? 'Cancel' : '+ Add User'}
              </button>
            </div>
            
            {addingTo === 'cruddy' && (
              <div className="px-6 py-4 border-b border-yume-border bg-yume-bg-light">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="Discord User ID"
                    className="input flex-1"
                  />
                  <button onClick={() => handleAddUser('cruddy')} className="btn-primary">
                    Add
                  </button>
                </div>
              </div>
            )}
            
            <div className="divide-y divide-yume-border">
              {cruddyUsers.map((u) => (
                <div key={u.id} className="px-6 py-3 flex items-center justify-between hover:bg-yume-bg-light/50">
                  <div>
                    <div className="text-white font-medium">{u.username}</div>
                    <div className="text-xs text-gray-500">{u.id}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveUser('cruddy', u.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Docs Users */}
          <div className="bg-yume-card rounded-2xl border border-yume-border overflow-hidden">
            <div className="px-6 py-4 border-b border-yume-border flex items-center justify-between">
              <h3 className="font-semibold text-white">Documentation Access</h3>
              <button
                onClick={() => setAddingTo(addingTo === 'docs' ? null : 'docs')}
                className="text-sm text-yume-accent hover:underline"
              >
                {addingTo === 'docs' ? 'Cancel' : '+ Add User'}
              </button>
            </div>
            
            {addingTo === 'docs' && (
              <div className="px-6 py-4 border-b border-yume-border bg-yume-bg-light">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="Discord User ID"
                    className="input flex-1"
                  />
                  <button onClick={() => handleAddUser('docs')} className="btn-primary">
                    Add
                  </button>
                </div>
              </div>
            )}
            
            <div className="divide-y divide-yume-border">
              {docsUsers.map((u) => (
                <div key={u.id} className="px-6 py-3 flex items-center justify-between hover:bg-yume-bg-light/50">
                  <div>
                    <div className="text-white font-medium">{u.username}</div>
                    <div className="text-xs text-gray-500">{u.id}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveUser('docs', u.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
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

