/**
 * =============================================================================
 * ARCHITECTURE PAGE - System Architecture Documentation
 * =============================================================================
 * 
 * Interactive Mermaid diagrams showing how all Yume Tools components connect.
 * Provides visual documentation for the entire ecosystem.
 * 
 * Features:
 * - System overview diagram
 * - Data flow visualization
 * - Deployment pipeline
 * - Technology stack breakdown
 * 
 * @module Architecture
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import mermaid from 'mermaid';

// =============================================================================
// MERMAID CONFIGURATION
// =============================================================================

// Initialize mermaid with dark theme matching Yume aesthetic
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#a8e6cf',
    primaryTextColor: '#141414',
    primaryBorderColor: '#88d4ab',
    secondaryColor: '#1e1e1e',
    secondaryTextColor: '#ffffff',
    secondaryBorderColor: '#333333',
    tertiaryColor: '#2a2a2a',
    background: '#141414',
    mainBkg: '#1e1e1e',
    nodeBorder: '#a8e6cf',
    clusterBkg: '#1a1a1a',
    clusterBorder: '#333333',
    lineColor: '#666666',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    padding: 15,
  },
});

// =============================================================================
// DIAGRAM DEFINITIONS
// =============================================================================

const diagrams = {
  systemOverview: {
    title: '🏗️ System Overview',
    description: 'High-level view of all Yume Tools components and how they connect.',
    code: `
flowchart TB
    subgraph Users["👥 Users"]
        Discord["Discord<br/>Server"]
        Browser["Web<br/>Browser"]
    end

    subgraph Frontend["🌐 Frontend Layer"]
        YumePages["yume-pages<br/>(React + Vite)<br/>emuy.gg"]
        Carrd["Carrd Site<br/>yumes-tools.emuy.gg"]
    end

    subgraph Widgets["📦 Widgets (CDN)"]
        MentionMaker["Mention<br/>Maker"]
        EventParser["Event<br/>Parser"]
        Infographic["Infographic<br/>Maker"]
    end

    subgraph Backend["⚡ Backend Layer"]
        YumeAPI["yume-api<br/>(Cloudflare Worker)<br/>api.itai.gg"]
        YumeBot["yume-bot<br/>(Discord.js)<br/>Railway"]
    end

    subgraph Data["💾 Data Layer"]
        D1[("D1 Database<br/>(SQLite)")]
        R2[("R2 Bucket<br/>(Images)")]
        DiscordAPI["Discord<br/>API"]
    end

    subgraph External["🔗 External Services"]
        jsDelivr["jsDelivr<br/>CDN"]
        GSheets["Google<br/>Sheets"]
        Sesh["Sesh<br/>Calendar"]
    end

    Browser --> YumePages
    Browser --> Carrd
    Discord --> YumeBot

    YumePages --> YumeAPI
    Carrd --> Widgets
    Widgets --> jsDelivr
    
    YumeBot --> YumeAPI
    YumeBot --> DiscordAPI
    
    YumeAPI --> D1
    YumeAPI --> R2
    YumeAPI --> DiscordAPI
    YumeAPI --> GSheets
    YumeAPI --> Sesh

    classDef frontend fill:#a8e6cf,stroke:#88d4ab,color:#141414
    classDef backend fill:#88d4ab,stroke:#68c48b,color:#141414
    classDef data fill:#1e1e1e,stroke:#a8e6cf,color:#ffffff
    classDef external fill:#2a2a2a,stroke:#666,color:#aaa
    classDef user fill:#333,stroke:#666,color:#fff

    class YumePages,Carrd frontend
    class YumeAPI,YumeBot backend
    class D1,R2,DiscordAPI data
    class jsDelivr,GSheets,Sesh external
    class Discord,Browser user
`,
  },

  dataFlow: {
    title: '🔄 Data Flow',
    description: 'How data moves through the system for key operations.',
    code: `
flowchart LR
    subgraph Auth["🔐 Authentication Flow"]
        A1["User clicks Login"] --> A2["Redirect to Discord OAuth"]
        A2 --> A3["Discord authorizes"]
        A3 --> A4["Callback to API"]
        A4 --> A5["Create JWT token"]
        A5 --> A6["Set cookie & redirect"]
    end

    subgraph Attendance["📊 Attendance Flow"]
        B1["Admin logs event"] --> B2["POST /attendance/records"]
        B2 --> B3["Validate & store in D1"]
        B3 --> B4["Return success"]
        
        B5["User views leaderboard"] --> B6["GET /attendance"]
        B6 --> B7["Query D1 aggregates"]
        B7 --> B8["Return rankings"]
    end

    subgraph TileEvent["🎮 Tile Event Flow"]
        C1["User submits screenshot"] --> C2["Upload to R2"]
        C2 --> C3["OCR via Workers AI"]
        C3 --> C4["Verify keywords"]
        C4 --> C5["Update progress in D1"]
    end

    subgraph Bot["🤖 Discord Bot Flow"]
        D1b["User runs /leaderboard"] --> D2b["Bot calls yume-api"]
        D2b --> D3b["API queries D1"]
        D3b --> D4b["Return to bot"]
        D4b --> D5b["Format embed & reply"]
    end

    classDef step fill:#1e1e1e,stroke:#a8e6cf,color:#fff
    class A1,A2,A3,A4,A5,A6,B1,B2,B3,B4,B5,B6,B7,B8,C1,C2,C3,C4,C5,D1b,D2b,D3b,D4b,D5b step
`,
  },

  deployment: {
    title: '🚀 Deployment Pipeline',
    description: 'How code gets from your editor to production.',
    code: `
flowchart TB
    subgraph Dev["💻 Development"]
        Code["Write Code"]
        Commit["Git Commit"]
        Push["Git Push"]
    end

    subgraph GitHub["🐙 GitHub"]
        MainBranch["main branch"]
        Actions["GitHub Actions"]
    end

    subgraph YumePagesDepl["yume-pages Deployment"]
        CFPages["Cloudflare Pages"]
        PagesURL["emuy.gg ✅"]
    end

    subgraph YumeAPIDepl["yume-api Deployment"]
        WranglerDeploy["Wrangler Deploy"]
        APIStaging["api-staging.itai.gg"]
        APIProd["api.itai.gg ✅"]
    end

    subgraph YumeToolsDepl["yume-tools Deployment"]
        jsDelivrCDN["jsDelivr CDN"]
        SHAUpdate["Update SHA in API"]
        CDNLive["CDN Live ✅"]
    end

    subgraph YumeBotDepl["yume-bot Deployment"]
        Railway["Railway"]
        BotOnline["Bot Online ✅"]
    end

    Code --> Commit --> Push --> MainBranch

    MainBranch -->|"yume-pages"| CFPages --> PagesURL
    MainBranch -->|"yume-api"| Actions --> WranglerDeploy
    WranglerDeploy --> APIStaging --> APIProd
    MainBranch -->|"yume-tools"| jsDelivrCDN --> SHAUpdate --> CDNLive
    MainBranch -->|"yume-bot"| Railway --> BotOnline

    classDef dev fill:#333,stroke:#666,color:#fff
    classDef github fill:#238636,stroke:#2ea043,color:#fff
    classDef cloudflare fill:#f38020,stroke:#f38020,color:#fff
    classDef railway fill:#9747FF,stroke:#9747FF,color:#fff
    classDef success fill:#a8e6cf,stroke:#88d4ab,color:#141414

    class Code,Commit,Push dev
    class MainBranch,Actions github
    class CFPages,WranglerDeploy cloudflare
    class Railway railway
    class PagesURL,APIProd,CDNLive,BotOnline success
`,
  },

  techStack: {
    title: '🛠️ Technology Stack',
    description: 'Technologies used across the ecosystem.',
    code: `
flowchart TB
    subgraph Frontend["Frontend"]
        React["React 18"]
        Vite["Vite"]
        TailwindCSS["Tailwind CSS"]
        TypeScript["TypeScript"]
        ReactRouter["React Router v6"]
    end

    subgraph Backend["Backend"]
        CFWorkers["Cloudflare Workers"]
        NodeJS["Node.js 20"]
        DiscordJS["Discord.js v14"]
    end

    subgraph Database["Data Storage"]
        D1DB["Cloudflare D1<br/>(SQLite)"]
        R2Storage["Cloudflare R2<br/>(Object Storage)"]
    end

    subgraph Hosting["Hosting"]
        CFPages["Cloudflare Pages"]
        RailwayHost["Railway"]
        jsDelivrHost["jsDelivr CDN"]
    end

    subgraph AI["AI / ML"]
        WorkersAI["Workers AI<br/>(OCR)"]
    end

    subgraph Auth["Authentication"]
        DiscordOAuth["Discord OAuth2"]
        JWT["JWT Tokens"]
    end

    React --> Vite
    Vite --> TailwindCSS
    TypeScript --> React
    ReactRouter --> React

    CFWorkers --> D1DB
    CFWorkers --> R2Storage
    NodeJS --> DiscordJS

    CFWorkers --> WorkersAI
    CFWorkers --> DiscordOAuth
    DiscordOAuth --> JWT

    classDef frontend fill:#61dafb,stroke:#61dafb,color:#141414
    classDef backend fill:#f38020,stroke:#f38020,color:#141414
    classDef data fill:#a8e6cf,stroke:#88d4ab,color:#141414
    classDef hosting fill:#9747FF,stroke:#9747FF,color:#fff
    classDef ai fill:#ff6b6b,stroke:#ff6b6b,color:#fff

    class React,Vite,TailwindCSS,TypeScript,ReactRouter frontend
    class CFWorkers,NodeJS,DiscordJS backend
    class D1DB,R2Storage data
    class CFPages,RailwayHost,jsDelivrHost hosting
    class WorkersAI ai
`,
  },

  botIntegration: {
    title: '🤖 Discord Bot Integration',
    description: 'How yume-bot connects with the ecosystem.',
    code: `
flowchart TB
    subgraph Discord["Discord"]
        User["👤 Discord User"]
        SlashCmd["Slash Commands"]
        Embed["Rich Embeds"]
    end

    subgraph Bot["yume-bot (Railway)"]
        BotHandler["Command Handler"]
        APIClient["API Client"]
        
        subgraph Commands["Commands"]
            Ping["/ping"]
            Leaderboard["/leaderboard"]
            Lookup["/lookup"]
            TileEvent["/tileevent"]
            Record["/record"]
        end
    end

    subgraph API["yume-api"]
        HealthEndpoint["/health"]
        AttendanceEndpoint["/attendance"]
        TileEventsEndpoint["/tile-events"]
    end

    subgraph DB["Database"]
        AttendanceDB[("attendance")]
        TileEventsDB[("tile_events")]
        ProgressDB[("event_progress")]
    end

    User --> SlashCmd --> BotHandler
    BotHandler --> Commands
    Commands --> APIClient
    
    APIClient --> HealthEndpoint
    APIClient --> AttendanceEndpoint
    APIClient --> TileEventsEndpoint
    
    AttendanceEndpoint --> AttendanceDB
    TileEventsEndpoint --> TileEventsDB
    TileEventsEndpoint --> ProgressDB
    
    APIClient --> BotHandler
    BotHandler --> Embed --> User

    classDef discord fill:#5865F2,stroke:#5865F2,color:#fff
    classDef bot fill:#a8e6cf,stroke:#88d4ab,color:#141414
    classDef api fill:#f38020,stroke:#f38020,color:#141414
    classDef db fill:#1e1e1e,stroke:#a8e6cf,color:#fff

    class User,SlashCmd,Embed discord
    class BotHandler,APIClient,Ping,Leaderboard,Lookup,TileEvent,Record bot
    class HealthEndpoint,AttendanceEndpoint,TileEventsEndpoint api
    class AttendanceDB,TileEventsDB,ProgressDB db
`,
  },
};

// =============================================================================
// MERMAID COMPONENT
// =============================================================================

/**
 * Renders a Mermaid diagram with the Yume theme
 */
function MermaidDiagram({ id, code }: { id: string; code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      
      try {
        // Clear previous content
        setSvg('');
        setError(null);
        
        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(`mermaid-${id}`, code.trim());
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('Failed to render diagram');
      }
    };

    renderDiagram();
  }, [id, code]);

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="bg-yume-bg rounded-xl p-4 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

type DiagramKey = keyof typeof diagrams;

export default function Architecture() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeDiagram, setActiveDiagram] = useState<DiagramKey>('systemOverview');

  // Redirect if not authenticated
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

  const currentDiagram = diagrams[activeDiagram];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          <span className="text-yume-accent">🗺️</span> Architecture
        </h1>
        <p className="text-gray-400">
          Interactive diagrams showing how all Yume Tools components connect.
        </p>
      </div>

      {/* Diagram Selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        {(Object.keys(diagrams) as DiagramKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveDiagram(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeDiagram === key
                ? 'bg-yume-accent text-yume-bg'
                : 'bg-yume-card text-gray-400 hover:text-white border border-yume-border hover:border-yume-border-accent'
            }`}
          >
            {diagrams[key].title}
          </button>
        ))}
      </div>

      {/* Active Diagram */}
      <div className="bg-yume-card rounded-2xl border border-yume-border p-6 mb-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white mb-2">{currentDiagram.title}</h2>
          <p className="text-gray-400">{currentDiagram.description}</p>
        </div>
        
        <MermaidDiagram 
          id={activeDiagram} 
          code={currentDiagram.code} 
        />
      </div>

      {/* Quick Reference Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-yume-card rounded-xl border border-yume-border p-4">
          <div className="text-2xl mb-2">🌐</div>
          <h3 className="font-semibold text-white text-sm">yume-pages</h3>
          <p className="text-gray-500 text-xs mt-1">React frontend on Cloudflare Pages</p>
          <code className="text-yume-accent text-xs">emuy.gg</code>
        </div>
        
        <div className="bg-yume-card rounded-xl border border-yume-border p-4">
          <div className="text-2xl mb-2">⚡</div>
          <h3 className="font-semibold text-white text-sm">yume-api</h3>
          <p className="text-gray-500 text-xs mt-1">Cloudflare Worker + D1 Database</p>
          <code className="text-yume-accent text-xs">api.itai.gg</code>
        </div>
        
        <div className="bg-yume-card rounded-xl border border-yume-border p-4">
          <div className="text-2xl mb-2">🤖</div>
          <h3 className="font-semibold text-white text-sm">yume-bot</h3>
          <p className="text-gray-500 text-xs mt-1">Discord.js bot on Railway</p>
          <code className="text-yume-accent text-xs">Discord</code>
        </div>
        
        <div className="bg-yume-card rounded-xl border border-yume-border p-4">
          <div className="text-2xl mb-2">📦</div>
          <h3 className="font-semibold text-white text-sm">yume-tools</h3>
          <p className="text-gray-500 text-xs mt-1">Widgets on jsDelivr CDN</p>
          <code className="text-yume-accent text-xs">cdn.jsdelivr.net</code>
        </div>
      </div>

      {/* Repository Links */}
      <div className="bg-yume-card rounded-2xl border border-yume-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">📂 Repositories</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { name: 'yume-pages', desc: 'React frontend', url: 'https://github.com/y-u-m-e/yume-pages' },
            { name: 'yume-api', desc: 'Cloudflare Worker API', url: 'https://github.com/y-u-m-e/yume-api' },
            { name: 'yume-bot', desc: 'Discord bot', url: 'https://github.com/y-u-m-e/yume-bot' },
            { name: 'yume-tools', desc: 'Widget library', url: 'https://github.com/y-u-m-e/yume-tools' },
          ].map((repo) => (
            <a
              key={repo.name}
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-yume-bg-light rounded-xl hover:bg-yume-bg transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-yume-bg flex items-center justify-center text-xl">
                🐙
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white group-hover:text-yume-accent transition-colors">
                  {repo.name}
                </h3>
                <p className="text-gray-500 text-sm">{repo.desc}</p>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-yume-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

