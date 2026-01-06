/**
 * =============================================================================
 * LANDING PAGE - Public Welcome Page
 * =============================================================================
 * 
 * Public landing page for emuy.gg. Shows to all visitors regardless of
 * authentication status. Simple personal introduction page.
 * 
 * @module Landing
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Landing Page Component
 */
export default function Landing() {
  const { user, login, hasPermission, isAdmin } = useAuth();

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 px-4 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yume-accent/5 via-transparent to-purple-500/5" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-yume-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-5xl mx-auto">
          {/* Main content - flex layout for text + image */}
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            
            {/* Left side - Text content */}
            <div className="flex-1 text-center md:text-left">
              {/* Logo - small on mobile */}
              <div className="flex justify-center md:justify-start mb-6">
                <img 
                  src="/favicon/android-chrome-192x192.png?v=3" 
                  alt="Yume Tools" 
                  className="w-16 h-16 rounded-2xl shadow-lg shadow-yume-accent/20"
                />
              </div>
              
              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Yume <span className="text-yume-accent">Tools</span>
              </h1>
              
              {/* Personal statement */}
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p className="text-lg">
                  Hey, I'm <span className="text-white font-medium">y u m e</span> — a developer who builds tools,
                  plugins, and automations for fun and as a hobby.
                </p>
                <p>
                  This is my personal hub where I host a multitude of things from OSRS clan tools to personal projects
                  that make my life a little easier. Feel free to look around and if you have any suggestions, feel free to contact me at{' '}
                  <span className="inline-flex items-center gap-1 text-white font-medium align-middle">
                    <img
                      src="/icons/discord.svg"
                      alt="Discord"
                      className="w-4 h-4"
                    />
                    <span>itai_</span>
                  </span>
                  {' '}on Discord.
                </p>
              </div>
            </div>
            
            {/* Right side - GIF/Image */}
            <div className="flex-shrink-0">
              <div className="relative">
                <img 
                  src="/yume-pfp/yume_pfp.gif" 
                  alt="Yume" 
                  className="w-48 h-48 md:w-64 md:h-64 rounded-2xl shadow-2xl shadow-yume-accent/20 ring-2 ring-yume-accent/30"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access for Logged In Users */}
      {user && (
        <section className="py-12 px-4 border-t border-yume-border/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-medium text-white mb-6 text-center">Quick Access</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {(hasPermission('view_dashboard') || isAdmin) && (
                <Link
                  to="/dashboard"
                  className="px-4 py-2 rounded-full bg-yume-card border border-yume-border hover:border-yume-accent/50 text-sm text-gray-300 hover:text-white transition-all"
                >
                  📊 Dashboard
                </Link>
              )}
              {(hasPermission('view_cruddy') || isAdmin) && (
                <Link
                  to="/cruddy-panel"
                  className="px-4 py-2 rounded-full bg-yume-card border border-yume-border hover:border-yume-accent/50 text-sm text-gray-300 hover:text-white transition-all"
                >
                  ◉ Cruddy Panel
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
              <a
                href="https://ironforged-events.emuy.gg"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full bg-yume-card border border-yume-border hover:border-orange-500/50 text-sm text-gray-300 hover:text-white transition-all"
              >
                🎮 Events ↗
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Login prompt for non-logged-in users */}
      {!user && (
        <section className="py-12 px-4 border-t border-yume-border/30">
          <div className="max-w-md mx-auto text-center">
            <p className="text-gray-400 mb-4">
              Clan member? Sign in to access tools and features.
            </p>
            <button 
              onClick={login} 
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-yume-card border border-yume-border hover:border-yume-accent/50 text-gray-300 hover:text-white transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 71 55" fill="currentColor">
                <path d="M60.1 4.9A58.5 58.5 0 0045.4.4a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.5a.2.2 0 00-.2-.1 58.4 58.4 0 00-14.7 4.5.2.2 0 00-.1.1A60 60 0 00.4 44.4a.2.2 0 000 .2 58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.3 36.3 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1 58.5 58.5 0 0017.8-9 .2.2 0 000-.2c1.5-15.3-2.4-28.6-10.3-40.4a.2.2 0 00-.1-.1zM23.7 36.4c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.1-6.4 7.1zm23.6 0c-3.5 0-6.4-3.2-6.4-7.1s2.9-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.1-6.4 7.1z"/>
              </svg>
              Login with Discord
            </button>
          </div>
        </section>
      )}

      {/* External links */}
      <section className="py-8 px-4 text-center">
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
          <a 
            href="https://ironforged-events.emuy.gg" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors"
          >
            Events Portal ↗
          </a>
          <span className="text-gray-700">•</span>
          <a 
            href="https://yumes-tools.itai.gg" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors"
          >
            Carrd Widgets ↗
          </a>
        </div>
      </section>
    </div>
  );
}
