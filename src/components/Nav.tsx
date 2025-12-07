import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/infographic-maker', label: 'Infographic Maker', icon: '🎨' },
  { to: '/cruddy-panel', label: 'Cruddy Panel', icon: '📊' },
  { to: '/docs', label: 'Docs', icon: '📚' },
];

export default function Nav() {
  const { user, loading, login, logout } = useAuth();

  return (
    <nav className="glass-panel-dark mx-4 mt-4 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌙</span>
          <span className="font-semibold text-lg text-yume-teal">Yume Tools</span>
        </div>

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

        {/* Auth */}
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-slate-400 text-sm">Loading...</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {user.avatar && (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm text-slate-300">
                  {user.global_name || user.username}
                </span>
              </div>
              <button onClick={logout} className="btn-secondary text-sm">
                Logout
              </button>
            </div>
          ) : (
            <button onClick={login} className="btn-primary text-sm">
              🎮 Login with Discord
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

