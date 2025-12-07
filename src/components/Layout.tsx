import { Outlet } from 'react-router-dom';
import Nav from './Nav';
import { VERSION, BUILD_DATE } from '@/version';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="py-4 text-center text-slate-500 text-sm">
        <p>© 2024 Yume Tools • Built for the OSRS community</p>
        <p className="text-xs mt-1 text-slate-600">v{VERSION} • {new Date(BUILD_DATE).toLocaleDateString()}</p>
      </footer>
    </div>
  );
}

