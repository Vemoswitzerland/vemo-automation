'use client'

import React, { useCallback, useEffect, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Handle,
  Position,
  NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'

// ─── Custom Node Types ───────────────────────────────────────────────────────

interface ConnectorNodeData {
  label: string
  icon: string
  status: 'active' | 'idle' | 'error' | 'paused'
  stats?: string
  type: string
}

function ConnectorNode({ data }: NodeProps<ConnectorNodeData>) {
  const statusColor = {
    active: 'border-vemo-green-500 shadow-vemo-green-500/20',
    idle: 'border-vemo-dark-600',
    error: 'border-error-500 shadow-error-500/20',
    paused: 'border-warning-500 shadow-warning-500/20',
  }[data.status]

  const statusDot = {
    active: 'bg-vemo-green-400 animate-pulse',
    idle: 'bg-vemo-dark-500',
    error: 'bg-error-400 animate-pulse',
    paused: 'bg-warning-400',
  }[data.status]

  return (
    <div
      className={`bg-vemo-dark-900 border-2 rounded-xl px-4 py-3 shadow-lg min-w-[140px] ${statusColor} shadow-lg`}
      style={{ fontFamily: 'inherit' }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#4b5563', border: 'none' }} />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{data.icon}</span>
        <div>
          <div className="text-vemo-dark-100 font-semibold text-sm">{data.label}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
            <span className="text-xs text-vemo-dark-400 capitalize">{data.status}</span>
          </div>
        </div>
      </div>
      {data.stats && (
        <div className="text-xs text-vemo-green-400 mt-1 border-t border-vemo-dark-800 pt-1">{data.stats}</div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#4b5563', border: 'none' }} />
    </div>
  )
}

interface FlowNodeData {
  label: string
  icon: string
  status: 'running' | 'stopped' | 'error'
  description: string
}

function FlowNode({ data }: NodeProps<FlowNodeData>) {
  const statusColor = {
    running: 'border-vemo-green-500 shadow-vemo-green-500/20',
    stopped: 'border-vemo-dark-600',
    error: 'border-error-500',
  }[data.status]

  return (
    <div
      className={`bg-vemo-dark-800 border-2 rounded-xl px-4 py-3 shadow-lg min-w-[160px] ${statusColor}`}
      style={{ fontFamily: 'inherit' }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#4b5563', border: 'none' }} />
      <div className="flex items-center gap-2">
        <span className="text-xl">{data.icon}</span>
        <div>
          <div className="text-vemo-dark-100 font-semibold text-sm">{data.label}</div>
          <div className="text-xs text-vemo-dark-400 mt-0.5">{data.description}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#4b5563', border: 'none' }} />
    </div>
  )
}

const nodeTypes = { connector: ConnectorNode, flowNode: FlowNode }

// ─── Initial Graph Data ──────────────────────────────────────────────────────

const initialNodes: Node[] = [
  // Sources
  {
    id: 'gmail',
    type: 'connector',
    position: { x: 50, y: 80 },
    data: { label: 'Gmail', icon: '📧', status: 'active', stats: '12 neue Mails', type: 'source' },
  },
  {
    id: 'instagram',
    type: 'connector',
    position: { x: 50, y: 250 },
    data: { label: 'Instagram', icon: '📸', status: 'active', stats: '3 Posts geplant', type: 'source' },
  },
  {
    id: 'schedule',
    type: 'connector',
    position: { x: 50, y: 420 },
    data: { label: 'Scheduler', icon: '⏰', status: 'active', stats: 'Täglich 09:00', type: 'source' },
  },

  // Processing nodes
  {
    id: 'ai-analysis',
    type: 'flowNode',
    position: { x: 300, y: 80 },
    data: { label: 'KI-Analyse', icon: '🤖', status: 'running', description: 'Claude AI' },
  },
  {
    id: 'content-gen',
    type: 'flowNode',
    position: { x: 300, y: 260 },
    data: { label: 'Content-Generator', icon: '✍️', status: 'running', description: 'Text + Bild' },
  },
  {
    id: 'approval',
    type: 'flowNode',
    position: { x: 560, y: 170 },
    data: { label: 'User-Approval', icon: '✅', status: 'running', description: 'Warte auf OK' },
  },

  // Outputs
  {
    id: 'email-draft',
    type: 'connector',
    position: { x: 820, y: 80 },
    data: { label: 'E-Mail Draft', icon: '📝', status: 'idle', stats: '2 warten', type: 'output' },
  },
  {
    id: 'post-publisher',
    type: 'connector',
    position: { x: 820, y: 250 },
    data: { label: 'Post Publisher', icon: '🚀', status: 'idle', stats: 'Bereit', type: 'output' },
  },
  {
    id: 'telegram',
    type: 'connector',
    position: { x: 820, y: 420 },
    data: { label: 'Telegram', icon: '💬', status: 'paused', stats: 'Konfigurieren', type: 'output' },
  },
]

const initialEdges: Edge[] = [
  {
    id: 'e-gmail-ai',
    source: 'gmail',
    target: 'ai-analysis',
    animated: true,
    style: { stroke: '#0ea5e9', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
    label: 'eingehende Mails',
    labelStyle: { fill: '#94a3b8', fontSize: 11 },
    labelBgStyle: { fill: '#1e293b' },
  },
  {
    id: 'e-instagram-content',
    source: 'instagram',
    target: 'content-gen',
    animated: true,
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
    label: 'Vorlagen',
    labelStyle: { fill: '#94a3b8', fontSize: 11 },
    labelBgStyle: { fill: '#1e293b' },
  },
  {
    id: 'e-schedule-content',
    source: 'schedule',
    target: 'content-gen',
    animated: false,
    style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5,5' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
    label: 'Trigger',
    labelStyle: { fill: '#94a3b8', fontSize: 11 },
    labelBgStyle: { fill: '#1e293b' },
  },
  {
    id: 'e-ai-approval',
    source: 'ai-analysis',
    target: 'approval',
    animated: true,
    style: { stroke: '#0ea5e9', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
  },
  {
    id: 'e-content-approval',
    source: 'content-gen',
    target: 'approval',
    animated: true,
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
  },
  {
    id: 'e-approval-email',
    source: 'approval',
    target: 'email-draft',
    animated: false,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: 'genehmigt',
    labelStyle: { fill: '#94a3b8', fontSize: 11 },
    labelBgStyle: { fill: '#1e293b' },
  },
  {
    id: 'e-approval-post',
    source: 'approval',
    target: 'post-publisher',
    animated: false,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: 'genehmigt',
    labelStyle: { fill: '#94a3b8', fontSize: 11 },
    labelBgStyle: { fill: '#1e293b' },
  },
  {
    id: 'e-schedule-telegram',
    source: 'schedule',
    target: 'telegram',
    animated: false,
    style: { stroke: '#6b7280', strokeWidth: 1.5, strokeDasharray: '5,5' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
  },
]

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#0ea5e9', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
          },
          eds
        )
      ),
    [setEdges]
  )

  return (
    <div style={{ width: '100%', height: '520px' }} className="rounded-xl overflow-hidden border border-vemo-dark-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-right"
        style={{ background: '#0f172a' }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls
          style={{ background: '#1e293b', border: '1px solid #374151' }}
        />
        <MiniMap
          style={{ background: '#1e293b', border: '1px solid #374151' }}
          nodeColor={(n) => {
            if (n.type === 'connector') return '#0ea5e9'
            return '#6366f1'
          }}
        />
      </ReactFlow>
    </div>
  )
}
