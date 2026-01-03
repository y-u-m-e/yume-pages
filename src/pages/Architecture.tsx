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

import { useState, useEffect, useCallback, useMemo } from 'react';
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
    <div className={`px-4 py-3 rounded-xl border-2 ${bgColor} ${borderColor} shadow-lg min-w-[140px]`}>
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
    <div className="px-4 py-3 rounded-xl border-2 bg-cyan-500/20 border-cyan-500 shadow-lg min-w-[120px]">
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
    <div className="px-3 py-2 rounded-lg border bg-yume-card border-yume-border shadow-md min-w-[100px]">
      <Handle type="target" position={Position.Left} className="!bg-yume-accent !w-2 !h-2" />
      <div className="text-xs text-white text-center">{data.label}</div>
      <Handle type="source" position={Position.Right} className="!bg-yume-accent !w-2 !h-2" />
    </div>
  );
}

// Success node (green checkmark)
function SuccessNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="px-4 py-3 rounded-xl border-2 bg-yume-accent/20 border-yume-accent shadow-lg">
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
  // Users
  { id: 'discord', type: 'user', position: { x: 50, y: 50 }, data: { label: 'Discord', sublabel: 'Server', icon: '💬' } },
  { id: 'browser', type: 'user', position: { x: 250, y: 50 }, data: { label: 'Browser', sublabel: 'Web App', icon: '🌐' } },
  
  // Frontend
  { id: 'yume-pages', type: 'frontend', position: { x: 200, y: 180 }, data: { label: 'yume-pages', sublabel: 'emuy.gg', icon: '⚛️' } },
  { id: 'carrd', type: 'frontend', position: { x: 400, y: 180 }, data: { label: 'Carrd Site', sublabel: 'yumes-tools', icon: '📄' } },
  
  // Widgets
  { id: 'widgets', type: 'external', position: { x: 500, y: 300 }, data: { label: 'Widgets', sublabel: 'jsDelivr CDN', icon: '📦' } },
  
  // Backend
  { id: 'yume-api', type: 'backend', position: { x: 200, y: 350 }, data: { label: 'yume-api', sublabel: 'api.emuy.gg', icon: '⚡' } },
  { id: 'yume-bot', type: 'backend', position: { x: 0, y: 350 }, data: { label: 'yume-bot', sublabel: 'Railway', icon: '🤖' } },
  
  // Data Layer
  { id: 'd1', type: 'database', position: { x: 100, y: 500 }, data: { label: 'D1 Database', sublabel: 'SQLite', icon: '💾' } },
  { id: 'r2', type: 'database', position: { x: 280, y: 500 }, data: { label: 'R2 Bucket', sublabel: 'Images', icon: '🖼️' } },
  { id: 'discord-api', type: 'database', position: { x: 460, y: 500 }, data: { label: 'Discord API', icon: '🔗' } },
  
  // External
  { id: 'gsheets', type: 'external', position: { x: 100, y: 620 }, data: { label: 'Google Sheets', icon: '📊' } },
  { id: 'sesh', type: 'external', position: { x: 280, y: 620 }, data: { label: 'Sesh Calendar', icon: '📅' } },
];

const systemOverviewEdges: Edge[] = [
  { id: 'e1', source: 'browser', target: 'yume-pages', animated: true, style: { stroke: '#a8e6cf' } },
  { id: 'e2', source: 'browser', target: 'carrd', animated: true, style: { stroke: '#a8e6cf' } },
  { id: 'e3', source: 'discord', target: 'yume-bot', animated: true, style: { stroke: '#5865F2' } },
  { id: 'e4', source: 'yume-pages', target: 'yume-api', animated: true, style: { stroke: '#f38020' } },
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

// Tile Event Flow
const tileEventFlowNodes: Node[] = [
  { id: 't1', type: 'step', position: { x: 0, y: 100 }, data: { label: 'Submit screenshot' } },
  { id: 't2', type: 'step', position: { x: 180, y: 100 }, data: { label: 'Upload to R2' } },
  { id: 't3', type: 'step', position: { x: 360, y: 100 }, data: { label: 'OCR via Workers AI' } },
  { id: 't4', type: 'step', position: { x: 540, y: 100 }, data: { label: 'Verify keywords' } },
  { id: 't5', type: 'success', position: { x: 720, y: 93 }, data: { label: 'Progress saved!' } },
];

const tileEventFlowEdges: Edge[] = [
  { id: 'te1', source: 't1', target: 't2', animated: true, style: { stroke: '#a8e6cf' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a8e6cf' } },
  { id: 'te2', source: 't2', target: 't3', animated: true, style: { stroke: '#22d3ee' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' } },
  { id: 'te3', source: 't3', target: 't4', animated: true, style: { stroke: '#f38020' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f38020' } },
  { id: 'te4', source: 't4', target: 't5', animated: true, style: { stroke: '#a8e6cf' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a8e6cf' } },
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
    title: '🎮 Tile Event Flow',
    description: 'How screenshot submissions are processed and verified.',
    nodes: tileEventFlowNodes,
    edges: tileEventFlowEdges,
    defaultZoom: 1,
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
// REACT FLOW WRAPPER COMPONENT
// =============================================================================

function DiagramView({ 
  nodes: initialNodes, 
  edges: initialEdges,
  defaultZoom = 1 
}: { 
  nodes: Node[]; 
  edges: Edge[];
  defaultZoom?: number;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Reset nodes/edges when diagram changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="h-[500px] bg-yume-bg rounded-xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
          <span className="text-gray-500 ml-2">Drag nodes • Scroll to zoom • Pan to move</span>
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
        />
      </div>

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
