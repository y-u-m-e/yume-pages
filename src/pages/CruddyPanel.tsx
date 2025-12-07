import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function CruddyPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, loading, login } = useAuth();

  useEffect(() => {
    if (!user || loading) return;

    // Load the existing cruddy panel widget
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/y-u-m-e/yume-tools@main/dist/cruddy-panel/cruddy-panel.js';
    script.onload = () => {
      // @ts-expect-error - CruddyPanel is loaded from external script
      if (window.CruddyPanel && containerRef.current) {
        // @ts-expect-error - CruddyPanel is loaded from external script
        window.CruddyPanel.mount(containerRef.current, {
          apiBase: 'https://api.emuy.gg'
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="glass-panel p-8">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-white mb-2">Authentication Required</h2>
          <p className="text-slate-400 mb-6">
            Please log in with Discord to access the Cruddy Panel.
          </p>
          <button onClick={login} className="btn-primary">
            🎮 Login with Discord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-yume-teal mb-2">📊 Cruddy Panel</h1>
        <p className="text-slate-400">
          Track clan event attendance, view leaderboards, and manage records.
        </p>
      </div>
      
      {/* Container for the cruddy panel widget */}
      <div ref={containerRef} id="cruddy-panel-root" className="w-full" />
    </div>
  );
}

