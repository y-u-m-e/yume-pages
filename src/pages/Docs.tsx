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
        <div className="w-8 h-8 border-2 border-yume-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          <span className="text-yume-accent">◫</span> Documentation
        </h1>
        <p className="text-gray-400">
          API reference and guides for Yume Tools.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <a
          href="https://api.emuy.gg/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-yume-card rounded-2xl border border-yume-border p-6 hover:border-yume-border-accent transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-yume-bg-light flex items-center justify-center text-lg">
              📖
            </div>
            <h3 className="font-semibold text-white group-hover:text-yume-accent transition-colors">
              Full Documentation
            </h3>
          </div>
          <p className="text-gray-500 text-sm">
            Complete API reference hosted on the API server.
          </p>
        </a>

        <a
          href="https://github.com/y-u-m-e/yume-tools"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-yume-card rounded-2xl border border-yume-border p-6 hover:border-yume-border-accent transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-yume-bg-light flex items-center justify-center text-lg">
              🐙
            </div>
            <h3 className="font-semibold text-white group-hover:text-yume-accent transition-colors">
              GitHub Repository
            </h3>
          </div>
          <p className="text-gray-500 text-sm">
            Source code and widget implementations.
          </p>
        </a>
      </div>

      {/* API Overview */}
      <div className="bg-yume-card rounded-2xl border border-yume-border p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">API Endpoints</h2>
        
        <div className="space-y-3">
          {[
            { method: 'GET', color: 'emerald', path: '/api/records', desc: 'Fetch attendance records with pagination and date filters.' },
            { method: 'POST', color: 'blue', path: '/api/records', desc: 'Add a new attendance record.' },
            { method: 'DELETE', color: 'red', path: '/api/records/:id', desc: 'Delete an attendance record by ID.' },
            { method: 'GET', color: 'emerald', path: '/api/records/events', desc: 'Get records grouped by event.' },
            { method: 'GET', color: 'emerald', path: '/api/records/leaderboard', desc: 'Get player attendance leaderboard.' },
          ].map((endpoint) => (
            <div key={`${endpoint.method}-${endpoint.path}`} className="bg-yume-bg-light rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 bg-${endpoint.color}-500/20 text-${endpoint.color}-400 text-xs font-mono rounded`}>
                  {endpoint.method}
                </span>
                <code className="text-yume-accent text-sm">{endpoint.path}</code>
              </div>
              <p className="text-gray-500 text-sm">{endpoint.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Widget Usage */}
      <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Widget Embedding</h2>
        <p className="text-gray-400 mb-4">
          You can embed the widgets in any HTML page using a simple script tag:
        </p>
        
        <div className="bg-yume-bg rounded-xl p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300">
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
  CruddyPanel.mount('#cruddy-panel-root', { apiBase: 'https://api.emuy.gg' });
</script>`}
          </pre>
        </div>
      </div>
    </div>
  );
}
