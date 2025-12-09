import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface RepoStatus {
  name: string;
  displayName: string;
  description: string;
  lastCommit?: {
    sha: string;
    message: string;
    date: string;
    author: string;
  };
  workflows?: WorkflowRun[];
  productionSha?: string;
  loading: boolean;
  error?: string;
}

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}

interface Workflow {
  id: number;
  name: string;
  path: string;
}

interface CFDeployment {
  id: string;
  url: string;
  environment: string;
  status: string;
  created_at: string;
  source: {
    type: string;
    branch: string;
    commit_hash: string;
    commit_message: string;
  };
}

const REPOS = [
  { 
    name: 'yume-tools', 
    displayName: '📦 Widgets (yume-tools)',
    description: 'CDN widgets: nav-bar, how-to, infographic-maker, etc.'
  },
  { 
    name: 'yume-api', 
    displayName: '⚡ API Worker (yume-api)',
    description: 'Cloudflare Worker API backend'
  },
  { 
    name: 'yume-pages', 
    displayName: '🌐 Frontend (yume-pages)',
    description: 'React frontend on Cloudflare Pages'
  },
];

const GITHUB_ORG = 'y-u-m-e';
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

export default function DevOps() {
  const { user, loading: authLoading } = useAuth();
  const [repos, setRepos] = useState<RepoStatus[]>(
    REPOS.map(r => ({ ...r, loading: true }))
  );
  const [githubToken, setGithubToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [tokenSource, setTokenSource] = useState<'server' | 'local' | null>(null);
  const [triggeringWorkflow, setTriggeringWorkflow] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Record<string, Workflow[]>>({});
  const [loadingSecrets, setLoadingSecrets] = useState(true);
  const [cfDeployments, setCfDeployments] = useState<CFDeployment[]>([]);
  const [expandedWorkflows, setExpandedWorkflows] = useState<Record<string, boolean>>({});
  const [heartbeatStatus, setHeartbeatStatus] = useState<Record<string, { status: string; lastPing: string; source: string }>>({});
  const [pingingCarrd, setPingingCarrd] = useState(false);

  // Try to load token from server first, then localStorage
  useEffect(() => {
    const loadToken = async () => {
      setLoadingSecrets(true);
      
      // Try server first
      try {
        const res = await fetch(`${API_BASE}/admin/secrets`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.github_pat) {
            setGithubToken(data.github_pat);
            setTokenSaved(true);
            setTokenSource('server');
            setLoadingSecrets(false);
            return;
          }
        }
      } catch {
        // Server token not available
      }
      
      // Fallback to localStorage
      const saved = localStorage.getItem('github_pat');
      if (saved) {
        setGithubToken(saved);
        setTokenSaved(true);
        setTokenSource('local');
      }
      setLoadingSecrets(false);
    };
    
    if (user) {
      loadToken();
    } else {
      setLoadingSecrets(false);
    }
  }, [user]);

  // Fetch repo data when token is available
  useEffect(() => {
    if (tokenSaved && githubToken) {
      fetchAllRepoData();
      fetchWorkflows();
      fetchCFDeployments();
    }
  }, [tokenSaved, githubToken]);

  // Fetch heartbeat status on mount and periodically
  useEffect(() => {
    fetchHeartbeatStatus();
    const interval = setInterval(fetchHeartbeatStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Fetch Cloudflare Pages deployments
  const fetchCFDeployments = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/cf-deployments?project=yume-pages`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setCfDeployments(data.deployments || []);
      }
    } catch {
      // Ignore errors - CF deployments are optional
    }
  };

  // Fetch widget heartbeat status
  const fetchHeartbeatStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/widget/status`);
      if (res.ok) {
        const data = await res.json();
        setHeartbeatStatus(data.widgets || {});
      }
    } catch {
      // Ignore errors
    }
  };

  // Ping Carrd page to trigger widget heartbeats
  const pingCarrdWidgets = async () => {
    setPingingCarrd(true);
    
    // Open Carrd page in a popup window
    const popup = window.open(
      'https://yumes-tools.itai.gg',
      'carrd_ping',
      'width=800,height=600,left=100,top=100'
    );
    
    // Wait for widgets to load and send heartbeats
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Close the popup
    if (popup && !popup.closed) {
      popup.close();
    }
    
    // Refresh heartbeat status
    await fetchHeartbeatStatus();
    setPingingCarrd(false);
  };

  const saveToken = () => {
    localStorage.setItem('github_pat', githubToken);
    setTokenSaved(true);
  };

  const clearToken = () => {
    localStorage.removeItem('github_pat');
    setGithubToken('');
    setTokenSaved(false);
  };

  const fetchAllRepoData = async () => {
    for (const repo of REPOS) {
      await fetchRepoData(repo.name);
    }
  };

  const fetchRepoData = async (repoName: string) => {
    setRepos(prev => prev.map(r => 
      r.name === repoName ? { ...r, loading: true, error: undefined } : r
    ));

    try {
      // Fetch latest commit
      const commitRes = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/commits/main`,
        { headers: { Authorization: `Bearer ${githubToken}` } }
      );
      
      if (!commitRes.ok) throw new Error('Failed to fetch commits');
      const commitData = await commitRes.json();

      // Fetch recent workflow runs
      const workflowRes = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/actions/runs?per_page=5`,
        { headers: { Authorization: `Bearer ${githubToken}` } }
      );
      
      let workflowRuns: WorkflowRun[] = [];
      if (workflowRes.ok) {
        const workflowData = await workflowRes.json();
        workflowRuns = workflowData.workflow_runs || [];
      }

      setRepos(prev => prev.map(r => 
        r.name === repoName ? {
          ...r,
          loading: false,
          lastCommit: {
            sha: commitData.sha.substring(0, 7),
            message: commitData.commit.message.split('\n')[0],
            date: new Date(commitData.commit.author.date).toLocaleString(),
            author: commitData.commit.author.name,
          },
          workflows: workflowRuns,
        } : r
      ));
    } catch (error) {
      setRepos(prev => prev.map(r => 
        r.name === repoName ? { ...r, loading: false, error: 'Failed to fetch' } : r
      ));
    }
  };

  const fetchWorkflows = async () => {
    const allWorkflows: Record<string, Workflow[]> = {};
    
    for (const repo of REPOS) {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_ORG}/${repo.name}/actions/workflows`,
          { headers: { Authorization: `Bearer ${githubToken}` } }
        );
        if (res.ok) {
          const data = await res.json();
          allWorkflows[repo.name] = data.workflows || [];
        }
      } catch {
        // Ignore errors
      }
    }
    
    setWorkflows(allWorkflows);
  };

  const triggerWorkflow = async (repoName: string, workflowId: number, inputs?: Record<string, string>) => {
    setTriggeringWorkflow(`${repoName}-${workflowId}`);
    
    try {
      const body: any = { ref: 'main' };
      if (inputs) body.inputs = inputs;

      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/actions/workflows/${workflowId}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (res.status === 204) {
        // Success - wait a bit then refresh
        setTimeout(() => {
          fetchRepoData(repoName);
          setTriggeringWorkflow(null);
        }, 2000);
      } else {
        throw new Error('Failed to trigger workflow');
      }
    } catch (error) {
      alert('Failed to trigger workflow. Make sure your token has workflow permissions.');
      setTriggeringWorkflow(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-yume-mint border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Only allow admin
  if (user.id !== '166201366228762624') {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <h1 className="text-3xl font-bold text-yume-mint mb-4">🚫 Access Denied</h1>
        <p className="text-slate-400">You do not have permission to view the DevOps Panel.</p>
      </div>
    );
  }

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'in_progress' || status === 'queued') return 'text-yellow-400';
    if (conclusion === 'success') return 'text-green-400';
    if (conclusion === 'failure') return 'text-red-400';
    return 'text-slate-400';
  };

  const getStatusIcon = (status: string, conclusion: string | null) => {
    if (status === 'in_progress') return '🔄';
    if (status === 'queued') return '⏳';
    if (conclusion === 'success') return '✅';
    if (conclusion === 'failure') return '❌';
    if (conclusion === 'cancelled') return '⛔';
    return '⚪';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-yume-mint mb-2">🚀 DevOps Control Panel</h1>
        <p className="text-slate-400">Monitor and control deployments across all repositories.</p>
      </div>

      {/* GitHub Token Setup */}
      {loadingSecrets ? (
        <div className="glass-panel p-6 mb-8 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-yume-mint border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400">Loading configuration...</span>
        </div>
      ) : !tokenSaved ? (
        <div className="glass-panel p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">🔑 GitHub Token Required</h2>
          <p className="text-slate-400 text-sm mb-4">
            No server token configured. Enter a GitHub PAT manually, or add <code className="text-yume-mint">GITHUB_PAT</code> to Worker secrets.
            <br />
            Required scopes: <code className="text-yume-mint">repo</code>, <code className="text-yume-mint">workflow</code>
          </p>
          <div className="flex gap-3">
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yume-mint text-white"
            />
            <button onClick={saveToken} className="btn-primary">
              Save Locally
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-2">
            Token will be stored in your browser. For persistent storage, run: <code className="text-yume-mint">npx wrangler secret put GITHUB_PAT</code>
          </p>
        </div>
      ) : (
        <div className="flex justify-between items-center mb-6">
          <span className="text-green-400 text-sm">
            ✅ GitHub token configured 
            <span className="text-slate-500 ml-2">
              ({tokenSource === 'server' ? '🔒 from server' : '💾 from browser'})
            </span>
          </span>
          <div className="flex gap-3">
            <button 
              onClick={() => { fetchAllRepoData(); fetchCFDeployments(); }} 
              className="btn-secondary text-sm"
            >
              🔄 Refresh All
            </button>
            {tokenSource === 'local' && (
              <button 
                onClick={clearToken} 
                className="text-slate-400 hover:text-red-400 text-sm"
              >
                Clear Token
              </button>
            )}
          </div>
        </div>
      )}

      {/* Repo Cards */}
      {tokenSaved && (
        <div className="space-y-6">
          {repos.map((repo) => (
            <div key={repo.name} className="glass-panel p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">{repo.displayName}</h2>
                  <p className="text-slate-400 text-sm">{repo.description}</p>
                </div>
                <a
                  href={`https://github.com/${GITHUB_ORG}/${repo.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-yume-mint text-sm"
                >
                  View on GitHub →
                </a>
              </div>

              {repo.loading ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              ) : repo.error ? (
                <p className="text-red-400">{repo.error}</p>
              ) : (
                <>
                  {/* Latest Commit */}
                  {repo.lastCommit && (
                    <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-yume-mint font-mono text-sm">{repo.lastCommit.sha}</span>
                          <span className="text-slate-500 mx-2">•</span>
                          <span className="text-slate-300">{repo.lastCommit.message}</span>
                        </div>
                        <span className="text-slate-500 text-sm">{repo.lastCommit.date}</span>
                      </div>
                      <p className="text-slate-500 text-sm mt-1">by {repo.lastCommit.author}</p>
                    </div>
                  )}

                  {/* Recent Workflow Runs (for non-Pages repos) */}
                  {repo.name !== 'yume-pages' && repo.workflows && repo.workflows.length > 0 && (
                    <div className="mb-4">
                      <button 
                        onClick={() => setExpandedWorkflows(prev => ({ ...prev, [repo.name]: !prev[repo.name] }))}
                        className="flex items-center justify-between w-full text-left mb-2 group"
                      >
                        <h3 className="text-sm font-medium text-slate-400 group-hover:text-slate-300">
                          <span className={`inline-block transition-transform mr-1 ${expandedWorkflows[repo.name] ? 'rotate-90' : ''}`}>▶</span>
                          Recent Workflows ({repo.workflows.length})
                        </h3>
                      </button>
                      {expandedWorkflows[repo.name] && (
                        <div className="space-y-2 animate-fadeIn">
                          {repo.workflows.slice(0, 3).map((run) => (
                            <a
                              key={run.id}
                              href={run.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between bg-slate-800/30 rounded-lg p-3 hover:bg-slate-800/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span>{getStatusIcon(run.status, run.conclusion)}</span>
                                <span className={`text-sm ${getStatusColor(run.status, run.conclusion)}`}>
                                  {run.name}
                                </span>
                              </div>
                              <span className="text-slate-500 text-xs">
                                {new Date(run.created_at).toLocaleString()}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cloudflare Pages Deployments (for yume-pages) */}
                  {repo.name === 'yume-pages' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <button 
                          onClick={() => setExpandedWorkflows(prev => ({ ...prev, 'yume-pages': !prev['yume-pages'] }))}
                          className="flex items-center text-left group"
                        >
                          <h3 className="text-sm font-medium text-slate-400 group-hover:text-slate-300">
                            <span className={`inline-block transition-transform mr-1 ${expandedWorkflows['yume-pages'] ? 'rotate-90' : ''}`}>▶</span>
                            ☁️ Recent Deployments ({cfDeployments.length})
                          </h3>
                        </button>
                        <button 
                          onClick={fetchCFDeployments}
                          className="text-slate-500 hover:text-yume-mint text-xs"
                        >
                          🔄 Refresh
                        </button>
                      </div>
                      {expandedWorkflows['yume-pages'] && (
                        cfDeployments.length > 0 ? (
                          <div className="space-y-2 animate-fadeIn">
                            {cfDeployments.slice(0, 3).map((deploy) => (
                              <a
                                key={deploy.id}
                                href={deploy.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between bg-slate-800/30 rounded-lg p-3 hover:bg-slate-800/50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span>{deploy.status === 'success' ? '✅' : deploy.status === 'failure' ? '❌' : '🔄'}</span>
                                  <span className={`text-sm ${deploy.status === 'success' ? 'text-green-400' : deploy.status === 'failure' ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {deploy.source?.commit_message || 'Deployment'}
                                  </span>
                                  <span className="text-slate-500 text-xs font-mono">
                                    {deploy.source?.commit_hash}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-slate-500 text-xs block">
                                    {new Date(deploy.created_at).toLocaleString()}
                                  </span>
                                  <span className="text-xs text-yume-mint">
                                    {deploy.environment}
                                  </span>
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm italic animate-fadeIn">No deployments found or CF API token not configured</p>
                        )
                      )}
                    </div>
                  )}

                  {/* Workflow Triggers */}
                  {workflows[repo.name] && workflows[repo.name].length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2">Actions</h3>
                      <div className="flex flex-wrap gap-2">
                        {repo.name === 'yume-tools' && (
                          <>
                            <button
                              onClick={() => {
                                const workflow = workflows[repo.name]?.find(w => w.name === 'Widget CI/CD');
                                if (workflow) {
                                  triggerWorkflow(repo.name, workflow.id, { action: 'promote-to-production' });
                                }
                              }}
                              disabled={triggeringWorkflow !== null}
                              className="btn-primary text-sm"
                            >
                              {triggeringWorkflow === `${repo.name}-promote` ? '🔄 Promoting...' : '🚀 Promote to Production'}
                            </button>
                          </>
                        )}
                        {repo.name === 'yume-api' && (
                          <>
                            <button
                              onClick={() => {
                                const workflow = workflows[repo.name]?.find(w => w.name === 'Deploy Worker');
                                if (workflow) {
                                  triggerWorkflow(repo.name, workflow.id, { environment: 'staging' });
                                }
                              }}
                              disabled={triggeringWorkflow !== null}
                              className="btn-secondary text-sm"
                            >
                              🧪 Deploy Staging
                            </button>
                            <button
                              onClick={() => {
                                const workflow = workflows[repo.name]?.find(w => w.name === 'Deploy Worker');
                                if (workflow) {
                                  triggerWorkflow(repo.name, workflow.id, { environment: 'production' });
                                }
                              }}
                              disabled={triggeringWorkflow !== null}
                              className="btn-primary text-sm"
                            >
                              🚀 Deploy Production
                            </button>
                          </>
                        )}
                        {repo.name === 'yume-pages' && (
                          <span className="text-slate-500 text-sm italic">
                            Auto-deploys on push to main
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Widget Heartbeats */}
      <div className="glass-panel p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">💓 Widget Heartbeats</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHeartbeatStatus}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={pingCarrdWidgets}
              disabled={pingingCarrd}
              className="bg-yume-accent hover:bg-yume-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              {pingingCarrd ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Pinging...
                </>
              ) : (
                <>
                  🌐 Ping Carrd Widgets
                </>
              )}
            </button>
          </div>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Opens the Carrd page briefly to trigger widget heartbeats. This refreshes the "Last seen" timestamps on the Home page.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'mention-maker', name: 'Mention Maker', icon: '@' },
            { key: 'event-parser', name: 'Event Parser', icon: '📋' },
            { key: 'infographic-maker', name: 'Infographic Maker', icon: '🖼️' },
          ].map(widget => {
            const hb = heartbeatStatus[widget.key];
            const statusColor = hb?.status === 'online' ? 'bg-emerald-400' 
              : hb?.status === 'recent' ? 'bg-emerald-300'
              : hb?.status === 'stale' ? 'bg-yellow-400' 
              : 'bg-red-400';
            return (
              <div key={widget.key} className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-lg">
                    {widget.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{widget.name}</span>
                      <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                    </div>
                    <div className="text-xs text-gray-500">
                      {hb?.lastPing 
                        ? `Last ping: ${new Date(hb.lastPing + 'Z').toLocaleString()}`
                        : 'No heartbeat data'}
                    </div>
                    {hb?.source && (
                      <div className="text-xs text-gray-600">
                        From: {hb.source}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="glass-panel p-6 mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">🔗 Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="https://dash.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 transition-colors text-center"
          >
            <div className="text-2xl mb-2">☁️</div>
            <div className="text-white text-sm">Cloudflare</div>
          </a>
          <a
            href={`https://github.com/${GITHUB_ORG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 transition-colors text-center"
          >
            <div className="text-2xl mb-2">🐙</div>
            <div className="text-white text-sm">GitHub Org</div>
          </a>
          <a
            href="https://api.itai.gg/health"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 transition-colors text-center"
          >
            <div className="text-2xl mb-2">💚</div>
            <div className="text-white text-sm">API Health</div>
          </a>
          <a
            href="https://api-staging.itai.gg/health"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 transition-colors text-center"
          >
            <div className="text-2xl mb-2">🧪</div>
            <div className="text-white text-sm">Staging Health</div>
          </a>
        </div>
      </div>
    </div>
  );
}

