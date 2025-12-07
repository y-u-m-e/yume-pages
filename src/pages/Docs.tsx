import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Docs() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-yume-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-yume-teal mb-2">📚 Documentation</h1>
        <p className="text-slate-400">
          API reference and guides for Yume Tools.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <a
          href="https://api.emuy.io/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="glass-panel p-6 hover:border-yume-teal/50 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📖</span>
            <h3 className="font-semibold text-white group-hover:text-yume-teal transition-colors">
              Full Documentation
            </h3>
          </div>
          <p className="text-slate-400 text-sm">
            Complete API reference hosted on the API server.
          </p>
        </a>

        <a
          href="https://github.com/y-u-m-e/yume-tools"
          target="_blank"
          rel="noopener noreferrer"
          className="glass-panel p-6 hover:border-yume-teal/50 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🐙</span>
            <h3 className="font-semibold text-white group-hover:text-yume-teal transition-colors">
              GitHub Repository
            </h3>
          </div>
          <p className="text-slate-400 text-sm">
            Source code and widget implementations.
          </p>
        </a>
      </div>

      {/* API Overview */}
      <div className="glass-panel p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">🔌 API Endpoints</h2>
        
        <div className="space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-mono rounded">GET</span>
              <code className="text-yume-teal">/api/records</code>
            </div>
            <p className="text-slate-400 text-sm">Fetch attendance records with pagination and date filters.</p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-mono rounded">POST</span>
              <code className="text-yume-teal">/api/records</code>
            </div>
            <p className="text-slate-400 text-sm">Add a new attendance record.</p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-mono rounded">DELETE</span>
              <code className="text-yume-teal">/api/records/:id</code>
            </div>
            <p className="text-slate-400 text-sm">Delete an attendance record by ID.</p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-mono rounded">GET</span>
              <code className="text-yume-teal">/api/records/events</code>
            </div>
            <p className="text-slate-400 text-sm">Get records grouped by event.</p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-mono rounded">GET</span>
              <code className="text-yume-teal">/api/records/leaderboard</code>
            </div>
            <p className="text-slate-400 text-sm">Get player attendance leaderboard.</p>
          </div>
        </div>
      </div>

      {/* Widget Usage */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">📦 Widget Embedding</h2>
        <p className="text-slate-400 mb-4">
          You can embed the widgets in any HTML page using a simple script tag:
        </p>
        
        <div className="bg-slate-900/50 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-slate-300">
{`<!-- Infographic Maker -->
<div id="infographic-root"></div>
<script src="https://cdn.jsdelivr.net/gh/y-u-m-e/yume-tools@main/dist/infographic-maker/infographic-maker.js"></script>
<script>
  InfographicMaker.mount('#infographic-root');
</script>

<!-- Cruddy Panel -->
<div id="cruddy-panel-root"></div>
<script src="https://cdn.jsdelivr.net/gh/y-u-m-e/yume-tools@main/dist/cruddy-panel/cruddy-panel.js"></script>
<script>
  CruddyPanel.mount('#cruddy-panel-root', { apiBase: 'https://api.itai.gg' });
</script>`}
          </pre>
        </div>
      </div>
    </div>
  );
}

