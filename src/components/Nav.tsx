import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';

// Public pages visible to everyone
const publicNavItems = [
  { to: '/', label: 'Home', icon: '⬡' },
];

// Protected pages only visible when logged in
const protectedNavItems = [
  { to: '/cruddy-panel', label: 'Cruddy Panel', icon: '◉' },
  { to: '/docs', label: 'Docs', icon: '◫' },
];

// Admin pages - only for admins
const adminNavItems = [
  { to: '/admin', label: 'Admin', icon: '⚙' },
  { to: '/devops', label: 'DevOps', icon: '🚀' },
];

export default function Nav() {
  const { user, loading, login, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Combine nav items based on auth status
  let navItems = [...publicNavItems];
  if (user) {
    navItems = [...navItems, ...protectedNavItems];
    if (isAdmin) {
      navItems = [...navItems, ...adminNavItems];
    }
  }

  return (
    <nav className="bg-yume-bg-light border-b border-yume-border">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src="/favicon/favicon.svg" 
              alt="Yume" 
              className="w-9 h-9 rounded-full"
            />
            <span className="font-semibold text-lg text-white hidden sm:inline">Yume Tools</span>
          </NavLink>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
                end={item.to === '/'}
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Right side - Search & Auth */}
          <div className="flex items-center gap-3">
            {/* Search (placeholder) */}
            <div className="hidden lg:flex items-center relative">
              <svg className="w-4 h-4 absolute left-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search..." 
                className="search-input w-48"
              />
            </div>

            {/* Auth */}
            {loading ? (
              <div className="w-9 h-9 rounded-full bg-yume-card animate-pulse" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-yume-card border border-yume-border hover:border-yume-border-accent transition-all group"
                >
                  {user.avatar ? (
                    <img
                      src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`}
                      alt=""
                      className="w-7 h-7 rounded-full"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-yume-accent flex items-center justify-center text-sm font-semibold text-yume-bg">
                      {(user.global_name || user.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-gray-300 group-hover:text-white hidden sm:inline">
                    {user.global_name || user.username || 'User'}
                  </span>
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 py-2 bg-yume-card rounded-xl border border-yume-border shadow-xl z-50">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/profile');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-yume-bg-light hover:text-white transition-colors flex items-center gap-2"
                    >
                      <span>👤</span> Profile
                    </button>
                    <div className="border-t border-yume-border my-1" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                    >
                      <span>🚪</span> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={login} 
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-yume-card border border-yume-border hover:border-yume-accent/50 transition-all text-sm text-gray-400 hover:text-white"
              >
                <svg className="w-4 h-4" viewBox="0 0 71 55" fill="currentColor">
                  <path d="M60.1 4.9A58.5 58.5 0 0045.4.4a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.5a.2.2 0 00-.2-.1 58.4 58.4 0 00-14.7 4.5.2.2 0 00-.1.1A60 60 0 00.4 44.4a.2.2 0 000 .2 58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.3 36.3 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1 58.5 58.5 0 0017.8-9 .2.2 0 000-.2c1.5-15.3-2.4-28.6-10.3-40.4a.2.2 0 00-.1-.1zM23.7 36.4c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.1-6.4 7.1zm23.6 0c-3.5 0-6.4-3.2-6.4-7.1s2.9-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.1-6.4 7.1z"/>
                </svg>
                <span className="hidden sm:inline">Login</span>
              </button>
            )}

            {/* Mobile menu button */}
            <button className="md:hidden icon-btn">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
