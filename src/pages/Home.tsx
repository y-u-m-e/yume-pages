import { Link } from 'react-router-dom';

const tools = [
  {
    to: '/infographic-maker',
    icon: '🎨',
    title: 'Infographic Maker',
    description: 'Create stunning OSRS-style infographics with layers, shapes, and RuneScape fonts.',
    color: 'from-teal-500 to-cyan-500',
  },
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
      <div className="grid md:grid-cols-3 gap-6 pb-16">
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

