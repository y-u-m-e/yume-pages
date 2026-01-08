/**
 * =============================================================================
 * EVENTS LAYOUT - Ironforged Events Site Layout
 * =============================================================================
 * 
 * Dedicated layout for the events subdomain.
 * Simpler than the main Layout - focused on event participation.
 * 
 * Features:
 * - Ironforged branding
 * - User authentication status
 * - Event navigation
 * - Clean, focused design
 */

import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function EventsLayout() {
  const { user, loading, login, logout, isEventsAdmin, hasPermission } = useAuth();
  const location = useLocation();
  
  // Check if we're on the home page
  const isHome = location.pathname === '/';
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-yume-bg flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-yume-bg/95 backdrop-blur-sm border-b border-yume-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo/Brand */}
          <Link 
            to="/" 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img 
              src="/ironforged-icon.gif" 
              alt="Ironforged" 
              className="w-10 h-10 rounded-xl shadow-lg shadow-orange-500/30"
            />
            <div>
              <span className="text-lg font-bold text-white">Ironforged</span>
              <span className="text-lg font-light text-orange-400 ml-1">Events</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-4">
            {user && !isHome && (
              <Link 
                to="/events" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                All Events
              </Link>
            )}
            
            {/* User Guide - for event participants */}
            {user && hasPermission('view_events_guide') && (
              <Link 
                to="/guide" 
                className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <span>📖</span>
                <span className="hidden sm:inline">How-To/Guide</span>
              </Link>
            )}
            
            {/* Admin Guide - for event admins */}
            {user && hasPermission('view_events_admin_guide') && (
              <Link 
                to="/admin/guide" 
                className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <span>📋</span>
                <span className="hidden sm:inline">Admin Guide</span>
              </Link>
            )}
            
            {/* Admin Link - only show if user has events permission */}
            {user && isEventsAdmin && !isAdminPage && (
              <Link 
                to="/admin" 
                className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 transition-colors text-sm font-medium"
              >
                <span>⚙️</span>
                Admin
              </Link>
            )}
            
            {/* Back to events from admin */}
            {user && isAdminPage && (
              <Link 
                to="/events" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                ← Back to Events
              </Link>
            )}
            
            {/* Auth Section */}
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-yume-card animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                {/* User Avatar & Name */}
                <div className="flex items-center gap-2">
                  {user.avatar ? (
                    <img 
                      src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`}
                      alt={user.username}
                      className="w-8 h-8 rounded-full ring-2 ring-orange-500/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-medium">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-white text-sm font-medium hidden sm:block">
                    {user.global_name || user.username}
                  </span>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-medium transition-colors text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
                </svg>
                <span className="hidden sm:inline">Login with Discord</span>
                <span className="sm:hidden">Login</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-yume-border py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <img src="/ironforged-icon.gif" alt="" className="w-5 h-5" />
            <span>Ironforged Clan Events</span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://discord.gg/ironforged" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-300 transition-colors"
            >
              Join Discord
            </a>
            <span className="text-gray-700">•</span>
            <a 
              href="https://emuy.gg" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-300 transition-colors"
            >
              Yume Tools
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

