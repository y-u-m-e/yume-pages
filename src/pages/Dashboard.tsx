/**
 * =============================================================================
 * DASHBOARD PAGE - Bento Grid Dashboard
 * =============================================================================
 * 
 * Personal command center / dashboard for managing the Yume Tools ecosystem.
 * Requires authentication - redirects to landing page if not logged in.
 * 
 * - Logged in: Bento grid dashboard with status, projects, tools, and stats
 * - Admin: Full dashboard with all modules
 * 
 * @module Dashboard
 */

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

// API base URL from environment or default to production
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

/**
 * Project status item
 */
interface ProjectStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  icon: string;
  description: string;
}

/**
 * Activity log item
 */
interface ActivityItem {
  id: number;
  action: string;
  discord_username?: string;
  details?: string;
  created_at: string;
}

/**
 * Stats data
 */
interface Stats {
  records: number;
  events: number;
  users: number;
}

/**
 * Dashboard Page Component - Bento Grid Dashboard
 */
export default function Dashboard() {
  const { user, loading, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  
  // Check permission (admins always have access)
  const canViewDashboard = isAdmin || hasPermission('view_dashboard');
  
  // System status
  const [projects, setProjects] = useState<ProjectStatus[]>([
    { name: 'yume-api', url: `${API_BASE}/health`, status: 'checking', icon: '⚡', description: 'API Backend' },
    { name: 'emuy.gg', url: 'https://emuy.gg', status: 'online', icon: '🌐', description: 'Main Site' },
    { name: 'IF Events', url: 'https://ironforged-events.emuy.gg', status: 'online', icon: '🎮', description: 'Tile Events' },
    { name: 'Carrd', url: 'https://yumes-tools.emuy.gg', status: 'online', icon: '📄', description: 'Widgets' },
  ]);
  
  // Activity logs
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Stats
  const [stats, setStats] = useState<Stats>({ records: 0, events: 0, users: 0 });
  
  // Redirect users without permission to landing page
  useEffect(() => {
    if (!loading && (!user || !canViewDashboard)) {
      navigate('/');
    }
  }, [user, loading, canViewDashboard, navigate]);

  // Check API health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        setProjects(prev => prev.map(p => 
          p.name === 'yume-api' ? { ...p, status: res.ok ? 'online' : 'offline' } : p
        ));
      } catch {
        setProjects(prev => prev.map(p => 
          p.name === 'yume-api' ? { ...p, status: 'offline' } : p
        ));
      }
    };
    checkHealth();
  }, []);
  
  // Fetch activity logs for admins
  useEffect(() => {
    if (user && isAdmin) {
      const fetchActivity = async () => {
        setActivityLoading(true);
        try {
          const res = await fetch(`${API_BASE}/admin/activity-logs?limit=5`, {
            credentials: 'include'
          });
          if (res.ok) {
            const data = await res.json();
            setRecentActivity(data.logs || []);
          }
        } catch (err) {
          console.error('Failed to fetch activity:', err);
        } finally {
          setActivityLoading(false);
        }
      };
      fetchActivity();
    }
  }, [user, isAdmin]);
  
  // Fetch stats
  useEffect(() => {
    if (user) {
      const fetchStats = async () => {
        try {
          const res = await fetch(`${API_BASE}/attendance`, {
            credentials: 'include'
          });
          if (res.ok) {
            const data = await res.json();
            setStats({
              records: data.total_count || 0,
              events: data.events?.length || 0,
              users: data.leaderboard?.length || 0
            });
          }
        } catch (err) {
          console.error('Failed to fetch stats:', err);
        }
      };
      fetchStats();
    }
  }, [user]);
  
  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // ============================================================================
  // LOADING / NOT AUTHORIZED
  // ============================================================================
  
  if (loading || !user || !canViewDashboard) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-yume-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ============================================================================
  // BENTO GRID DASHBOARD (LOGGED IN)
  // ============================================================================

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`}
            alt={user.username}
            className="w-14 h-14 rounded-full ring-2 ring-yume-accent/50"
          />
          <div>
            <div className="text-xl font-bold text-white">
              Welcome back, {user.global_name || user.username}
            </div>
            <div className="text-sm text-gray-400">
              {isAdmin ? '✦ Super Admin' : 'Member'}
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* System Status - spans 2 cols on large */}
        <div className="lg:col-span-2 bg-yume-card rounded-2xl border border-yume-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">⚡ System Status</h3>
            <span className="text-xs text-gray-500">Live</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {projects.map(project => (
              <a
                key={project.name}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-yume-bg-light hover:bg-yume-bg transition-colors group"
              >
                <div className="text-xl">{project.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white group-hover:text-yume-accent truncate">
                    {project.name}
                  </div>
                  <div className="text-xs text-gray-500">{project.description}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  project.status === 'checking' ? 'bg-gray-500 animate-pulse' :
                  project.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'
                }`} />
              </a>
            ))}
          </div>
        </div>
        
        {/* Quick Stats - 2 cols */}
        <div className="lg:col-span-2 bg-yume-card rounded-2xl border border-yume-border p-5">
          <h3 className="font-semibold text-white mb-4">📊 Quick Stats</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-yume-bg-light">
              <div className="text-2xl font-bold text-yume-accent">{stats.records.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Records</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-yume-bg-light">
              <div className="text-2xl font-bold text-emerald-400">{stats.events.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Events</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-yume-bg-light">
              <div className="text-2xl font-bold text-purple-400">{stats.users.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Members</div>
            </div>
          </div>
        </div>
        
        {/* Admin Tools - spans 2 cols */}
        {isAdmin && (
          <div className="lg:col-span-2 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl border border-orange-500/30 p-5">
            <h3 className="font-semibold text-white mb-4">⚙️ Admin Tools</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to="/admin"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-yume-bg/50 hover:bg-yume-bg transition-colors group"
              >
                <span className="text-2xl">👥</span>
                <span className="text-xs text-gray-400 group-hover:text-white">Users</span>
              </Link>
              <Link
                to="/tile-event-admin"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-yume-bg/50 hover:bg-yume-bg transition-colors group"
              >
                <span className="text-2xl">🎮</span>
                <span className="text-xs text-gray-400 group-hover:text-white">Events</span>
              </Link>
              <Link
                to="/devops"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-yume-bg/50 hover:bg-yume-bg transition-colors group"
              >
                <span className="text-2xl">🚀</span>
                <span className="text-xs text-gray-400 group-hover:text-white">DevOps</span>
              </Link>
              <Link
                to="/architecture"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-yume-bg/50 hover:bg-yume-bg transition-colors group"
              >
                <span className="text-2xl">🗺️</span>
                <span className="text-xs text-gray-400 group-hover:text-white">Architecture</span>
              </Link>
            </div>
          </div>
        )}
        
        {/* Quick Links / Tools */}
        <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-2'} bg-yume-card rounded-2xl border border-yume-border p-5`}>
          <h3 className="font-semibold text-white mb-4">🔧 Tools</h3>
          <div className="space-y-2">
            {hasPermission('view_cruddy') && (
              <Link
                to="/cruddy-panel"
                className="flex items-center gap-3 p-3 rounded-xl bg-yume-bg-light hover:bg-yume-bg transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-lg">📊</div>
                <div className="flex-1">
                  <div className="font-medium text-white group-hover:text-yume-accent">Cruddy Panel</div>
                  <div className="text-xs text-gray-500">Attendance tracking</div>
                </div>
                <span className="text-gray-600">→</span>
              </Link>
            )}
            {hasPermission('view_docs') && (
              <Link
                to="/docs"
                className="flex items-center gap-3 p-3 rounded-xl bg-yume-bg-light hover:bg-yume-bg transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-lg">📚</div>
                <div className="flex-1">
                  <div className="font-medium text-white group-hover:text-yume-accent">Documentation</div>
                  <div className="text-xs text-gray-500">API & guides</div>
                </div>
                <span className="text-gray-600">→</span>
              </Link>
            )}
            <a
              href="https://ironforged-events.emuy.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-yume-bg-light hover:bg-yume-bg transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-lg">🎮</div>
              <div className="flex-1">
                <div className="font-medium text-white group-hover:text-yume-accent">Iron Forged Events</div>
                <div className="text-xs text-gray-500">Tile events portal</div>
              </div>
              <span className="text-gray-600">↗</span>
            </a>
          </div>
        </div>
        
        {/* Recent Activity (Admin only) */}
        {isAdmin && (
          <div className="lg:col-span-2 bg-yume-card rounded-2xl border border-yume-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">📜 Recent Activity</h3>
              <Link to="/admin" className="text-xs text-yume-accent hover:underline">View all →</Link>
            </div>
            {activityLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-yume-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-yume-border/50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-yume-bg-light flex items-center justify-center text-sm">
                      {item.action === 'login' ? '🔓' : 
                       item.action === 'submission' ? '📸' : 
                       item.action.includes('role') ? '🛡️' : '⚡'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        <span className="text-gray-400">{item.discord_username || 'Unknown'}</span>
                        {' · '}
                        <span>{item.action.replace(/_/g, ' ')}</span>
                      </div>
                      {item.details && (
                        <div className="text-xs text-gray-500 truncate">{item.details}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(item.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* External Dashboards (Admin only) */}
        {isAdmin && (
          <div className="lg:col-span-2 bg-yume-card rounded-2xl border border-yume-border p-5">
            <h3 className="font-semibold text-white mb-4">🔗 External Dashboards</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <a
                href="https://dash.cloudflare.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-yume-bg-light hover:bg-yume-bg transition-colors group"
              >
                <span className="text-2xl">☁️</span>
                <span className="text-xs text-gray-400 group-hover:text-white">Cloudflare</span>
              </a>
              <a
                href="https://github.com/y-u-m-e"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-yume-bg-light hover:bg-yume-bg transition-colors group"
              >
                <span className="text-2xl">🐙</span>
                <span className="text-xs text-gray-400 group-hover:text-white">GitHub</span>
              </a>
              <a
                href="https://railway.app/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-yume-bg-light hover:bg-yume-bg transition-colors group"
              >
                <span className="text-2xl">🚂</span>
                <span className="text-xs text-gray-400 group-hover:text-white">Railway</span>
              </a>
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-yume-bg-light hover:bg-yume-bg transition-colors group"
              >
                <span className="text-2xl">💬</span>
                <span className="text-xs text-gray-400 group-hover:text-white">Discord Dev</span>
              </a>
            </div>
          </div>
        )}
        
        {/* Non-admin: Simpler view */}
        {!isAdmin && (
          <div className="lg:col-span-2 bg-yume-card rounded-2xl border border-yume-border p-5">
            <h3 className="font-semibold text-white mb-4">🔗 Quick Links</h3>
            <div className="grid grid-cols-3 gap-3">
              <a
                href="https://yumes-tools.emuy.gg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-yume-bg-light hover:bg-yume-bg transition-colors group"
              >
                <span className="text-2xl">🧩</span>
                <span className="text-xs text-gray-400 group-hover:text-white">Widgets</span>
              </a>
              <a
                href="https://oldschool.runescape.wiki"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-yume-bg-light hover:bg-yume-bg transition-colors group"
              >
                <span className="text-2xl">📖</span>
                <span className="text-xs text-gray-400 group-hover:text-white">OSRS Wiki</span>
              </a>
              <Link
                to="/architecture"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-yume-bg-light hover:bg-yume-bg transition-colors group"
              >
                <span className="text-2xl">🗺️</span>
                <span className="text-xs text-gray-400 group-hover:text-white">Architecture</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
