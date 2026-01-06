/**
 * =============================================================================
 * ARCHITECTURE PAGE - System Architecture Documentation with React Flow
 * =============================================================================
 * 
 * Interactive React Flow diagrams showing how all Yume Tools components connect.
 * Provides visual, draggable documentation for the entire ecosystem.
 * 
 * Features:
 * - Interactive pan/zoom/drag
 * - Custom styled nodes
 * - Animated edges
 * - Multiple diagram views
 * 
 * @module Architecture
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// =============================================================================
// NODE DETAILS DATABASE
// =============================================================================

interface NodeDetails {
  title: string;
  description: string;
  tech?: string[];
  url?: string;
  features?: string[];
  status?: 'active' | 'development' | 'planned';
}

const nodeDetailsMap: Record<string, NodeDetails> = {
  // System Overview nodes
  'discord': {
    title: 'Discord Server',
    description: 'The Iron Forged Discord server where clan members interact with the bot and receive notifications.',
    tech: ['Discord', 'Slash Commands', 'Webhooks'],
    features: ['Event announcements', 'Leaderboard commands', 'Bot interactions'],
    status: 'active',
  },
  'browser': {
    title: 'Web Browser',
    description: 'Users access the Yume Tools web applications through any modern web browser.',
    tech: ['Chrome', 'Firefox', 'Safari', 'Edge'],
    features: ['Event tracking', 'Admin panels', 'Documentation'],
    status: 'active',
  },
  'yume-pages': {
    title: 'yume-pages',
    description: 'The main React frontend application hosted on Cloudflare Pages. Provides admin tools and documentation.',
    tech: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'React Router v6'],
    url: 'https://emuy.gg',
    features: ['Attendance Tracking', 'Admin Panel', 'Cruddy Panel', 'Documentation', 'Architecture Diagrams'],
    status: 'active',
  },
  'ironforged-events': {
    title: 'Iron Forged Events',
    description: 'Dedicated tile events portal for Iron Forged clan members to track progress and submit screenshots.',
    tech: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS'],
    url: 'https://ironforged-events.emuy.gg',
    features: ['Tile Events', 'Screenshot Submissions', 'Progress Tracking', 'OCR Verification', 'Discord Webhooks'],
    status: 'active',
  },
  'carrd': {
    title: 'Carrd Site',
    description: 'Simple landing page hosting embedded widgets for quick access to tools.',
    tech: ['Carrd', 'Embedded Widgets'],
    url: 'https://yumes-tools.emuy.gg',
    features: ['Mention Maker', 'Event Parser'],
    status: 'active',
  },
  'widgets': {
    title: 'Widget Library',
    description: 'Standalone JavaScript widgets served via jsDelivr CDN for embedding in external sites.',
    tech: ['Vanilla JS', 'jsDelivr CDN'],
    features: ['Mention Maker', 'Event Parser', 'Infographic Maker'],
    status: 'active',
  },
  'yume-api': {
    title: 'yume-api',
    description: 'Cloudflare Worker API handling all backend operations including auth, data storage, and integrations.',
    tech: ['Cloudflare Workers', 'D1 Database', 'R2 Storage', 'Workers AI'],
    url: 'https://api.emuy.gg',
    features: ['Discord OAuth2', 'Attendance API', 'Tile Events', 'OCR Processing'],
    status: 'active',
  },
  'yume-bot': {
    title: 'yume-bot',
    description: 'Discord bot providing slash commands for clan members to interact with the system.',
    tech: ['Node.js 20', 'Discord.js v14', 'Railway'],
    features: ['/leaderboard', '/lookup', '/record', '/ping'],
    status: 'active',
  },
  'd1': {
    title: 'Cloudflare D1',
    description: 'SQLite database storing all application data including attendance records, tile events, and user data.',
    tech: ['SQLite', 'Cloudflare D1'],
    features: ['Attendance records', 'Tile event progress', 'User sessions', 'Activity logs'],
    status: 'active',
  },
  'r2': {
    title: 'Cloudflare R2',
    description: 'Object storage for user-uploaded images like tile event screenshot submissions.',
    tech: ['Cloudflare R2', 'S3-compatible'],
    features: ['Screenshot storage', 'Public image URLs'],
    status: 'active',
  },
  'discord-api': {
    title: 'Discord API',
    description: 'Official Discord API for OAuth2 authentication and bot operations.',
    tech: ['Discord API v10', 'OAuth2'],
    url: 'https://discord.com/developers',
    features: ['User authentication', 'Guild info', 'Bot messaging'],
    status: 'active',
  },
  'gsheets': {
    title: 'Google Sheets',
    description: 'Integration for syncing calendar events and other data with Google Sheets.',
    tech: ['Google Sheets API', 'Service Account'],
    features: ['Calendar sync', 'Event export'],
    status: 'active',
  },
  'sesh': {
    title: 'Sesh Calendar',
    description: 'Discord calendar bot integration for fetching scheduled clan events.',
    tech: ['Sesh API'],
    url: 'https://sesh.fyi',
    features: ['Event fetching', 'Host mapping'],
    status: 'active',
  },
  
  // Tech Stack nodes
  'ts-react': {
    title: 'React 18',
    description: 'Modern React with hooks, concurrent features, and automatic batching.',
    tech: ['React 18.2', 'Hooks', 'JSX'],
    url: 'https://react.dev',
    status: 'active',
  },
  'ts-vite': {
    title: 'Vite',
    description: 'Next-generation frontend build tool with instant HMR and optimized builds.',
    tech: ['Vite 5', 'ESBuild', 'Rollup'],
    url: 'https://vitejs.dev',
    status: 'active',
  },
  'ts-tailwind': {
    title: 'Tailwind CSS',
    description: 'Utility-first CSS framework for rapid UI development.',
    tech: ['Tailwind CSS 3', 'PostCSS'],
    url: 'https://tailwindcss.com',
    status: 'active',
  },
  'ts-typescript': {
    title: 'TypeScript',
    description: 'Typed superset of JavaScript for better developer experience and fewer bugs.',
    tech: ['TypeScript 5', 'Strict mode'],
    url: 'https://typescriptlang.org',
    status: 'active',
  },
  'ts-workers': {
    title: 'Cloudflare Workers',
    description: 'Serverless JavaScript runtime at the edge for low-latency API responses.',
    tech: ['Workers Runtime', 'Wrangler CLI'],
    url: 'https://workers.cloudflare.com',
    status: 'active',
  },
  'ts-nodejs': {
    title: 'Node.js 20',
    description: 'JavaScript runtime for the Discord bot with LTS support.',
    tech: ['Node.js 20 LTS', 'npm'],
    url: 'https://nodejs.org',
    status: 'active',
  },
  'ts-discordjs': {
    title: 'Discord.js v14',
    description: 'Powerful library for interacting with the Discord API.',
    tech: ['Discord.js 14', 'Slash Commands'],
    url: 'https://discord.js.org',
    status: 'active',
  },
  'ts-d1': {
    title: 'Cloudflare D1',
    description: 'Serverless SQL database built on SQLite for Workers.',
    tech: ['D1', 'SQLite', 'SQL'],
    url: 'https://developers.cloudflare.com/d1',
    status: 'active',
  },
  'ts-r2': {
    title: 'Cloudflare R2',
    description: 'S3-compatible object storage with zero egress fees.',
    tech: ['R2', 'S3 API'],
    url: 'https://developers.cloudflare.com/r2',
    status: 'active',
  },
  'ts-ai': {
    title: 'Workers AI',
    description: 'AI inference at the edge for OCR and image analysis.',
    tech: ['Workers AI', 'LLaVA', 'OCR'],
    url: 'https://developers.cloudflare.com/workers-ai',
    status: 'active',
  },
  'ts-oauth': {
    title: 'Discord OAuth2',
    description: 'OAuth2 flow for secure user authentication via Discord.',
    tech: ['OAuth2', 'JWT'],
    status: 'active',
  },
  'ts-jwt': {
    title: 'JWT Tokens',
    description: 'JSON Web Tokens for secure session management.',
    tech: ['JWT', 'HMAC-SHA256'],
    status: 'active',
  },
  
  // Deployment nodes
  'd-code': { title: 'Write Code', description: 'Local development in your IDE of choice.', status: 'active' },
  'd-commit': { title: 'Git Commit', description: 'Stage and commit changes to version control.', status: 'active' },
  'd-push': { title: 'Git Push', description: 'Push commits to GitHub remote repository.', status: 'active' },
  'd-main': { title: 'main branch', description: 'The main branch triggers CI/CD pipelines on push.', tech: ['GitHub', 'GitHub Actions'], status: 'active' },
  'd-pages': { title: 'Cloudflare Pages', description: 'Automatic deployment of yume-pages on every push.', tech: ['CF Pages', 'Auto Deploy'], status: 'active' },
  'd-worker': { title: 'Wrangler Deploy', description: 'Deploy yume-api Worker via GitHub Actions.', tech: ['Wrangler', 'GitHub Actions'], status: 'active' },
  'd-cdn': { title: 'jsDelivr CDN', description: 'Widgets automatically available via CDN after push.', tech: ['jsDelivr', 'Git Tags'], status: 'active' },
  'd-railway': { title: 'Railway', description: 'Auto-deploy yume-bot on push to main.', tech: ['Railway', 'Docker'], status: 'active' },
  'd-pages-ok': { title: 'emuy.gg', description: 'Frontend live and serving users!', url: 'https://emuy.gg', status: 'active' },
  'd-api-ok': { title: 'api.emuy.gg', description: 'API live and handling requests!', url: 'https://api.emuy.gg', status: 'active' },
  'd-cdn-ok': { title: 'CDN Live', description: 'Widgets available worldwide via CDN!', status: 'active' },
  'd-bot-ok': { title: 'Bot Online', description: 'Discord bot online and responding!', status: 'active' },
  
  // Bot Integration nodes
  'bi-user': { title: 'Discord User', description: 'Clan members using slash commands in Discord.', status: 'active' },
  'bi-cmd': { title: 'Slash Commands', description: 'Discord slash commands for interacting with the bot.', tech: ['Discord Interactions'], status: 'active' },
  'bi-handler': { title: 'Command Handler', description: 'Processes incoming commands and routes to appropriate handlers.', tech: ['Discord.js'], status: 'active' },
  'bi-ping': { title: '/ping', description: 'Simple health check command.', status: 'active' },
  'bi-leaderboard': { title: '/leaderboard', description: 'Display clan attendance leaderboard.', status: 'active' },
  'bi-lookup': { title: '/lookup', description: 'Look up a specific user\'s attendance stats.', status: 'active' },
  'bi-record': { title: '/record', description: 'Record attendance for an event.', status: 'active' },
  'bi-api': { title: 'yume-api', description: 'API handles data operations for bot commands.', status: 'active' },
  'bi-db': { title: 'D1 Database', description: 'Stores all attendance and event data.', status: 'active' },
  'bi-embed': { title: 'Rich Embed', description: 'Formatted Discord embed response to user.', status: 'active' },
  
  // Auth Flow nodes
  'a1': { title: 'Login Click', description: 'User initiates login from the web app.', status: 'active' },
  'a2': { title: 'Discord Redirect', description: 'Redirect to Discord OAuth2 authorization page.', status: 'active' },
  'a3': { title: 'User Authorizes', description: 'User grants permission to the application.', status: 'active' },
  'a4': { title: 'API Callback', description: 'Discord redirects back with authorization code.', status: 'active' },
  'a5': { title: 'JWT Creation', description: 'API exchanges code for tokens and creates JWT.', status: 'active' },
  'a6': { title: 'Logged In', description: 'User is authenticated and can access protected features.', status: 'active' },
  
  // Tile Event Flow nodes (Iron Forged Events)
  'te-user': { title: 'Clan Member', description: 'Iron Forged clan member participating in tile events.', status: 'active' },
  'te-site': { 
    title: 'Iron Forged Events', 
    description: 'Dedicated tile events portal at ironforged-events.emuy.gg',
    tech: ['React', 'TypeScript', 'Tailwind'],
    url: 'https://ironforged-events.emuy.gg',
    features: ['Tile grid view', 'Progress tracking', 'Screenshot upload'],
    status: 'active' 
  },
  't1': { title: 'Select Tile', description: 'User selects a tile to complete from the event grid.', status: 'active' },
  't2': { title: 'Upload Screenshot', description: 'User uploads a screenshot as proof of tile completion.', status: 'active' },
  't3': { title: 'yume-api', description: 'API receives the submission and orchestrates processing.', tech: ['Cloudflare Workers'], status: 'active' },
  't4': { title: 'R2 Storage', description: 'Screenshot image is stored in Cloudflare R2 bucket with a secure random URL.', tech: ['Cloudflare R2'], status: 'active' },
  't5': { title: 'Workers AI OCR', description: 'AI model extracts text from the screenshot image.', tech: ['LLaVA Model', 'Workers AI'], status: 'active' },
  't6': { title: 'Keyword Verification', description: 'System checks if required keywords appear in the OCR text.', status: 'active' },
  't7': { title: 'Save Progress', description: 'Tile completion is saved to D1 database, unlocking the next tile.', tech: ['Cloudflare D1', 'SQLite'], status: 'active' },
  't8': { title: 'Discord Webhook', description: 'Notification sent to Discord channel with submission details.', tech: ['Discord Webhooks'], features: ['Customizable embeds', 'RSN placeholders', 'OCR status'], status: 'active' },
  't9': { title: 'Tile Complete!', description: 'Submission processed successfully - tile marked as complete!', status: 'active' },
};

// =============================================================================
// CUSTOM NODE COMPONENTS
// =============================================================================

interface CustomNodeData {
  label: string;
  sublabel?: string;
  icon?: string;
}

// Base styled node component
function StyledNode({ 
  data, 
  bgColor = 'bg-yume-card',
  borderColor = 'border-yume-border',
  textColor = 'text-white',
  iconBg = 'bg-yume-bg-light'
}: { 
  data: CustomNodeData; 
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  iconBg?: string;
}) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 ${bgColor} ${borderColor} shadow-lg min-w-[140px] cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-200 group`}>
      <Handle type="target" position={Position.Top} className="!bg-yume-accent !w-2 !h-2" />
      <div className="flex items-center gap-3">
        {data.icon && (
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center text-lg`}>
            {data.icon}
          </div>
        )}
        <div>
          <div className={`font-semibold text-sm ${textColor}`}>{data.label}</div>
          {data.sublabel && (
            <div className="text-xs text-gray-500">{data.sublabel}</div>
          )}
        </div>
        <div className="ml-auto text-gray-600 group-hover:text-gray-400 transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-yume-accent !w-2 !h-2" />
    </div>
  );
}

// Frontend node (green accent)
function FrontendNode({ data }: { data: CustomNodeData }) {
  return (
    <StyledNode 
      data={data} 
      bgColor="bg-emerald-500/20" 
      borderColor="border-emerald-500" 
      textColor="text-emerald-300"
      iconBg="bg-emerald-500/30"
    />
  );
}

// Backend node (orange accent)
function BackendNode({ data }: { data: CustomNodeData }) {
  return (
    <StyledNode 
      data={data} 
      bgColor="bg-orange-500/20" 
      borderColor="border-orange-500" 
      textColor="text-orange-300"
      iconBg="bg-orange-500/30"
    />
  );
}

// Database node (cyan accent)
function DatabaseNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="px-4 py-3 rounded-xl border-2 bg-cyan-500/20 border-cyan-500 shadow-lg min-w-[120px] cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-200 group">
      <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-2 !h-2" />
      <div className="flex items-center gap-3">
        {data.icon && (
          <div className="w-8 h-8 rounded-lg bg-cyan-500/30 flex items-center justify-center text-lg">
            {data.icon}
          </div>
        )}
        <div>
          <div className="font-semibold text-sm text-cyan-300">{data.label}</div>
          {data.sublabel && (
            <div className="text-xs text-cyan-500/70">{data.sublabel}</div>
          )}
        </div>
        <div className="ml-auto text-cyan-600 group-hover:text-cyan-400 transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-2 !h-2" />
    </div>
  );
}

// External service node (purple accent)
function ExternalNode({ data }: { data: CustomNodeData }) {
  return (
    <StyledNode 
      data={data} 
      bgColor="bg-purple-500/20" 
      borderColor="border-purple-500" 
      textColor="text-purple-300"
      iconBg="bg-purple-500/30"
    />
  );
}

// User node (blue accent)
function UserNode({ data }: { data: CustomNodeData }) {
  return (
    <StyledNode 
      data={data} 
      bgColor="bg-blue-500/20" 
      borderColor="border-blue-500" 
      textColor="text-blue-300"
      iconBg="bg-blue-500/30"
    />
  );
}

// Group/Section node
function GroupNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="px-4 py-2 rounded-lg bg-yume-bg-light/50 border border-yume-border">
      <div className="font-bold text-xs text-gray-400 uppercase tracking-wider">{data.label}</div>
    </div>
  );
}

// Step node for flow diagrams
function StepNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="px-3 py-2 rounded-lg border bg-yume-card border-yume-border shadow-md min-w-[100px] cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-200">
      <Handle type="target" position={Position.Left} className="!bg-yume-accent !w-2 !h-2" />
      <div className="text-xs text-white text-center">{data.label}</div>
      <Handle type="source" position={Position.Right} className="!bg-yume-accent !w-2 !h-2" />
    </div>
  );
}

// Success node (green checkmark)
function SuccessNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="px-4 py-3 rounded-xl border-2 bg-yume-accent/20 border-yume-accent shadow-lg cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-200">
      <Handle type="target" position={Position.Top} className="!bg-yume-accent !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <span className="text-lg">✅</span>
        <div className="font-semibold text-sm text-yume-accent">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-yume-accent !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = {
  frontend: FrontendNode,
  backend: BackendNode,
  database: DatabaseNode,
  external: ExternalNode,
  user: UserNode,
  group: GroupNode,
  step: StepNode,
  success: SuccessNode,
  default: StyledNode,
};

// =============================================================================
// DIAGRAM DEFINITIONS
// =============================================================================

// System Overview Diagram
const systemOverviewNodes: Node[] = [
  // Users (top row)
  { id: 'discord', type: 'user', position: { x: 0, y: 0 }, data: { label: 'Discord', sublabel: 'Server', icon: '💬' } },
  { id: 'browser', type: 'user', position: { x: 400, y: 0 }, data: { label: 'Browser', sublabel: 'Web App', icon: '🌐' } },
  
  // Frontend (second row)
  { id: 'yume-pages', type: 'frontend', position: { x: 200, y: 120 }, data: { label: 'yume-pages', sublabel: 'emuy.gg', icon: '⚛️' } },
  { id: 'ironforged-events', type: 'frontend', position: { x: 420, y: 120 }, data: { label: 'IF Events', sublabel: 'ironforged-events', icon: '🎮' } },
  { id: 'carrd', type: 'frontend', position: { x: 640, y: 120 }, data: { label: 'Carrd Site', sublabel: 'yumes-tools', icon: '📄' } },
  
  // Widgets (side)
  { id: 'widgets', type: 'external', position: { x: 760, y: 250 }, data: { label: 'Widgets', sublabel: 'jsDelivr CDN', icon: '📦' } },
  
  // Backend (third row)
  { id: 'yume-bot', type: 'backend', position: { x: 0, y: 250 }, data: { label: 'yume-bot', sublabel: 'Railway', icon: '🤖' } },
  { id: 'yume-api', type: 'backend', position: { x: 320, y: 250 }, data: { label: 'yume-api', sublabel: 'api.emuy.gg', icon: '⚡' } },
  
  // Data Layer (fourth row)
  { id: 'd1', type: 'database', position: { x: 140, y: 400 }, data: { label: 'D1 Database', sublabel: 'SQLite', icon: '💾' } },
  { id: 'r2', type: 'database', position: { x: 360, y: 400 }, data: { label: 'R2 Bucket', sublabel: 'Images', icon: '🖼️' } },
  { id: 'discord-api', type: 'database', position: { x: 580, y: 400 }, data: { label: 'Discord API', icon: '🔗' } },
  
  // External Services (bottom row)
  { id: 'gsheets', type: 'external', position: { x: 140, y: 540 }, data: { label: 'Google Sheets', icon: '📊' } },
  { id: 'sesh', type: 'external', position: { x: 380, y: 540 }, data: { label: 'Sesh Calendar', icon: '📅' } },
];

const systemOverviewEdges: Edge[] = [
  { id: 'e1', source: 'browser', target: 'yume-pages', animated: true, style: { stroke: '#a8e6cf' } },
  { id: 'e2', source: 'browser', target: 'ironforged-events', animated: true, style: { stroke: '#10b981' } },
  { id: 'e2b', source: 'browser', target: 'carrd', animated: true, style: { stroke: '#a8e6cf' } },
  { id: 'e3', source: 'discord', target: 'yume-bot', animated: true, style: { stroke: '#5865F2' } },
  { id: 'e4', source: 'yume-pages', target: 'yume-api', animated: true, style: { stroke: '#f38020' } },
  { id: 'e4b', source: 'ironforged-events', target: 'yume-api', animated: true, style: { stroke: '#f38020' } },
  { id: 'e5', source: 'carrd', target: 'widgets', style: { stroke: '#9747FF' } },
  { id: 'e6', source: 'yume-bot', target: 'yume-api', animated: true, style: { stroke: '#f38020' } },
  { id: 'e7', source: 'yume-bot', target: 'discord-api', style: { stroke: '#5865F2' } },
  { id: 'e8', source: 'yume-api', target: 'd1', animated: true, style: { stroke: '#22d3ee' } },
  { id: 'e9', source: 'yume-api', target: 'r2', style: { stroke: '#22d3ee' } },
  { id: 'e10', source: 'yume-api', target: 'discord-api', style: { stroke: '#5865F2' } },
  { id: 'e11', source: 'yume-api', target: 'gsheets', style: { stroke: '#9747FF' } },
  { id: 'e12', source: 'yume-api', target: 'sesh', style: { stroke: '#9747FF' } },
];

// Data Flow Diagram - Authentication
const authFlowNodes: Node[] = [
  { id: 'a1', type: 'step', position: { x: 0, y: 100 }, data: { label: 'User clicks Login' } },
  { id: 'a2', type: 'step', position: { x: 180, y: 100 }, data: { label: 'Redirect to Discord' } },
  { id: 'a3', type: 'step', position: { x: 360, y: 100 }, data: { label: 'Discord authorizes' } },
  { id: 'a4', type: 'step', position: { x: 540, y: 100 }, data: { label: 'Callback to API' } },
  { id: 'a5', type: 'step', position: { x: 720, y: 100 }, data: { label: 'Create JWT token' } },
  { id: 'a6', type: 'success', position: { x: 900, y: 93 }, data: { label: 'Logged In!' } },
];

const authFlowEdges: Edge[] = [
  { id: 'ae1', source: 'a1', target: 'a2', animated: true, style: { stroke: '#a8e6cf' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a8e6cf' } },
  { id: 'ae2', source: 'a2', target: 'a3', animated: true, style: { stroke: '#5865F2' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#5865F2' } },
  { id: 'ae3', source: 'a3', target: 'a4', animated: true, style: { stroke: '#5865F2' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#5865F2' } },
  { id: 'ae4', source: 'a4', target: 'a5', animated: true, style: { stroke: '#f38020' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f38020' } },
  { id: 'ae5', source: 'a5', target: 'a6', animated: true, style: { stroke: '#a8e6cf' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a8e6cf' } },
];

// Tile Event Flow (Iron Forged Events)
const tileEventFlowNodes: Node[] = [
  // User action
  { id: 'te-user', type: 'user', position: { x: 0, y: 0 }, data: { label: 'Clan Member', icon: '👤' } },
  { id: 'te-site', type: 'frontend', position: { x: 0, y: 120 }, data: { label: 'IF Events', sublabel: 'ironforged-events', icon: '🎮' } },
  
  // Submission flow
  { id: 't1', type: 'step', position: { x: 200, y: 120 }, data: { label: 'Select tile' } },
  { id: 't2', type: 'step', position: { x: 350, y: 120 }, data: { label: 'Upload screenshot' } },
  { id: 't3', type: 'backend', position: { x: 530, y: 110 }, data: { label: 'yume-api', sublabel: 'API', icon: '⚡' } },
  
  // Processing
  { id: 't4', type: 'database', position: { x: 350, y: 250 }, data: { label: 'R2 Bucket', sublabel: 'Store image', icon: '🖼️' } },
  { id: 't5', type: 'external', position: { x: 530, y: 250 }, data: { label: 'Workers AI', sublabel: 'OCR', icon: '🧠' } },
  
  // Verification
  { id: 't6', type: 'step', position: { x: 440, y: 380 }, data: { label: 'Verify keywords' } },
  
  // Results
  { id: 't7', type: 'database', position: { x: 280, y: 500 }, data: { label: 'D1 Database', sublabel: 'Save progress', icon: '💾' } },
  { id: 't8', type: 'external', position: { x: 500, y: 500 }, data: { label: 'Discord', sublabel: 'Webhook', icon: '📢' } },
  
  // Success
  { id: 't9', type: 'success', position: { x: 390, y: 620 }, data: { label: 'Tile complete!' } },
];

const tileEventFlowEdges: Edge[] = [
  { id: 'te0', source: 'te-user', target: 'te-site', animated: true, style: { stroke: '#a8e6cf' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a8e6cf' } },
  { id: 'te1', source: 'te-site', target: 't1', animated: true, style: { stroke: '#10b981' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } },
  { id: 'te2', source: 't1', target: 't2', animated: true, style: { stroke: '#a8e6cf' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a8e6cf' } },
  { id: 'te3', source: 't2', target: 't3', animated: true, style: { stroke: '#f38020' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f38020' } },
  { id: 'te4', source: 't3', target: 't4', animated: true, style: { stroke: '#22d3ee' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' } },
  { id: 'te5', source: 't3', target: 't5', animated: true, style: { stroke: '#f38020' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f38020' } },
  { id: 'te6', source: 't5', target: 't6', animated: true, style: { stroke: '#f38020' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f38020' } },
  { id: 'te7', source: 't4', target: 't6', style: { stroke: '#22d3ee' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' } },
  { id: 'te8', source: 't6', target: 't7', animated: true, style: { stroke: '#22d3ee' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' } },
  { id: 'te9', source: 't6', target: 't8', animated: true, style: { stroke: '#5865F2' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#5865F2' } },
  { id: 'te10', source: 't7', target: 't9', animated: true, style: { stroke: '#a8e6cf' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a8e6cf' } },
  { id: 'te11', source: 't8', target: 't9', animated: true, style: { stroke: '#a8e6cf' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a8e6cf' } },
];

// Deployment Pipeline
const deploymentNodes: Node[] = [
  // Dev
  { id: 'd-code', type: 'user', position: { x: 50, y: 50 }, data: { label: 'Write Code', icon: '💻' } },
  { id: 'd-commit', type: 'step', position: { x: 50, y: 150 }, data: { label: 'Git Commit' } },
  { id: 'd-push', type: 'step', position: { x: 50, y: 230 }, data: { label: 'Git Push' } },
  
  // GitHub
  { id: 'd-main', type: 'external', position: { x: 50, y: 330 }, data: { label: 'main branch', sublabel: 'GitHub', icon: '🐙' } },
  
  // Deployments
  { id: 'd-pages', type: 'backend', position: { x: -150, y: 450 }, data: { label: 'CF Pages', sublabel: 'yume-pages', icon: '☁️' } },
  { id: 'd-worker', type: 'backend', position: { x: 50, y: 450 }, data: { label: 'Wrangler', sublabel: 'yume-api', icon: '⚡' } },
  { id: 'd-cdn', type: 'external', position: { x: 250, y: 450 }, data: { label: 'jsDelivr', sublabel: 'yume-tools', icon: '📦' } },
  { id: 'd-railway', type: 'external', position: { x: 450, y: 450 }, data: { label: 'Railway', sublabel: 'yume-bot', icon: '🚂' } },
  
  // Success states
  { id: 'd-pages-ok', type: 'success', position: { x: -150, y: 570 }, data: { label: 'emuy.gg' } },
  { id: 'd-api-ok', type: 'success', position: { x: 50, y: 570 }, data: { label: 'api.emuy.gg' } },
  { id: 'd-cdn-ok', type: 'success', position: { x: 250, y: 570 }, data: { label: 'CDN Live' } },
  { id: 'd-bot-ok', type: 'success', position: { x: 450, y: 570 }, data: { label: 'Bot Online' } },
];

const deploymentEdges: Edge[] = [
  { id: 'de1', source: 'd-code', target: 'd-commit', animated: true, style: { stroke: '#666' } },
  { id: 'de2', source: 'd-commit', target: 'd-push', animated: true, style: { stroke: '#666' } },
  { id: 'de3', source: 'd-push', target: 'd-main', animated: true, style: { stroke: '#238636' } },
  { id: 'de4', source: 'd-main', target: 'd-pages', animated: true, style: { stroke: '#f38020' } },
  { id: 'de5', source: 'd-main', target: 'd-worker', animated: true, style: { stroke: '#f38020' } },
  { id: 'de6', source: 'd-main', target: 'd-cdn', animated: true, style: { stroke: '#9747FF' } },
  { id: 'de7', source: 'd-main', target: 'd-railway', animated: true, style: { stroke: '#9747FF' } },
  { id: 'de8', source: 'd-pages', target: 'd-pages-ok', animated: true, style: { stroke: '#a8e6cf' } },
  { id: 'de9', source: 'd-worker', target: 'd-api-ok', animated: true, style: { stroke: '#a8e6cf' } },
  { id: 'de10', source: 'd-cdn', target: 'd-cdn-ok', animated: true, style: { stroke: '#a8e6cf' } },
  { id: 'de11', source: 'd-railway', target: 'd-bot-ok', animated: true, style: { stroke: '#a8e6cf' } },
];

// Tech Stack Diagram
const techStackNodes: Node[] = [
  // Frontend
  { id: 'ts-react', type: 'frontend', position: { x: 0, y: 50 }, data: { label: 'React 18', icon: '⚛️' } },
  { id: 'ts-vite', type: 'frontend', position: { x: 170, y: 50 }, data: { label: 'Vite', icon: '⚡' } },
  { id: 'ts-tailwind', type: 'frontend', position: { x: 320, y: 50 }, data: { label: 'Tailwind CSS', icon: '🎨' } },
  { id: 'ts-typescript', type: 'frontend', position: { x: 500, y: 50 }, data: { label: 'TypeScript', icon: '📘' } },
  
  // Backend
  { id: 'ts-workers', type: 'backend', position: { x: 0, y: 180 }, data: { label: 'CF Workers', icon: '☁️' } },
  { id: 'ts-nodejs', type: 'backend', position: { x: 170, y: 180 }, data: { label: 'Node.js 20', icon: '🟢' } },
  { id: 'ts-discordjs', type: 'backend', position: { x: 340, y: 180 }, data: { label: 'Discord.js v14', icon: '🤖' } },
  
  // Data
  { id: 'ts-d1', type: 'database', position: { x: 0, y: 310 }, data: { label: 'Cloudflare D1', sublabel: 'SQLite', icon: '💾' } },
  { id: 'ts-r2', type: 'database', position: { x: 200, y: 310 }, data: { label: 'Cloudflare R2', sublabel: 'Object Storage', icon: '🗄️' } },
  { id: 'ts-ai', type: 'database', position: { x: 420, y: 310 }, data: { label: 'Workers AI', sublabel: 'OCR', icon: '🧠' } },
  
  // Auth
  { id: 'ts-oauth', type: 'external', position: { x: 100, y: 440 }, data: { label: 'Discord OAuth2', icon: '🔐' } },
  { id: 'ts-jwt', type: 'external', position: { x: 320, y: 440 }, data: { label: 'JWT Tokens', icon: '🎟️' } },
];

const techStackEdges: Edge[] = [
  { id: 'tse1', source: 'ts-react', target: 'ts-vite', style: { stroke: '#10b981' } },
  { id: 'tse2', source: 'ts-vite', target: 'ts-tailwind', style: { stroke: '#10b981' } },
  { id: 'tse3', source: 'ts-typescript', target: 'ts-react', style: { stroke: '#10b981' } },
  { id: 'tse4', source: 'ts-workers', target: 'ts-d1', animated: true, style: { stroke: '#f38020' } },
  { id: 'tse5', source: 'ts-workers', target: 'ts-r2', animated: true, style: { stroke: '#f38020' } },
  { id: 'tse6', source: 'ts-workers', target: 'ts-ai', style: { stroke: '#f38020' } },
  { id: 'tse7', source: 'ts-nodejs', target: 'ts-discordjs', style: { stroke: '#f38020' } },
  { id: 'tse8', source: 'ts-workers', target: 'ts-oauth', style: { stroke: '#9747FF' } },
  { id: 'tse9', source: 'ts-oauth', target: 'ts-jwt', animated: true, style: { stroke: '#9747FF' } },
];

// Bot Integration Diagram
const botIntegrationNodes: Node[] = [
  // Discord
  { id: 'bi-user', type: 'user', position: { x: 0, y: 100 }, data: { label: 'Discord User', icon: '👤' } },
  { id: 'bi-cmd', type: 'step', position: { x: 0, y: 200 }, data: { label: 'Slash Commands' } },
  
  // Bot
  { id: 'bi-handler', type: 'backend', position: { x: 180, y: 150 }, data: { label: 'Command Handler', sublabel: 'yume-bot', icon: '🤖' } },
  
  // Commands
  { id: 'bi-ping', type: 'step', position: { x: 350, y: 50 }, data: { label: '/ping' } },
  { id: 'bi-leaderboard', type: 'step', position: { x: 350, y: 120 }, data: { label: '/leaderboard' } },
  { id: 'bi-lookup', type: 'step', position: { x: 350, y: 190 }, data: { label: '/lookup' } },
  { id: 'bi-record', type: 'step', position: { x: 350, y: 260 }, data: { label: '/record' } },
  
  // API
  { id: 'bi-api', type: 'backend', position: { x: 520, y: 150 }, data: { label: 'yume-api', icon: '⚡' } },
  
  // Database
  { id: 'bi-db', type: 'database', position: { x: 680, y: 150 }, data: { label: 'D1 Database', icon: '💾' } },
  
  // Response
  { id: 'bi-embed', type: 'success', position: { x: 180, y: 300 }, data: { label: 'Rich Embed' } },
];

const botIntegrationEdges: Edge[] = [
  { id: 'bie1', source: 'bi-user', target: 'bi-cmd', animated: true, style: { stroke: '#5865F2' } },
  { id: 'bie2', source: 'bi-cmd', target: 'bi-handler', animated: true, style: { stroke: '#5865F2' } },
  { id: 'bie3', source: 'bi-handler', target: 'bi-ping', style: { stroke: '#a8e6cf' } },
  { id: 'bie4', source: 'bi-handler', target: 'bi-leaderboard', style: { stroke: '#a8e6cf' } },
  { id: 'bie5', source: 'bi-handler', target: 'bi-lookup', style: { stroke: '#a8e6cf' } },
  { id: 'bie6', source: 'bi-handler', target: 'bi-record', style: { stroke: '#a8e6cf' } },
  { id: 'bie7', source: 'bi-leaderboard', target: 'bi-api', animated: true, style: { stroke: '#f38020' } },
  { id: 'bie8', source: 'bi-lookup', target: 'bi-api', animated: true, style: { stroke: '#f38020' } },
  { id: 'bie9', source: 'bi-record', target: 'bi-api', animated: true, style: { stroke: '#f38020' } },
  { id: 'bie10', source: 'bi-api', target: 'bi-db', animated: true, style: { stroke: '#22d3ee' } },
  { id: 'bie11', source: 'bi-handler', target: 'bi-embed', animated: true, style: { stroke: '#5865F2' } },
];

// =============================================================================
// DIAGRAM CONFIGURATION
// =============================================================================

const diagrams = {
  systemOverview: {
    title: '🏗️ System Overview',
    description: 'High-level view of all Yume Tools components and how they connect.',
    nodes: systemOverviewNodes,
    edges: systemOverviewEdges,
    defaultZoom: 0.9,
  },
  authFlow: {
    title: '🔐 Authentication Flow',
    description: 'How users authenticate via Discord OAuth2.',
    nodes: authFlowNodes,
    edges: authFlowEdges,
    defaultZoom: 1,
  },
  tileEventFlow: {
    title: '🎮 Iron Forged Events',
    description: 'How tile event submissions flow through ironforged-events.emuy.gg - from screenshot upload to OCR verification.',
    nodes: tileEventFlowNodes,
    edges: tileEventFlowEdges,
    defaultZoom: 0.75,
  },
  deployment: {
    title: '🚀 Deployment Pipeline',
    description: 'How code gets from your editor to production.',
    nodes: deploymentNodes,
    edges: deploymentEdges,
    defaultZoom: 0.85,
  },
  techStack: {
    title: '🛠️ Technology Stack',
    description: 'Technologies used across the ecosystem.',
    nodes: techStackNodes,
    edges: techStackEdges,
    defaultZoom: 0.9,
  },
  botIntegration: {
    title: '🤖 Discord Bot',
    description: 'How yume-bot connects with the ecosystem.',
    nodes: botIntegrationNodes,
    edges: botIntegrationEdges,
    defaultZoom: 1,
  },
};

type DiagramKey = keyof typeof diagrams;

// =============================================================================
// NODE DETAILS MODAL
// =============================================================================

function NodeDetailsModal({ 
  nodeId, 
  onClose 
}: { 
  nodeId: string; 
  onClose: () => void;
}) {
  const details = nodeDetailsMap[nodeId];
  
  if (!details) {
    return null;
  }

  const statusColors = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
    development: 'bg-amber-500/20 text-amber-400 border-amber-500',
    planned: 'bg-gray-500/20 text-gray-400 border-gray-500',
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-yume-card rounded-2xl border border-yume-border max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">{details.title}</h3>
            {details.status && (
              <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full border ${statusColors[details.status]}`}>
                {details.status === 'active' ? '✅ Active' : details.status === 'development' ? '🚧 In Development' : '📋 Planned'}
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-4">{details.description}</p>

        {/* Tech Stack */}
        {details.tech && details.tech.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Technologies</h4>
            <div className="flex flex-wrap gap-2">
              {details.tech.map((t) => (
                <span key={t} className="px-2 py-1 text-xs rounded-lg bg-yume-bg-light text-gray-300 border border-yume-border">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        {details.features && details.features.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Features</h4>
            <ul className="space-y-1">
              {details.features.map((f) => (
                <li key={f} className="text-sm text-gray-400 flex items-center gap-2">
                  <span className="text-yume-accent">•</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* URL */}
        {details.url && (
          <a 
            href={details.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-yume-accent hover:underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {details.url}
          </a>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// REACT FLOW WRAPPER COMPONENT
// =============================================================================

function DiagramView({ 
  nodes: initialNodes, 
  edges: initialEdges,
  defaultZoom = 1,
  onNodeClick,
}: { 
  nodes: Node[]; 
  edges: Edge[];
  defaultZoom?: number;
  onNodeClick?: (nodeId: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Reset nodes/edges when diagram changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (onNodeClick && nodeDetailsMap[node.id]) {
      onNodeClick(node.id);
    }
  }, [onNodeClick]);

  return (
    <div className="h-[500px] bg-yume-bg rounded-xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: defaultZoom }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#333" gap={20} />
        <Controls className="!bg-yume-card !border-yume-border !rounded-lg [&>button]:!bg-yume-bg-light [&>button]:!border-yume-border [&>button]:!text-white [&>button:hover]:!bg-yume-accent [&>button:hover]:!text-yume-bg" />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.type) {
              case 'frontend': return '#10b981';
              case 'backend': return '#f38020';
              case 'database': return '#22d3ee';
              case 'external': return '#9747FF';
              case 'user': return '#3b82f6';
              case 'success': return '#a8e6cf';
              default: return '#666';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
          className="!bg-yume-card !border-yume-border !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Architecture() {
  const { user, loading, hasPermission, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeDiagram, setActiveDiagram] = useState<DiagramKey>('systemOverview');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Check permission (admins always have access)
  const canViewArchitecture = isAdmin || hasPermission('view_architecture');

  // Redirect if not authenticated or missing permission
  useEffect(() => {
    if (!loading && (!user || !canViewArchitecture)) {
      navigate('/');
    }
  }, [user, loading, canViewArchitecture, navigate]);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedNode(null);
  }, []);

  if (loading || !user || !canViewArchitecture) {
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
          <span className="text-gray-500 ml-2">Click nodes for details • Drag to move • Scroll to zoom</span>
        </p>
      </div>

      {/* Diagram Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
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
        
        <DiagramView 
          nodes={currentDiagram.nodes}
          edges={currentDiagram.edges}
          defaultZoom={currentDiagram.defaultZoom}
          onNodeClick={handleNodeClick}
        />
      </div>

      {/* Node Details Modal */}
      {selectedNode && (
        <NodeDetailsModal 
          nodeId={selectedNode} 
          onClose={handleCloseModal} 
        />
      )}

      {/* Legend */}
      <div className="bg-yume-card rounded-2xl border border-yume-border p-6 mb-8">
        <h3 className="font-semibold text-white mb-4">📖 Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500"></div>
            <span className="text-sm text-gray-400">Frontend</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span className="text-sm text-gray-400">Backend</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-cyan-500"></div>
            <span className="text-sm text-gray-400">Database</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-500"></div>
            <span className="text-sm text-gray-400">External Service</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-sm text-gray-400">User/Input</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yume-accent"></div>
            <span className="text-sm text-gray-400">Success/Output</span>
          </div>
        </div>
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
          <code className="text-yume-accent text-xs">api.emuy.gg</code>
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
