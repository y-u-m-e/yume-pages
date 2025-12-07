import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Public tools - always visible
const publicTools = [
  {
    to: '/infographic-maker',
    icon: '◈',
    title: 'Infographic Maker',
    description: 'Create stunning OSRS-style infographics with layers, shapes, and RuneScape fonts.',
    accent: true,
  },
];

// Protected tools - only visible when logged in
const protectedTools = [
  {
    to: '/cruddy-panel',
    icon: '◉',
    title: 'Cruddy Panel',
    description: 'Track clan event attendance with a beautiful dashboard and leaderboards.',
    accent: false,
  },
  {
    to: '/docs',
    icon: '◫',
    title: 'Documentation',
    description: 'API reference and guides for integrating Yume Tools into your projects.',
    accent: false,
  },
];

const stats = [
  { label: 'Active Tools', value: '4', change: '+1 this month' },
  { label: 'API Requests', value: '12.4K', change: '+23% vs last month' },
  { label: 'Clan Members', value: '156', change: '+8 this week' },
];

export default function Home() {
  const { user, login } = useAuth();
  
  const tools = user ? [...publicTools, ...protectedTools] : publicTools;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Stats Row - like the delivery stats in the image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Accent stat card */}
        <div className="stat-card-accent">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium opacity-80">Welcome Back</span>
            <button className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
          <div className="text-3xl font-bold mb-1">
            {user ? (user.global_name || user.username) : 'Guest'}
          </div>
          <div className="text-sm opacity-70">
            {user ? 'Full access enabled' : 'Login for full access'}
          </div>
        </div>

        {/* Regular stat cards */}
        {stats.map((stat, i) => (
          <div key={stat.label} className="stat-card opacity-0 animate-fade-in" style={{ animationDelay: `${(i + 1) * 0.05}s` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">{stat.label}</span>
              <button className="w-8 h-8 rounded-full bg-yume-bg-light flex items-center justify-center hover:bg-yume-card-hover transition-colors text-gray-400 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-yume-accent">{stat.change}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tools Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Tools</h2>
            {!user && (
              <button
                onClick={login}
                className="text-sm text-yume-accent hover:underline flex items-center gap-1"
              >
                Login for more
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {tools.map((tool, i) => (
              <Link
                key={tool.to}
                to={tool.to}
                className={`group p-5 rounded-2xl border transition-all duration-200 opacity-0 animate-fade-in ${
                  tool.accent 
                    ? 'bg-yume-accent text-yume-bg border-transparent hover:shadow-lg hover:shadow-yume-accent/20' 
                    : 'bg-yume-card border-yume-border hover:border-yume-border-accent'
                }`}
                style={{ animationDelay: `${(i + 4) * 0.05}s` }}
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
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Quick Info</h2>
          
          <div className="bg-yume-card rounded-2xl border border-yume-border p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yume-accent flex items-center justify-center text-yume-bg font-bold">
                Y
              </div>
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

          {!user && (
            <button
              onClick={login}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 71 55" fill="currentColor">
                <path d="M60.1 4.9A58.5 58.5 0 0045.4.4a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.5a.2.2 0 00-.2-.1 58.4 58.4 0 00-14.7 4.5.2.2 0 00-.1.1A60 60 0 00.4 44.4a.2.2 0 000 .2 58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.3 36.3 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1 58.5 58.5 0 0017.8-9 .2.2 0 000-.2c1.5-15.3-2.4-28.6-10.3-40.4a.2.2 0 00-.1-.1zM23.7 36.4c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.1-6.4 7.1zm23.6 0c-3.5 0-6.4-3.2-6.4-7.1s2.9-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.1-6.4 7.1z"/>
              </svg>
              Login with Discord
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
