import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Public tools - always visible
const publicTools = [
  {
    to: '/infographic-maker',
    icon: '🎨',
    title: 'Infographic Maker',
    description: 'Create stunning OSRS-style infographics with layers, shapes, and RuneScape fonts.',
    color: 'from-teal-500 to-cyan-500',
  },
];

// Protected tools - only visible when logged in
const protectedTools = [
  {
    to: '/cruddy-panel',
    icon: '📊',
    title: 'Cruddy Panel',
    description: 'Track clan event attendance with a beautiful dashboard and leaderboards.',
    color: 'from-orange-500 to-amber-500',
  },
  {
    to: '/docs',
    icon: '📚',
    title: 'Documentation',
    description: 'API reference and guides for integrating Yume Tools into your projects.',
    color: 'from-purple-500 to-pink-500',
  },
];

export default function Home() {
  const { user, login } = useAuth();
  
  const tools = user ? [...publicTools, ...protectedTools] : publicTools;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center py-16">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-yume-teal">Yume</span> Tools
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          A collection of tools for OSRS clan management, infographic creation, and more.
        </p>
      </div>

      {/* Tools Grid */}
      <div className={`grid gap-6 pb-8 ${tools.length === 1 ? 'max-w-md mx-auto' : tools.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' : 'md:grid-cols-3'}`}>
        {tools.map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            className="glass-panel p-6 group hover:border-yume-teal/50 transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
              {tool.icon}
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-yume-teal transition-colors">
              {tool.title}
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Login prompt for more tools */}
      {!user && (
        <div className="text-center pb-16">
          <button
            onClick={login}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-yume-teal/50 transition-all text-sm text-slate-400 hover:text-white"
          >
            <svg className="w-4 h-4" viewBox="0 0 71 55" fill="currentColor">
              <path d="M60.1 4.9A58.5 58.5 0 0045.4.4a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.5a.2.2 0 00-.2-.1 58.4 58.4 0 00-14.7 4.5.2.2 0 00-.1.1A60 60 0 00.4 44.4a.2.2 0 000 .2 58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.3 36.3 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1 58.5 58.5 0 0017.8-9 .2.2 0 000-.2c1.5-15.3-2.4-28.6-10.3-40.4a.2.2 0 00-.1-.1zM23.7 36.4c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.1-6.4 7.1zm23.6 0c-3.5 0-6.4-3.2-6.4-7.1s2.9-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.1-6.4 7.1z"/>
            </svg>
            Login with Discord for more tools
          </button>
        </div>
      )}

      {/* Features */}
      <div className="glass-panel p-8 mb-16">
        <h2 className="text-2xl font-semibold text-center mb-8 text-yume-teal">
          ✨ Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: '🎮', title: 'OSRS Themed', desc: 'RuneScape-inspired design' },
            { icon: '🔒', title: 'Discord Auth', desc: 'Secure OAuth login' },
            { icon: '⚡', title: 'Fast & Modern', desc: 'Built with React & Vite' },
            { icon: '☁️', title: 'Cloud Hosted', desc: 'Powered by Cloudflare' },
          ].map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="text-3xl mb-2">{feature.icon}</div>
              <h4 className="font-medium text-white">{feature.title}</h4>
              <p className="text-sm text-slate-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

