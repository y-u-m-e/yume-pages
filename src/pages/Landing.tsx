/**
 * =============================================================================
 * LANDING PAGE - Public Welcome Page
 * =============================================================================
 * 
 * Public landing page for emuy.gg. Shows to all visitors regardless of
 * authentication status. Provides an introduction to Yume Tools and
 * prompts login for access to protected features.
 * 
 * @module Landing
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

/**
 * Feature card data
 */
interface Feature {
  icon: string;
  title: string;
  description: string;
  link?: string;
  external?: boolean;
}

/**
 * Landing Page Component
 */
export default function Landing() {
  const { user, login, hasPermission, isAdmin } = useAuth();
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  // Check API health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        setApiStatus(res.ok ? 'online' : 'offline');
      } catch {
        setApiStatus('offline');
      }
    };
    checkHealth();
  }, []);
  
  // Features to showcase
  const features: Feature[] = [
    {
      icon: '📊',
      title: 'Cruddy Panel',
      description: 'Track clan attendance and event participation with detailed analytics.',
      link: '/cruddy-panel',
    },
    {
      icon: '🎮',
      title: 'Iron Forged Events',
      description: 'Tile-based clan events with progress tracking and leaderboards.',
      link: 'https://ironforged-events.emuy.gg',
      external: true,
    },
    {
      icon: '📚',
      title: 'Documentation',
      description: 'Comprehensive API docs and integration guides.',
      link: '/docs',
    },
    {
      icon: '🧩',
      title: 'Carrd Widgets',
      description: 'Embeddable widgets for your Carrd pages.',
      link: 'https://yumes-tools.emuy.gg',
      external: true,
    },
  ];
  
  // Projects/Sites
  const projects = [
    { name: 'emuy.gg', url: 'https://emuy.gg', icon: '🌐', status: 'online' },
    { name: 'API', url: `${API_BASE}/health`, icon: '⚡', status: apiStatus },
    { name: 'IF Events', url: 'https://ironforged-events.emuy.gg', icon: '🎮', status: 'online' },
    { name: 'Widgets', url: 'https://yumes-tools.emuy.gg', icon: '📄', status: 'online' },
  ];

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yume-accent/5 via-transparent to-purple-500/5" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-yume-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <img 
                src="/favicon/android-chrome-192x192.png?v=3" 
                alt="Yume Tools" 
                className="w-28 h-28 rounded-3xl shadow-2xl shadow-yume-accent/30 ring-2 ring-yume-accent/20"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            Yume <span className="text-yume-accent">Tools</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl text-gray-400 mb-8 max-w-xl mx-auto">
            Personal automation hub for OSRS clan management, event tracking, and custom integrations.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="btn-primary text-lg px-8 py-3 shadow-lg shadow-yume-accent/20"
                >
                  Go to Dashboard →
                </Link>
                <a 
                  href="https://ironforged-events.emuy.gg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3 rounded-full border border-yume-border text-gray-300 hover:border-yume-accent/50 hover:text-white transition-all"
                >
                  View Events ↗
                </a>
              </>
            ) : (
              <>
                <button 
                  onClick={login} 
                  className="btn-primary text-lg px-8 py-3 shadow-lg shadow-yume-accent/20 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 71 55" fill="currentColor">
                    <path d="M60.1 4.9A58.5 58.5 0 0045.4.4a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.5a.2.2 0 00-.2-.1 58.4 58.4 0 00-14.7 4.5.2.2 0 00-.1.1A60 60 0 00.4 44.4a.2.2 0 000 .2 58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.3 36.3 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1 58.5 58.5 0 0017.8-9 .2.2 0 000-.2c1.5-15.3-2.4-28.6-10.3-40.4a.2.2 0 00-.1-.1zM23.7 36.4c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.1-6.4 7.1zm23.6 0c-3.5 0-6.4-3.2-6.4-7.1s2.9-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.1-6.4 7.1z"/>
                  </svg>
                  Login with Discord
                </button>
                <a 
                  href="https://ironforged-events.emuy.gg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3 rounded-full border border-yume-border text-gray-300 hover:border-yume-accent/50 hover:text-white transition-all"
                >
                  Explore Events ↗
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* System Status Bar */}
      <section className="py-6 border-y border-yume-border/50 bg-yume-bg-light/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6">
            {projects.map(project => (
              <a
                key={project.name}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <span>{project.icon}</span>
                <span>{project.name}</span>
                <div className={`w-2 h-2 rounded-full ${
                  project.status === 'checking' ? 'bg-gray-500 animate-pulse' :
                  project.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'
                }`} />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Tools & Features
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group bg-yume-card rounded-2xl border border-yume-border p-6 hover:border-yume-accent/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yume-bg-light flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-yume-accent transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3">
                      {feature.description}
                    </p>
                    {feature.link && (
                      feature.external ? (
                        <a
                          href={feature.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-yume-accent hover:underline"
                        >
                          Visit ↗
                        </a>
                      ) : (
                        <Link
                          to={feature.link}
                          className="text-sm text-yume-accent hover:underline"
                        >
                          Open →
                        </Link>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Access for Logged In Users */}
      {user && (
        <section className="py-12 px-4 bg-yume-bg-light/30 border-t border-yume-border/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-white mb-6 text-center">Quick Access</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-full bg-yume-card border border-yume-border hover:border-yume-accent/50 text-sm text-gray-300 hover:text-white transition-all"
              >
                🏠 Dashboard
              </Link>
              {(hasPermission('view_cruddy') || isAdmin) && (
                <Link
                  to="/cruddy-panel"
                  className="px-4 py-2 rounded-full bg-yume-card border border-yume-border hover:border-yume-accent/50 text-sm text-gray-300 hover:text-white transition-all"
                >
                  📊 Cruddy Panel
                </Link>
              )}
              {(hasPermission('view_docs') || isAdmin) && (
                <Link
                  to="/docs"
                  className="px-4 py-2 rounded-full bg-yume-card border border-yume-border hover:border-yume-accent/50 text-sm text-gray-300 hover:text-white transition-all"
                >
                  📚 Docs
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link
                    to="/admin"
                    className="px-4 py-2 rounded-full bg-yume-card border border-yume-border hover:border-yume-accent/50 text-sm text-gray-300 hover:text-white transition-all"
                  >
                    ⚙️ Admin
                  </Link>
                  <Link
                    to="/devops"
                    className="px-4 py-2 rounded-full bg-yume-card border border-yume-border hover:border-yume-accent/50 text-sm text-gray-300 hover:text-white transition-all"
                  >
                    🚀 DevOps
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer info */}
      <section className="py-12 px-4 text-center">
        <p className="text-gray-500 text-sm">
          Built for the Iron Forged clan community
        </p>
      </section>
    </div>
  );
}

