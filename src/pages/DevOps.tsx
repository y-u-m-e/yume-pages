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

interface SeshWorkerStatus {
  configured: boolean;
  worker?: string;
  status?: string;
  timestamp?: string;
  error?: string;
}

interface SeshWorkerConfig {
  guildId?: string;
  spreadsheetId?: string;
  sheetName?: string;
  serviceAccountConfigured?: boolean;
  privateKeyConfigured?: boolean;
}

interface SeshSyncResult {
  success: boolean;
  eventsCount?: number;
  duration?: number;
  timestamp?: string;
  error?: string;
}

const REPOS = [
  { 
    name: 'yume-tools', 
    displayName: 'Widgets',
    icon: '📦',
    description: 'CDN widgets for Carrd site'
  },
  { 
    name: 'yume-api', 
    displayName: 'API Worker',
    icon: '⚡',
    description: 'Cloudflare Worker backend'
  },
  { 
    name: 'yume-pages', 
    displayName: 'Frontend',
    icon: '🌐',
    description: 'React app on CF Pages'
  },
];

const CRON_SCHEDULES = [
  { value: '0 * * * *', label: 'Every hour', description: 'Runs at the top of every hour' },
  { value: '0 */2 * * *', label: 'Every 2 hours', description: 'Runs every 2 hours' },
  { value: '0 */4 * * *', label: 'Every 4 hours', description: 'Runs 6 times a day' },
  { value: '0 */6 * * *', label: 'Every 6 hours', description: 'Runs 4 times a day (default)' },
  { value: '0 */12 * * *', label: 'Every 12 hours', description: 'Runs twice a day' },
  { value: '0 0 * * *', label: 'Daily (midnight)', description: 'Runs once at midnight UTC' },
  { value: '0 12 * * *', label: 'Daily (noon)', description: 'Runs once at noon UTC' },
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
  const [heartbeatStatus, setHeartbeatStatus] = useState<Record<string, { status: string; last_ping: string; source_domain: string }>>({});
  const [pingingCarrd, setPingingCarrd] = useState(false);
  
  // Sesh Calendar Worker state
  const [seshWorkerStatus, setSeshWorkerStatus] = useState<SeshWorkerStatus | null>(null);
  const [seshWorkerConfig, setSeshWorkerConfig] = useState<SeshWorkerConfig | null>(null);
  const [seshSyncing, setSeshSyncing] = useState(false);
  const [seshLastSync, setSeshLastSync] = useState<SeshSyncResult | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState('0 */6 * * *');
  const [showScheduleInfo, setShowScheduleInfo] = useState(false);

  // Active tab for mobile/responsive
  const [activeTab, setActiveTab] = useState<'repos' | 'tools'>('repos');

  // Try to load token from server first, then localStorage
  useEffect(() => {
    const loadToken = async () => {
      setLoadingSecrets(true);
      
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

  // Fetch Sesh worker status when user is authenticated
  useEffect(() => {
    if (user) {
      fetchSeshWorkerStatus();
    }
  }, [user]);

  // Fetch heartbeat status on mount and periodically
  useEffect(() => {
    fetchHeartbeatStatus();
    const interval = setInterval(fetchHeartbeatStatus, 30000);
    return () => clearInterval(interval);
  }, []);

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
      // Ignore errors
    }
  };

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

  const fetchSeshWorkerStatus = async () => {
    try {
      const [statusRes, configRes] = await Promise.all([
        fetch(`${API_BASE}/admin/sesh-worker/status`, { credentials: 'include' }),
        fetch(`${API_BASE}/admin/sesh-worker/config`, { credentials: 'include' })
      ]);
      
      if (statusRes.ok) {
        const data = await statusRes.json();
        setSeshWorkerStatus(data);
      }
      
      if (configRes.ok) {
        const data = await configRes.json();
        setSeshWorkerConfig(data);
      }
    } catch {
      setSeshWorkerStatus({ configured: false, error: 'Failed to fetch status' });
    }
  };

  const triggerSeshSync = async () => {
    setSeshSyncing(true);
    setSeshLastSync(null);
    
    try {
      const res = await fetch(`${API_BASE}/admin/sesh-worker/sync`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await res.json();
      setSeshLastSync(data);
      await fetchSeshWorkerStatus();
    } catch {
      setSeshLastSync({ success: false, error: 'Failed to trigger sync' });
    } finally {
      setSeshSyncing(false);
    }
  };

  const pingCarrdWidgets = async () => {
    setPingingCarrd(true);
    
    const popup = window.open(
      'https://yumes-tools.itai.gg',
      'carrd_ping',
      'width=800,height=600,left=100,top=100'
    );
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (popup && !popup.closed) {
      popup.close();
    }
    
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
      const commitRes = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/commits/main`,
        { headers: { Authorization: `Bearer ${githubToken}` } }
      );
      
      if (!commitRes.ok) throw new Error('Failed to fetch commits');
      const commitData = await commitRes.json();

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
    } catch {
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
      const body: Record<string, unknown> = { ref: 'main' };
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
        setTimeout(() => {
          fetchRepoData(repoName);
          setTriggeringWorkflow(null);
        }, 2000);
      } else {
        throw new Error('Failed to trigger workflow');
      }
    } catch {
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

  const getHeartbeatColor = (status?: string) => {
    if (status === 'online') return 'bg-emerald-400';
    if (status === 'recent') return 'bg-emerald-300';
    if (status === 'stale') return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">🚀 DevOps Control Panel</h1>
        <p className="text-slate-400 text-sm">Monitor and manage deployments across your infrastructure</p>
      </div>

      {/* GitHub Token Setup */}
      {loadingSecrets ? (
        <div className="glass-panel p-4 mb-6 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-yume-mint border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400">Loading configuration...</span>
        </div>
      ) : !tokenSaved ? (
        <div className="glass-panel p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔑</span>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white mb-2">GitHub Token Required</h2>
              <p className="text-slate-400 text-sm mb-3">
                Enter a GitHub PAT with <code className="text-yume-mint">repo</code> and <code className="text-yume-mint">workflow</code> scopes.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yume-mint text-white text-sm"
                />
                <button onClick={saveToken} className="btn-primary text-sm px-4">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center mb-4">
          <span className="text-green-400 text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            GitHub connected
            <span className="text-slate-500">
              ({tokenSource === 'server' ? 'server' : 'local'})
            </span>
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => { fetchAllRepoData(); fetchCFDeployments(); fetchSeshWorkerStatus(); }} 
              className="btn-secondary text-xs px-3 py-1"
            >
              🔄 Refresh
            </button>
            {tokenSource === 'local' && (
              <button onClick={clearToken} className="text-slate-400 hover:text-red-400 text-xs">
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex mb-4 bg-slate-800/50 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('repos')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'repos' ? 'bg-yume-mint text-black' : 'text-slate-400'
          }`}
        >
          Repositories
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'tools' ? 'bg-yume-mint text-black' : 'text-slate-400'
          }`}
        >
          Tools
        </button>
      </div>

      {tokenSaved && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Repositories */}
          <div className={`flex-1 space-y-4 ${activeTab !== 'repos' ? 'hidden lg:block' : ''}`}>
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider hidden lg:block">Repositories</h2>
            
            {repos.map((repo) => (
              <div key={repo.name} className="glass-panel p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xl">
                      {REPOS.find(r => r.name === repo.name)?.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{repo.displayName}</h3>
                      <p className="text-slate-500 text-xs">{repo.description}</p>
                    </div>
                  </div>
                  <a
                    href={`https://github.com/${GITHUB_ORG}/${repo.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-yume-mint text-xs"
                  >
                    GitHub →
                  </a>
                </div>

                {repo.loading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                ) : repo.error ? (
                  <p className="text-red-400 text-sm">{repo.error}</p>
                ) : (
                  <>
                    {/* Latest Commit */}
                    {repo.lastCommit && (
                      <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-yume-mint font-mono">{repo.lastCommit.sha}</span>
                          <span className="text-slate-300 truncate flex-1">{repo.lastCommit.message}</span>
                        </div>
                        <p className="text-slate-500 text-xs mt-1">
                          {repo.lastCommit.author} • {repo.lastCommit.date}
                        </p>
                      </div>
                    )}

                    {/* Workflows/Deployments */}
                    {repo.name !== 'yume-pages' && repo.workflows && repo.workflows.length > 0 && (
                      <div className="mb-3">
                        <button 
                          onClick={() => setExpandedWorkflows(prev => ({ ...prev, [repo.name]: !prev[repo.name] }))}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <span className={`transition-transform ${expandedWorkflows[repo.name] ? 'rotate-90' : ''}`}>▶</span>
                          Workflows ({repo.workflows.length})
                        </button>
                        {expandedWorkflows[repo.name] && (
                          <div className="mt-2 space-y-1">
                            {repo.workflows.slice(0, 3).map((run) => (
                              <a
                                key={run.id}
                                href={run.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between bg-slate-800/30 rounded p-2 hover:bg-slate-800/50 text-xs"
                              >
                                <span className="flex items-center gap-2">
                                  <span>{getStatusIcon(run.status, run.conclusion)}</span>
                                  <span className={getStatusColor(run.status, run.conclusion)}>{run.name}</span>
                                </span>
                                <span className="text-slate-500">{new Date(run.created_at).toLocaleDateString()}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CF Pages Deployments */}
                    {repo.name === 'yume-pages' && (
                      <div className="mb-3">
                        <button 
                          onClick={() => setExpandedWorkflows(prev => ({ ...prev, 'yume-pages': !prev['yume-pages'] }))}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <span className={`transition-transform ${expandedWorkflows['yume-pages'] ? 'rotate-90' : ''}`}>▶</span>
                          ☁️ Deployments ({cfDeployments.length})
                        </button>
                        {expandedWorkflows['yume-pages'] && cfDeployments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {cfDeployments.slice(0, 3).map((deploy) => (
                              <a
                                key={deploy.id}
                                href={deploy.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between bg-slate-800/30 rounded p-2 hover:bg-slate-800/50 text-xs"
                              >
                                <span className="flex items-center gap-2">
                                  <span>{deploy.status === 'success' ? '✅' : deploy.status === 'failure' ? '❌' : '🔄'}</span>
                                  <span className={deploy.status === 'success' ? 'text-green-400' : deploy.status === 'failure' ? 'text-red-400' : 'text-yellow-400'}>
                                    {deploy.source?.commit_message?.slice(0, 30) || 'Deployment'}
                                  </span>
                                </span>
                                <span className="text-yume-mint">{deploy.environment}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {workflows[repo.name] && workflows[repo.name].length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {repo.name === 'yume-tools' && (
                          <button
                            onClick={() => {
                              const workflow = workflows[repo.name]?.find(w => w.name === 'Widget CI/CD');
                              if (workflow) triggerWorkflow(repo.name, workflow.id, { action: 'promote-to-production' });
                            }}
                            disabled={triggeringWorkflow !== null}
                            className="btn-primary text-xs px-3 py-1"
                          >
                            🚀 Promote
                          </button>
                        )}
                        {repo.name === 'yume-api' && (
                          <>
                            <button
                              onClick={() => {
                                const workflow = workflows[repo.name]?.find(w => w.name === 'Deploy Worker');
                                if (workflow) triggerWorkflow(repo.name, workflow.id, { environment: 'staging' });
                              }}
                              disabled={triggeringWorkflow !== null}
                              className="btn-secondary text-xs px-3 py-1"
                            >
                              🧪 Staging
                            </button>
                            <button
                              onClick={() => {
                                const workflow = workflows[repo.name]?.find(w => w.name === 'Deploy Worker');
                                if (workflow) triggerWorkflow(repo.name, workflow.id, { environment: 'production' });
                              }}
                              disabled={triggeringWorkflow !== null}
                              className="btn-primary text-xs px-3 py-1"
                            >
                              🚀 Production
                            </button>
                          </>
                        )}
                        {repo.name === 'yume-pages' && (
                          <span className="text-slate-500 text-xs italic py-1">Auto-deploys on push</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Right Column - Tools */}
          <div className={`lg:w-96 space-y-4 ${activeTab !== 'tools' ? 'hidden lg:block' : ''}`}>
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider hidden lg:block">Tools & Automation</h2>

            {/* Sesh Calendar Worker Card */}
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl">
                    📅
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Sesh Calendar</h3>
                    <p className="text-slate-500 text-xs">Auto-sync to Google Sheets</p>
                  </div>
                </div>
                {seshWorkerStatus?.configured ? (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full" /> Online
                  </span>
                ) : (
                  <span className="text-xs text-yellow-400">Not configured</span>
                )}
              </div>

              {/* Schedule Configuration */}
              <div className="mb-4">
                <label className="text-xs text-slate-400 block mb-2">Schedule</label>
                <div className="relative">
                  <select
                    value={selectedSchedule}
                    onChange={(e) => {
                      setSelectedSchedule(e.target.value);
                      setShowScheduleInfo(true);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-yume-mint"
                  >
                    {CRON_SCHEDULES.map(schedule => (
                      <option key={schedule.value} value={schedule.value}>
                        {schedule.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {CRON_SCHEDULES.find(s => s.value === selectedSchedule)?.description}
                </p>
                
                {showScheduleInfo && selectedSchedule !== '0 */6 * * *' && (
                  <div className="mt-2 p-2 rounded bg-yellow-900/20 border border-yellow-700/50">
                    <p className="text-xs text-yellow-400">
                      ⚠️ To apply this schedule, update <code className="text-yume-mint">wrangler.jsonc</code> and redeploy:
                    </p>
                    <code className="text-xs text-slate-300 block mt-1 font-mono">
                      "crons": ["{selectedSchedule}"]
                    </code>
                  </div>
                )}
              </div>

              {/* Config Status */}
              {seshWorkerConfig && (
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                  <div className="bg-slate-800/50 rounded p-2">
                    <span className="text-slate-500 block">Service Account</span>
                    <span className={seshWorkerConfig.serviceAccountConfigured ? 'text-green-400' : 'text-red-400'}>
                      {seshWorkerConfig.serviceAccountConfigured ? '✓ Set' : '✗ Missing'}
                    </span>
                  </div>
                  <div className="bg-slate-800/50 rounded p-2">
                    <span className="text-slate-500 block">Private Key</span>
                    <span className={seshWorkerConfig.privateKeyConfigured ? 'text-green-400' : 'text-red-400'}>
                      {seshWorkerConfig.privateKeyConfigured ? '✓ Set' : '✗ Missing'}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={triggerSeshSync}
                  disabled={seshSyncing || !seshWorkerStatus?.configured}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  {seshSyncing ? (
                    <><span className="animate-spin">⏳</span> Syncing...</>
                  ) : (
                    <>🔄 Sync Now</>
                  )}
                </button>
                <a
                  href="https://docs.google.com/spreadsheets/d/1ME5MvznNQy_F9RYIl8tqFTzw-6dSDyv7EX-Ln_Sq7HI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm px-3"
                >
                  📊
                </a>
              </div>

              {/* Last Sync Result */}
              {seshLastSync && (
                <div className={`mt-3 p-2 rounded text-xs ${seshLastSync.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                  {seshLastSync.success 
                    ? `✅ Synced ${seshLastSync.eventsCount} events (${seshLastSync.duration}ms)`
                    : `❌ ${seshLastSync.error}`
                  }
                </div>
              )}
            </div>

            {/* Widget Heartbeats Card */}
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xl">
                    💓
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Widget Heartbeats</h3>
                    <p className="text-slate-500 text-xs">Carrd widget status</p>
                  </div>
                </div>
                <button
                  onClick={pingCarrdWidgets}
                  disabled={pingingCarrd}
                  className="text-xs text-yume-mint hover:underline"
                >
                  {pingingCarrd ? '⏳ Pinging...' : '🌐 Ping'}
                </button>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'mention-maker', name: 'Mention Maker', icon: '@' },
                  { key: 'event-parser', name: 'Event Parser', icon: '📋' },
                  { key: 'infographic-maker', name: 'Infographic', icon: '🖼️' },
                ].map(widget => {
                  const hb = heartbeatStatus[widget.key];
                  return (
                    <div key={widget.key} className="flex items-center justify-between bg-slate-800/50 rounded p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{widget.icon}</span>
                        <span className="text-white text-sm">{widget.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">
                          {hb?.last_ping 
                            ? new Date(hb.last_ping + 'Z').toLocaleTimeString()
                            : 'No data'}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${getHeartbeatColor(hb?.status)}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="glass-panel p-4">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <span>🔗</span> Quick Links
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: 'https://dash.cloudflare.com', icon: '☁️', label: 'Cloudflare' },
                  { href: `https://github.com/${GITHUB_ORG}`, icon: '🐙', label: 'GitHub' },
                  { href: 'https://api.itai.gg/health', icon: '💚', label: 'API Health' },
                  { href: 'https://yumes-tools.itai.gg', icon: '🎴', label: 'Carrd Site' },
                ].map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-700/50 transition-colors text-center"
                  >
                    <div className="text-xl mb-1">{link.icon}</div>
                    <div className="text-slate-300 text-xs">{link.label}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
