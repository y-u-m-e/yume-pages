import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Public pages visible to everyone
const publicNavItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/infographic-maker', label: 'Infographic Maker', icon: '🎨' },
];

// Protected pages only visible when logged in
const protectedNavItems = [
  { to: '/cruddy-panel', label: 'Cruddy Panel', icon: '📊' },
  { to: '/docs', label: 'Docs', icon: '📚' },
];

export default function Nav() {
  const { user, loading, login, logout } = useAuth();
  
  // Combine nav items based on auth status
  const navItems = user 
    ? [...publicNavItems, ...protectedNavItems]
    : publicNavItems;

  return (
    <nav className="glass-panel-dark mx-4 mt-4 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="text-2xl">🌙</span>
          <span className="font-semibold text-lg text-yume-teal">Yume Tools</span>
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
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Auth - Subtle corner button */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={logout}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 hover:bg-slate-700/50 transition-colors group"
                title="Click to logout"
              >
                {user.avatar ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`}
                    alt=""
                    className="w-7 h-7 rounded-full ring-2 ring-yume-teal/30"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-yume-teal/20 flex items-center justify-center text-sm">
                    {(user.global_name || user.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-slate-300 group-hover:text-white hidden sm:inline">
                  {user.global_name || user.username || 'User'}
                </span>
              </button>
            </div>
          ) : (
            <button 
              onClick={login} 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-yume-teal/50 transition-all text-sm text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4" viewBox="0 0 71 55" fill="currentColor">
                <path d="M60.1 4.9A58.5 58.5 0 0045.4.4a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.5a.2.2 0 00-.2-.1 58.4 58.4 0 00-14.7 4.5.2.2 0 00-.1.1A60 60 0 00.4 44.4a.2.2 0 000 .2 58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.3 36.3 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1 58.5 58.5 0 0017.8-9 .2.2 0 000-.2c1.5-15.3-2.4-28.6-10.3-40.4a.2.2 0 00-.1-.1zM23.7 36.4c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.1-6.4 7.1zm23.6 0c-3.5 0-6.4-3.2-6.4-7.1s2.9-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.1-6.4 7.1z"/>
              </svg>
              <span className="hidden sm:inline">Login</span>
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden p-2 text-slate-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

