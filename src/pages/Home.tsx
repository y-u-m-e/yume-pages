import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

// Protected tools - only visible when logged in
const tools = [
  {
    to: '/cruddy-panel',
    icon: '◉',
    title: 'Cruddy Panel',
    description: 'Track clan event attendance with a beautiful dashboard and leaderboards.',
    accent: true,
  },
  {
    to: '/docs',
    icon: '◫',
    title: 'Documentation',
    description: 'API reference and guides for integrating Yume Tools into your projects.',
    accent: false,
  },
];

// Service status type
type ServiceStatus = 'checking' | 'online' | 'offline' | 'degraded' | 'recent' | 'stale';

interface ServiceHealth {
  api: ServiceStatus;
  cdn: ServiceStatus;
  carrd: ServiceStatus;
  widgets: {
    mentionMaker: { cdn: ServiceStatus; carrd: ServiceStatus; lastPing?: string };
    eventParser: { cdn: ServiceStatus; carrd: ServiceStatus; lastPing?: string };
    infographicMaker: { cdn: ServiceStatus; carrd: ServiceStatus; lastPing?: string };
  };
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

export default function Home() {
  const { user, login, isAdmin } = useAuth();
  const [health, setHealth] = useState<ServiceHealth>({
    api: 'checking',
    cdn: 'checking',
    carrd: 'checking',
    widgets: {
      mentionMaker: { cdn: 'checking', carrd: 'checking' },
      eventParser: { cdn: 'checking', carrd: 'checking' },
      infographicMaker: { cdn: 'checking', carrd: 'checking' },
    },
  });

  // Check service health on mount
  useEffect(() => {
    const checkHealth = async () => {
      // Check API health
      try {
        const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
        setHealth(prev => ({ ...prev, api: res.ok ? 'online' : 'degraded' }));
      } catch {
        setHealth(prev => ({ ...prev, api: 'offline' }));
      }

      // Check CDN / Widgets (check if JS files are accessible)
      const widgetChecks = [
        { key: 'mentionMaker', path: 'msg-maker/mention-widget.js', heartbeatKey: 'mention-maker' },
        { key: 'eventParser', path: 'log-parser/event-parser-widget.js', heartbeatKey: 'event-parser' },
        { key: 'infographicMaker', path: 'infographic-maker/infographic-maker.js', heartbeatKey: 'infographic-maker' },
      ];

      // Check CDN via API proxy (avoids CORS issues)
      // The API already proxies these files, so we check if API can reach them
      try {
        const cdnRes = await fetch(`${API_BASE}/cdn/mention-widget.js`, { method: 'HEAD' });
        const cdnStatus: ServiceStatus = cdnRes.ok ? 'online' : 'offline';
        // If API CDN proxy works, all widgets should work (same source)
        setHealth(prev => ({
          ...prev,
          cdn: cdnStatus,
          widgets: {
            ...prev.widgets,
            mentionMaker: { ...prev.widgets.mentionMaker, cdn: cdnStatus },
            eventParser: { ...prev.widgets.eventParser, cdn: cdnStatus },
            infographicMaker: { ...prev.widgets.infographicMaker, cdn: cdnStatus },
          },
        }));
      } catch {
        setHealth(prev => ({
          ...prev,
          cdn: 'offline',
          widgets: {
            ...prev.widgets,
            mentionMaker: { ...prev.widgets.mentionMaker, cdn: 'offline' },
            eventParser: { ...prev.widgets.eventParser, cdn: 'offline' },
            infographicMaker: { ...prev.widgets.infographicMaker, cdn: 'offline' },
          },
        }));
      }

      // Check widget heartbeats (are they actually visible on Carrd?)
      try {
        const heartbeatRes = await fetch(`${API_BASE}/widget/status`);
        if (heartbeatRes.ok) {
          const data = await heartbeatRes.json();
          const widgets = data.widgets || {};
          
          // Map heartbeat status to our status type
          const mapStatus = (s: string): ServiceStatus => {
            if (s === 'online') return 'online';
            if (s === 'recent') return 'recent';
            if (s === 'stale') return 'stale';
            return 'offline';
          };

          let anyCarrdOnline = false;
          for (const widget of widgetChecks) {
            const hb = widgets[widget.heartbeatKey];
            if (hb) {
              const carrdStatus = mapStatus(hb.status);
              if (carrdStatus === 'online' || carrdStatus === 'recent') anyCarrdOnline = true;
              setHealth(prev => ({
                ...prev,
                widgets: {
                  ...prev.widgets,
                  [widget.key]: { 
                    ...prev.widgets[widget.key as keyof typeof prev.widgets], 
                    carrd: carrdStatus,
                    lastPing: hb.lastPing
                  },
                },
              }));
            } else {
              setHealth(prev => ({
                ...prev,
                widgets: {
                  ...prev.widgets,
                  [widget.key]: { 
                    ...prev.widgets[widget.key as keyof typeof prev.widgets], 
                    carrd: 'offline'
                  },
                },
              }));
            }
          }
          setHealth(prev => ({ ...prev, carrd: anyCarrdOnline ? 'online' : 'offline' }));
        }
      } catch {
        // Heartbeat check failed - mark carrd as unknown
        setHealth(prev => ({ ...prev, carrd: 'offline' }));
      }
    };

    checkHealth();
  }, []);

  const StatusDot = ({ status, size = 'sm' }: { status: ServiceStatus; size?: 'sm' | 'xs' }) => {
    const colors = {
      checking: 'bg-gray-500 animate-pulse',
      online: 'bg-emerald-400',
      recent: 'bg-emerald-300',
      stale: 'bg-yellow-400',
      degraded: 'bg-yellow-400',
      offline: 'bg-red-400',
    };
    const sizeClass = size === 'xs' ? 'w-2 h-2' : 'w-2.5 h-2.5';
    return <div className={`${sizeClass} rounded-full ${colors[status]}`} title={status} />;
  };

  const getStatusText = (status: ServiceStatus) => {
    return status === 'checking' ? '...' : status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Get combined widget status (best of CDN and Carrd)
  const getWidgetStatus = (widget: { cdn: ServiceStatus; carrd: ServiceStatus }): ServiceStatus => {
    // If both are online, return online
    if (widget.cdn === 'online' && (widget.carrd === 'online' || widget.carrd === 'recent')) return 'online';
    // If CDN is online but carrd hasn't pinged recently
    if (widget.cdn === 'online') return widget.carrd === 'stale' ? 'degraded' : widget.carrd;
    // If CDN is down
    return 'offline';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Welcome card */}
        <div className="stat-card-accent">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium opacity-80">Welcome</span>
            <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
              <span className="text-lg">👋</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">
            {user ? (user.global_name || user.username) : 'Guest'}
          </div>
          <div className="text-sm opacity-70">
            {user ? (isAdmin ? 'Admin access' : 'Member access') : 'Login for access'}
          </div>
        </div>

        {/* API Status */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Yume API</span>
            <StatusDot status={health.api} />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {getStatusText(health.api)}
          </div>
          <div className="text-xs text-gray-500 font-mono">
            api.emuy.gg
          </div>
        </div>

        {/* CDN Status */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">jsDelivr CDN</span>
            <StatusDot status={health.cdn} />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {getStatusText(health.cdn)}
          </div>
          <div className="text-xs text-gray-500 font-mono">
            cdn.jsdelivr.net
          </div>
        </div>

        {/* Auth Status */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Discord Auth</span>
            <StatusDot status={user ? 'online' : 'offline'} />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {user ? 'Connected' : 'Not Connected'}
          </div>
          <div className="text-xs text-gray-500">
            {user ? 'OAuth2 active' : 'Login required'}
          </div>
        </div>
      </div>

      {/* Carrd Widgets Status Row */}
      <div className="bg-yume-card rounded-2xl border border-yume-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Carrd Widgets</h3>
          <a 
            href="https://yumes-tools.itai.gg" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-yume-accent hover:underline"
          >
            View on Carrd →
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Mention Maker */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-yume-bg-light">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-lg">
              @
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">Mention Maker</span>
                <StatusDot status={getWidgetStatus(health.widgets.mentionMaker)} />
              </div>
              <div className="text-xs text-gray-500">
                {health.widgets.mentionMaker.lastPing 
                  ? `Last seen: ${new Date(health.widgets.mentionMaker.lastPing + 'Z').toLocaleTimeString()}`
                  : 'Discord @mentions'}
              </div>
            </div>
          </div>

          {/* Event Parser */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-yume-bg-light">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-lg">
              📋
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">Event Parser</span>
                <StatusDot status={getWidgetStatus(health.widgets.eventParser)} />
              </div>
              <div className="text-xs text-gray-500">
                {health.widgets.eventParser.lastPing 
                  ? `Last seen: ${new Date(health.widgets.eventParser.lastPing + 'Z').toLocaleTimeString()}`
                  : 'Log parsing'}
              </div>
            </div>
          </div>

          {/* Infographic Maker */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-yume-bg-light">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-lg">
              🖼️
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">Infographic Maker</span>
                <StatusDot status={getWidgetStatus(health.widgets.infographicMaker)} />
              </div>
              <div className="text-xs text-gray-500">
                {health.widgets.infographicMaker.lastPing 
                  ? `Last seen: ${new Date(health.widgets.infographicMaker.lastPing + 'Z').toLocaleTimeString()}`
                  : 'OSRS graphics'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tools Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">React Tools</h2>
          </div>

          {user ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {tools.map((tool) => (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className={`group p-5 rounded-2xl border transition-all duration-200 ${
                    tool.accent 
                      ? 'bg-yume-accent text-yume-bg border-transparent hover:shadow-lg hover:shadow-yume-accent/20' 
                      : 'bg-yume-card border-yume-border hover:border-yume-border-accent'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${
                    tool.accent ? 'bg-black/10' : 'bg-yume-bg-light'
                  }`}>
                    {tool.icon}
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${tool.accent ? '' : 'text-white'}`}>
                    {tool.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${tool.accent ? 'opacity-80' : 'text-gray-400'}`}>
                    {tool.description}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-yume-card rounded-2xl border border-yume-border p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-yume-bg-light flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Login Required</h3>
              <p className="text-gray-400 mb-4">
                Sign in with Discord to access clan management tools.
              </p>
              <button onClick={login} className="btn-primary">
                Login with Discord
              </button>
            </div>
          )}
        </div>

        {/* Quick Info Sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Tech Stack</h2>
          
          <div className="bg-yume-card rounded-2xl border border-yume-border p-5 space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/favicon/favicon.svg" 
                alt="Yume" 
                className="w-10 h-10 rounded-full"
              />
              <div>
                <div className="font-medium text-white">Yume Tools</div>
                <div className="text-sm text-gray-500">OSRS Clan Tools</div>
              </div>
            </div>

            <div className="h-px bg-yume-border" />

            <div className="space-y-3">
              {[
                { icon: '⚛️', label: 'React + Vite', desc: 'Frontend framework', status: 'online' as ServiceStatus },
                { icon: '☁️', label: 'Cloudflare Pages', desc: 'Frontend hosting', status: 'online' as ServiceStatus },
                { icon: '⚡', label: 'Cloudflare Workers', desc: 'API backend', status: health.api },
                { icon: '🗄️', label: 'Cloudflare D1', desc: 'SQLite database', status: health.api },
                { icon: '📦', label: 'jsDelivr CDN', desc: 'Widget delivery', status: health.cdn },
                { icon: '🌐', label: 'Carrd Widgets', desc: 'Widget visibility', status: health.carrd },
                { icon: '🔐', label: 'Discord OAuth2', desc: 'Authentication', status: user ? 'online' as ServiceStatus : 'offline' as ServiceStatus },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">{item.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{item.label}</span>
                      <StatusDot status={item.status} />
                    </div>
                    <div className="text-xs text-gray-500">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isAdmin && (
            <Link
              to="/admin"
              className="block bg-yume-card rounded-2xl border border-yume-border p-5 hover:border-yume-border-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yume-bg-light flex items-center justify-center text-lg">
                  ⚙
                </div>
                <div>
                  <div className="font-medium text-white">Admin Panel</div>
                  <div className="text-sm text-gray-500">Manage users & settings</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
