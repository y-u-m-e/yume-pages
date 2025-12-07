import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function CruddyPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || loading) return;

    // Load the existing cruddy panel widget (use specific SHA to bust cache)
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/y-u-m-e/yume-tools@b292e3f/dist/cruddy-panel/cruddy-panel.js';
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

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-yume-teal border-t-transparent rounded-full animate-spin" />
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

