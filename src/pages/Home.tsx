import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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

export default function Home() {
  const { user, login, isAdmin } = useAuth();

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

        {/* Quick stats */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Status</span>
            <div className={`w-3 h-3 rounded-full ${user ? 'bg-emerald-400' : 'bg-gray-500'}`} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {user ? 'Online' : 'Offline'}
          </div>
          <div className="text-sm text-gray-500">
            {user ? 'Authenticated' : 'Not logged in'}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Tools Available</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {user ? '2' : '0'}
          </div>
          <div className="text-sm text-yume-accent">
            {user ? 'Full access' : 'Login required'}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Platform</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">Yume</div>
          <div className="text-sm text-gray-500">OSRS Clan Tools</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tools Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Tools</h2>
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
          <h2 className="text-lg font-semibold text-white">Quick Info</h2>
          
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
                { icon: '🎮', label: 'OSRS Themed', desc: 'RuneScape-inspired' },
                { icon: '🔒', label: 'Discord Auth', desc: 'Secure OAuth' },
                { icon: '⚡', label: 'Fast & Modern', desc: 'React + Vite' },
                { icon: '☁️', label: 'Cloud Hosted', desc: 'Cloudflare' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-white">{item.label}</div>
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
