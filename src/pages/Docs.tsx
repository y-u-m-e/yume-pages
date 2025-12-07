import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type DocSection = 'overview' | 'react-apps' | 'widgets' | 'api' | 'architecture';

export default function Docs() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<DocSection>('overview');

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

  const sections: { id: DocSection; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'react-apps', label: 'React Apps', icon: '⚛️' },
    { id: 'widgets', label: 'Carrd Widgets', icon: '🧩' },
    { id: 'api', label: 'API Reference', icon: '📡' },
    { id: 'architecture', label: 'Architecture', icon: '🏗️' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          <span className="text-yume-accent">📚</span> Documentation
        </h1>
        <p className="text-gray-400">
          Complete guide to the Yume Tools ecosystem.
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeSection === section.id
                ? 'bg-yume-accent text-yume-bg'
                : 'bg-yume-card text-gray-400 hover:text-white border border-yume-border hover:border-yume-border-accent'
            }`}
          >
            <span className="mr-2">{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Welcome to Yume Tools</h2>
            <p className="text-gray-400 mb-4">
              Yume Tools is a suite of utilities for OSRS clan management, built with modern web technologies. 
              The ecosystem consists of three main components:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-yume-bg-light rounded-xl p-4">
                <div className="text-2xl mb-2">🌐</div>
                <h3 className="font-semibold text-white mb-1">yume-pages</h3>
                <p className="text-gray-500 text-sm">React frontend hosted on Cloudflare Pages (this site)</p>
              </div>
              <div className="bg-yume-bg-light rounded-xl p-4">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="font-semibold text-white mb-1">yume-api</h3>
                <p className="text-gray-500 text-sm">Cloudflare Worker API with D1 database</p>
              </div>
              <div className="bg-yume-bg-light rounded-xl p-4">
                <div className="text-2xl mb-2">📦</div>
                <h3 className="font-semibold text-white mb-1">yume-tools</h3>
                <p className="text-gray-500 text-sm">Vanilla JS widgets served via jsDelivr CDN</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="https://github.com/y-u-m-e"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-yume-card rounded-2xl border border-yume-border p-4 hover:border-yume-border-accent transition-colors group text-center"
            >
              <div className="text-2xl mb-2">🐙</div>
              <h3 className="font-semibold text-white group-hover:text-yume-accent text-sm">GitHub Org</h3>
            </a>
            <a
              href="https://yumes-tools.itai.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-yume-card rounded-2xl border border-yume-border p-4 hover:border-yume-border-accent transition-colors group text-center"
            >
              <div className="text-2xl mb-2">🎨</div>
              <h3 className="font-semibold text-white group-hover:text-yume-accent text-sm">Carrd Site</h3>
            </a>
            <a
              href="https://api.emuy.gg/health"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-yume-card rounded-2xl border border-yume-border p-4 hover:border-yume-border-accent transition-colors group text-center"
            >
              <div className="text-2xl mb-2">💚</div>
              <h3 className="font-semibold text-white group-hover:text-yume-accent text-sm">API Health</h3>
            </a>
            <a
              href="https://dash.cloudflare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-yume-card rounded-2xl border border-yume-border p-4 hover:border-yume-border-accent transition-colors group text-center"
            >
              <div className="text-2xl mb-2">☁️</div>
              <h3 className="font-semibold text-white group-hover:text-yume-accent text-sm">Cloudflare</h3>
            </a>
          </div>
        </div>
      )}

      {/* React Apps Section */}
      {activeSection === 'react-apps' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Cruddy Panel */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-lg">📊</div>
              <div>
                <h2 className="text-xl font-semibold text-white">Cruddy Panel</h2>
                <p className="text-gray-500 text-sm">Attendance tracking and event management</p>
              </div>
            </div>
            <div className="space-y-3 text-gray-400">
              <p><strong className="text-white">Features:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Add individual or bulk attendance records</li>
                <li>View records with search, pagination, and date filtering</li>
                <li>Group records by event with participant counts</li>
                <li>Leaderboard with date range filtering</li>
                <li>Delete records (with confirmation)</li>
              </ul>
              <p className="mt-4"><strong className="text-white">Access:</strong> Requires Discord login with Cruddy Panel permission</p>
            </div>
          </div>

          {/* Admin Panel */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-lg">⚙️</div>
              <div>
                <h2 className="text-xl font-semibold text-white">Admin Panel</h2>
                <p className="text-gray-500 text-sm">User and permission management</p>
              </div>
            </div>
            <div className="space-y-3 text-gray-400">
              <p><strong className="text-white">Features:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Add/remove users to Cruddy Panel access list</li>
                <li>Add/remove users to Docs access list</li>
                <li>Toggle permissions per user with one click</li>
                <li>View environment variable users (read-only)</li>
                <li>Application settings overview</li>
              </ul>
              <p className="mt-4"><strong className="text-white">Access:</strong> Super admin only (hardcoded admin IDs)</p>
            </div>
          </div>

          {/* DevOps Panel */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-lg">🚀</div>
              <div>
                <h2 className="text-xl font-semibold text-white">DevOps Panel</h2>
                <p className="text-gray-500 text-sm">Deployment monitoring and control</p>
              </div>
            </div>
            <div className="space-y-3 text-gray-400">
              <p><strong className="text-white">Features:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>View latest commits for all 3 repositories</li>
                <li>View recent GitHub workflow runs (yume-tools, yume-api)</li>
                <li>View Cloudflare Pages deployments (yume-pages)</li>
                <li>Trigger deployments with one click</li>
                <li>GitHub token stored securely in Worker secrets</li>
              </ul>
              <p className="mt-4"><strong className="text-white">Required Secrets:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4 font-mono text-sm">
                <li><span className="text-yume-accent">GITHUB_PAT</span> - GitHub token (repo, workflow scopes)</li>
                <li><span className="text-yume-accent">CLOUDFLARE_API_TOKEN</span> - CF token (Pages Read)</li>
                <li><span className="text-yume-accent">CLOUDFLARE_ACCOUNT_ID</span> - In wrangler.jsonc vars</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Widgets Section */}
      {activeSection === 'widgets' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6 mb-6">
            <p className="text-gray-400">
              These widgets are vanilla JavaScript components hosted on jsDelivr CDN and embedded in the 
              <a href="https://yumes-tools.itai.gg" target="_blank" rel="noopener noreferrer" className="text-yume-accent hover:underline ml-1">
                Carrd site
              </a>. They can be embedded in any HTML page.
            </p>
          </div>

          {/* Mention Maker */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-lg">💬</div>
              <div>
                <h2 className="text-xl font-semibold text-white">Mention Maker</h2>
                <p className="text-gray-500 text-sm">Generate Discord mentions from RSNs</p>
              </div>
            </div>
            <div className="space-y-3 text-gray-400">
              <p>Convert RuneScape player names to Discord mention strings. Looks up Discord IDs from a configured mapping.</p>
              <p><strong className="text-white">Usage:</strong> Enter player names (one per line or comma-separated), click Generate.</p>
            </div>
          </div>

          {/* Event Log Parser */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-lg">📋</div>
              <div>
                <h2 className="text-xl font-semibold text-white">Event Log Parser</h2>
                <p className="text-gray-500 text-sm">Extract player names from event logs</p>
              </div>
            </div>
            <div className="space-y-3 text-gray-400">
              <p>Parse clan chat logs, RuneLite loot tracker output, or plain text lists to extract player names.</p>
              <p><strong className="text-white">Supported formats:</strong> Clan chat, RuneLite loot tracker, comma/newline separated lists</p>
            </div>
          </div>

          {/* Infographic Maker */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-lg">🎨</div>
              <div>
                <h2 className="text-xl font-semibold text-white">Infographic Maker</h2>
                <p className="text-gray-500 text-sm">Create OSRS-style graphics</p>
              </div>
            </div>
            <div className="space-y-3 text-gray-400">
              <p>Drag-and-drop editor for creating event announcements, guides, and clan graphics.</p>
              <p><strong className="text-white">Features:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Text layers with RuneScape fonts</li>
                <li>Shape layers (rectangles, circles, lines)</li>
                <li>Image layers with upload support</li>
                <li>Undo/Redo (Ctrl+Z / Ctrl+Y)</li>
                <li>Export to PNG</li>
              </ul>
            </div>
          </div>

          {/* Embedding Code */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Embedding Widgets</h2>
            <p className="text-gray-400 mb-4">Add widgets to any HTML page:</p>
            <div className="bg-yume-bg rounded-xl p-4 overflow-x-auto">
              <pre className="text-sm text-gray-300">
{`<!-- Load via jsDelivr CDN -->
<div id="widget-root"></div>
<script src="https://cdn.jsdelivr.net/gh/y-u-m-e/yume-tools@main/dist/[widget]/[widget].js"></script>
<script>
  WidgetName.mount('#widget-root', { apiBase: 'https://api.emuy.gg' });
</script>

<!-- Available widgets: -->
<!-- /dist/infographic-maker/infographic-maker.js -->
<!-- /dist/msg-maker/mention-widget.js -->
<!-- /dist/log-parser/event-parser-widget.js -->
<!-- /dist/how-to/how-to.js -->
<!-- /dist/nav-bar/nav-bar.js -->`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* API Reference Section */}
      {activeSection === 'api' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Base URLs</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono rounded">PROD</span>
                <code className="text-yume-accent">https://api.emuy.gg</code>
                <span className="text-gray-500 text-sm">or https://api.itai.gg</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-mono rounded">STAGING</span>
                <code className="text-yume-accent">https://api-staging.itai.gg</code>
              </div>
            </div>
          </div>

          {/* Authentication */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">🔐 Authentication</h2>
            <div className="space-y-3">
              <ApiEndpoint method="GET" path="/auth/login" desc="Redirect to Discord OAuth. Pass ?return_url= for redirect after login." />
              <ApiEndpoint method="GET" path="/auth/callback" desc="Discord OAuth callback (internal)." />
              <ApiEndpoint method="GET" path="/auth/me" desc="Get current user info and permissions." />
              <ApiEndpoint method="GET" path="/auth/logout" desc="Clear session and redirect to return_url." />
            </div>
          </div>

          {/* Attendance */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">📊 Attendance Records</h2>
            <div className="space-y-3">
              <ApiEndpoint method="GET" path="/attendance/records" desc="Fetch records. Query: ?page=&limit=&search=&start_date=&end_date=" />
              <ApiEndpoint method="POST" path="/attendance/records" desc="Add record. Body: { name, event, date }" />
              <ApiEndpoint method="DELETE" path="/attendance/records/:id" desc="Delete a record by ID." />
              <ApiEndpoint method="GET" path="/attendance" desc="Get analytics: events list, leaderboard, totals." />
            </div>
          </div>

          {/* Admin */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">👤 Admin (Super Admin Only)</h2>
            <div className="space-y-3">
              <ApiEndpoint method="GET" path="/admin/users" desc="Get all allowed users from DB + env vars." />
              <ApiEndpoint method="POST" path="/admin/users" desc="Add/update user. Body: { discord_id, username?, access_cruddy, access_docs }" />
              <ApiEndpoint method="DELETE" path="/admin/users/:discord_id" desc="Remove a user from DB." />
              <ApiEndpoint method="GET" path="/admin/secrets" desc="Get GitHub PAT and CF Account ID for DevOps panel." />
              <ApiEndpoint method="GET" path="/admin/cf-deployments" desc="Get Cloudflare Pages deployments. Query: ?project=yume-pages" />
            </div>
          </div>

          {/* CDN Proxy */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">📦 CDN Proxy</h2>
            <div className="space-y-3">
              <ApiEndpoint method="GET" path="/cdn/:filename" desc="Proxy to jsDelivr with SHA versioning from env vars." />
            </div>
            <p className="text-gray-500 text-sm mt-4">
              Files are proxied from jsDelivr with specific SHAs configured in <code className="text-yume-accent">wrangler.jsonc</code> (e.g., SHA_NAV_BAR, SHA_HOW_TO).
            </p>
          </div>
        </div>
      )}

      {/* Architecture Section */}
      {activeSection === 'architecture' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">System Architecture</h2>
            <div className="bg-yume-bg rounded-xl p-4 font-mono text-sm text-gray-300 overflow-x-auto">
              <pre>{`
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                          │
├─────────────────────────────┬───────────────────────────────────┤
│     emuy.gg (React SPA)     │    yumes-tools.itai.gg (Carrd)   │
│  ┌─────────────────────┐    │    ┌─────────────────────────┐   │
│  │  • Home             │    │    │  • Mention Maker        │   │
│  │  • Cruddy Panel     │    │    │  • Event Log Parser     │   │
│  │  • Admin Panel      │    │    │  • Infographic Maker    │   │
│  │  • DevOps Panel     │    │    │  • How To Guide         │   │
│  │  • Docs             │    │    └─────────────────────────┘   │
│  └─────────────────────┘    │              ↓                    │
│           ↓                 │    ┌─────────────────────────┐   │
│  Cloudflare Pages           │    │ jsDelivr CDN (widgets)  │   │
│  (auto-deploy on push)      │    │ y-u-m-e/yume-tools@SHA  │   │
└─────────────────────────────┴───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    api.emuy.gg (Cloudflare Worker)              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Auth (OAuth) │  │ Attendance   │  │ Admin Endpoints    │    │
│  │ Discord API  │  │ CRUD API     │  │ User management    │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
│                              ↓                                   │
│                    ┌─────────────────┐                          │
│                    │   D1 Database   │                          │
│                    │ (SQLite edge)   │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘

DEPLOYMENT FLOW:
───────────────────────────────────────────────────────────────────
yume-pages → push to main → Cloudflare Pages auto-build → emuy.gg
yume-api   → push to main → GitHub Action → wrangler deploy
yume-tools → push to main → jsDelivr CDN (update SHAs in yume-api)
`}</pre>
            </div>
          </div>

          {/* Environment Variables */}
          <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Worker Environment Variables</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-yume-border">
                    <th className="pb-2 text-gray-400 font-medium">Variable</th>
                    <th className="pb-2 text-gray-400 font-medium">Type</th>
                    <th className="pb-2 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-yume-border/50">
                    <td className="py-2 font-mono text-yume-accent">DISCORD_CLIENT_ID</td>
                    <td className="py-2">var</td>
                    <td className="py-2 text-gray-500">Discord OAuth app ID</td>
                  </tr>
                  <tr className="border-b border-yume-border/50">
                    <td className="py-2 font-mono text-yume-accent">DISCORD_CLIENT_SECRET</td>
                    <td className="py-2">secret</td>
                    <td className="py-2 text-gray-500">Discord OAuth secret</td>
                  </tr>
                  <tr className="border-b border-yume-border/50">
                    <td className="py-2 font-mono text-yume-accent">GITHUB_PAT</td>
                    <td className="py-2">secret</td>
                    <td className="py-2 text-gray-500">GitHub token for DevOps</td>
                  </tr>
                  <tr className="border-b border-yume-border/50">
                    <td className="py-2 font-mono text-yume-accent">CLOUDFLARE_API_TOKEN</td>
                    <td className="py-2">secret</td>
                    <td className="py-2 text-gray-500">CF token for Pages API</td>
                  </tr>
                  <tr className="border-b border-yume-border/50">
                    <td className="py-2 font-mono text-yume-accent">CLOUDFLARE_ACCOUNT_ID</td>
                    <td className="py-2">var</td>
                    <td className="py-2 text-gray-500">CF account ID</td>
                  </tr>
                  <tr className="border-b border-yume-border/50">
                    <td className="py-2 font-mono text-yume-accent">ALLOWED_USER_IDS_*</td>
                    <td className="py-2">var</td>
                    <td className="py-2 text-gray-500">Comma-separated Discord IDs</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-yume-accent">SHA_*</td>
                    <td className="py-2">var</td>
                    <td className="py-2 text-gray-500">Git SHAs for CDN widget versioning</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApiEndpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-500/20 text-emerald-400',
    POST: 'bg-blue-500/20 text-blue-400',
    DELETE: 'bg-red-500/20 text-red-400',
    PUT: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="bg-yume-bg-light rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={`px-2 py-0.5 ${colors[method] || 'bg-gray-500/20 text-gray-400'} text-xs font-mono rounded`}>
          {method}
        </span>
        <code className="text-yume-accent text-sm">{path}</code>
      </div>
      <p className="text-gray-500 text-sm">{desc}</p>
    </div>
  );
}
