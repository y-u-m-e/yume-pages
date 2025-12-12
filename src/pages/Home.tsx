/**
 * =============================================================================
 * HOME PAGE - Landing Page & Dashboard
 * =============================================================================
 * 
 * The main landing page for Yume Tools. Shows different content based on
 * authentication state:
 * 
 * - Logged out: Welcome message with Discord login button
 * - Logged in: Personalized dashboard with quick links to tools
 * - Admin: Additional admin panel link
 * 
 * Also displays a simple API health status indicator.
 * 
 * @module Home
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

// API base URL from environment or default to production
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

/**
 * Quick navigation links displayed to logged-in users
 * Each link shows an icon, title, and description
 */
const quickLinks = [
  { to: '/cruddy-panel', icon: '◉', title: 'Cruddy Panel', desc: 'Event attendance tracking' },
  { to: '/docs', icon: '◫', title: 'Documentation', desc: 'API & integration guides' },
];

/**
 * Home Page Component
 * 
 * Renders the landing page with:
 * - Hero section with logo and tagline
 * - API status indicator
 * - Login prompt OR user dashboard
 * - Quick links to tools (for authenticated users)
 */
export default function Home() {
  // Get auth state from context
  const { user, login, isAdmin } = useAuth();
  
  // API health status: checking -> online/offline
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Check API health on component mount
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(res => setApiStatus(res.ok ? 'online' : 'offline'))
      .catch(() => setApiStatus('offline'));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8">
        <div className="flex justify-center mb-6">
          <img 
            src="/favicon/favicon.svg" 
            alt="Yume Tools" 
            className="w-20 h-20 rounded-2xl shadow-lg shadow-yume-accent/20"
          />
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">Yume Tools</h1>
        <p className="text-lg text-gray-400 max-w-md mx-auto">
          OSRS clan management tools for Yume
        </p>
        
        {/* Simple status indicator */}
        <div className="flex items-center justify-center gap-2 mt-4 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            apiStatus === 'checking' ? 'bg-gray-500 animate-pulse' :
            apiStatus === 'online' ? 'bg-emerald-400' : 'bg-red-400'
          }`} />
          <span className="text-gray-500">
            {apiStatus === 'checking' ? 'Connecting...' : 
             apiStatus === 'online' ? 'All systems operational' : 'API offline'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      {user ? (
        <div className="space-y-6">
          {/* Welcome */}
          <div className="bg-gradient-to-r from-yume-accent/20 to-yume-accent/5 rounded-2xl border border-yume-accent/30 p-6">
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
                  {isAdmin ? '✦ Admin access' : 'Member access'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid sm:grid-cols-2 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group p-5 rounded-2xl bg-yume-card border border-yume-border hover:border-yume-accent/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yume-bg-light flex items-center justify-center text-2xl group-hover:bg-yume-accent/20 transition-colors">
                    {link.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-yume-accent transition-colors">
                      {link.title}
                    </div>
                    <div className="text-sm text-gray-500">{link.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Admin Panel Link */}
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-4 p-5 rounded-2xl bg-yume-card border border-yume-border hover:border-orange-500/50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-2xl">
                ⚙
              </div>
              <div>
                <div className="font-semibold text-white">Admin Panel</div>
                <div className="text-sm text-gray-500">Manage users & system settings</div>
              </div>
            </Link>
          )}
        </div>
      ) : (
        /* Login Prompt */
        <div className="bg-yume-card rounded-2xl border border-yume-border p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-yume-bg-light flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Sign In Required</h2>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Connect with Discord to access clan tools and features.
          </p>
          <button onClick={login} className="btn-primary text-lg px-8 py-3">
            Login with Discord
          </button>
        </div>
      )}

      {/* Footer Links */}
      <div className="flex justify-center gap-6 text-sm text-gray-500 pt-4">
        <a 
          href="https://yumes-tools.itai.gg" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-yume-accent transition-colors"
        >
          Carrd Widgets →
        </a>
      </div>
    </div>
  );
}
