import { Outlet } from 'react-router-dom';
import Nav from './Nav';
import { VERSION } from '@/version';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-yume-bg">
      <Nav />
      
      <main className="flex-1 px-4 sm:px-6 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      <footer className="border-t border-yume-border py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-gray-500">
          <span>© 2024 Yume Tools</span>
          <span>v{VERSION}</span>
        </div>
      </footer>
    </div>
  );
}
