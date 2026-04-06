'use client'

import React, { useCallback, useRef, useState, useEffect } from 'react'
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
  ReactFlowInstance,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'

// ─── Node Type Definitions ────────────────────────────────────────────────────

export interface FlowNodeData {
  label: string
  icon: string
  nodeType: 'trigger' | 'action' | 'condition' | 'integration' | 'module'
  subType: string
  config: Record<string, string>
}

const NODE_COLORS: Record<FlowNodeData['nodeType'], { border: string; bg: string; text: string; dot: string }> = {
  trigger: { border: 'border-blue-400', bg: 'bg-blue-950', text: 'text-blue-300', dot: 'bg-blue-400' },
  action: { border: 'border-purple-400', bg: 'bg-purple-950', text: 'text-purple-300', dot: 'bg-purple-400' },
  condition: { border: 'border-yellow-400', bg: 'bg-yellow-950', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  integration: { border: 'border-green-400', bg: 'bg-green-950', text: 'text-green-300', dot: 'bg-green-400' },
  module: { border: 'border-orange-400', bg: 'bg-orange-950', text: 'text-orange-300', dot: 'bg-orange-400' },
}

function BuilderNode({ data, selected }: NodeProps<FlowNodeData>) {
  const colors = NODE_COLORS[data.nodeType]
  const isModule = data.nodeType === 'module'
  return (
    <div
      className={`border-2 rounded-xl shadow-lg transition-all ${isModule ? 'px-4 py-3 min-w-[180px] max-w-[220px]' : 'px-4 py-3 min-w-[150px] max-w-[200px]'} ${colors.border} ${colors.bg} ${selected ? 'ring-2 ring-white/30 shadow-xl' : ''}`}
    >
      {data.nodeType !== 'trigger' && (
        <Handle type="target" position={Position.Left} style={{ background: '#4b5563', border: '2px solid #6b7280', width: 10, height: 10 }} />
      )}
      <div className="flex items-center gap-2">
        <span className={isModule ? 'text-2xl' : 'text-xl'}>{data.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm truncate">{data.label}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            <span className={`text-xs capitalize ${colors.text}`}>{isModule ? 'Modul' : data.nodeType}</span>
          </div>
        </div>
      </div>
      {isModule && (
        <div className={`mt-2 pt-2 border-t ${colors.border} opacity-50`}>
          <span className={`text-[10px] ${colors.text}`}>{data.subType.replace(/_/g, ' ')}</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#4b5563', border: '2px solid #6b7280', width: 10, height: 10 }} />
    </div>
  )
}

const nodeTypes = { builderNode: BuilderNode }

// ─── Palette Data ─────────────────────────────────────────────────────────────

const PALETTE_ITEMS: {
  category: string
  nodeType: FlowNodeData['nodeType']
  items: { icon: string; label: string; subType: string; defaultConfig: Record<string, string> }[]
}[] = [
  {
    category: 'Trigger',
    nodeType: 'trigger',
    items: [
      { icon: '⏰', label: 'Schedule', subType: 'schedule', defaultConfig: { cron: '0 9 * * *', label: 'Täglich 09:00' } },
      { icon: '📧', label: 'E-Mail Eingang', subType: 'email_incoming', defaultConfig: { filter: '' } },
      { icon: '💬', label: 'WhatsApp', subType: 'whatsapp_incoming', defaultConfig: { filter: '' } },
      { icon: '📨', label: 'Telegram', subType: 'telegram_incoming', defaultConfig: { chatId: '' } },
      { icon: '🔗', label: 'Webhook', subType: 'webhook', defaultConfig: { path: '/webhook' } },
    ],
  },
  {
    category: 'Action',
    nodeType: 'action',
    items: [
      { icon: '🤖', label: 'KI-Analyse', subType: 'ai_analyze', defaultConfig: { model: 'claude-sonnet-4-6', prompt: '' } },
      { icon: '✍️', label: 'Content Generator', subType: 'content_generate', defaultConfig: { type: 'instagram', prompt: '' } },
      { icon: '📤', label: 'E-Mail Senden', subType: 'email_send', defaultConfig: { to: '', subject: '' } },
      { icon: '📸', label: 'Instagram Post', subType: 'instagram_post', defaultConfig: { caption: '' } },
      { icon: '💬', label: 'Telegram Senden', subType: 'telegram_send', defaultConfig: { chatId: '', message: '' } },
      { icon: '📱', label: 'WhatsApp Antwort', subType: 'whatsapp_reply', defaultConfig: { message: '' } },
      { icon: '🏢', label: 'PaperClip CEO', subType: 'paperclip_ceo', defaultConfig: { description: '', companyId: '', autoCreateAgents: 'true' } },
      { icon: '📊', label: 'Report generieren', subType: 'report_generate', defaultConfig: { type: 'weekly', format: 'pdf', recipient: '' } },
      { icon: '📘', label: 'Facebook Post', subType: 'facebook_post', defaultConfig: { caption: '', connection: '' } },
      { icon: '💼', label: 'LinkedIn Post', subType: 'linkedin_post', defaultConfig: { caption: '', connection: '' } },
    ],
  },
  {
    category: 'Condition',
    nodeType: 'condition',
    items: [
      { icon: '🔀', label: 'Wenn / Dann', subType: 'if_then', defaultConfig: { condition: '' } },
      { icon: '🔢', label: 'Filter', subType: 'filter', defaultConfig: { field: '', operator: 'contains', value: '' } },
      { icon: '⏱️', label: 'Delay', subType: 'delay', defaultConfig: { duration: '5', unit: 'minutes' } },
    ],
  },
  {
    category: 'Integration',
    nodeType: 'integration',
    items: [
      { icon: '📧', label: 'Gmail', subType: 'gmail', defaultConfig: { account: '' } },
      { icon: '🤖', label: 'Claude AI', subType: 'claude_ai', defaultConfig: { model: 'claude-sonnet-4-6' } },
      { icon: '📸', label: 'Instagram API', subType: 'instagram_api', defaultConfig: { account: '' } },
      { icon: '💼', label: 'LinkedIn', subType: 'linkedin_api', defaultConfig: { account: '' } },
    ],
  },
  {
    category: 'Approval',
    nodeType: 'condition',
    items: [
      { icon: '✅', label: 'Telegram Approval', subType: 'telegram_approval', defaultConfig: { botToken: '', chatId: '', message: 'Bitte bestätigen', timeout: '24h' } },
      { icon: '👤', label: 'Manuelles Approval', subType: 'manual_approval', defaultConfig: { assignee: '', message: '' } },
    ],
  },
]

// ─── Properties Panel ─────────────────────────────────────────────────────────

const CONFIG_LABELS: Record<string, string> = {
  cron: 'Cron-Ausdruck',
  label: 'Bezeichnung',
  filter: 'Filter',
  chatId: 'Chat-ID',
  path: 'Pfad',
  model: 'KI-Modell',
  prompt: 'Prompt',
  type: 'Typ',
  to: 'Empfänger',
  subject: 'Betreff',
  caption: 'Beschreibung',
  message: 'Nachricht',
  condition: 'Bedingung',
  field: 'Feld',
  operator: 'Operator',
  value: 'Wert',
  duration: 'Dauer',
  unit: 'Einheit',
  account: 'Account',
  source: 'Quelle',
  score_min: 'Min. Lead-Score',
  tag: 'Tag',
  template: 'Template',
  from: 'Absender / Von',
  keyword: 'Schlüsselwort',
  hashtags: 'Hashtags',
  schedule: 'Zeitplanung',
  format: 'Format',
  recipient: 'Empfänger',
  else_action: 'Else-Aktion',
  connection: 'Verbindung',
  companyId: 'PaperClip Company',
  autoCreateAgents: 'Auto Agents erstellen',
  botToken: 'Bot Token',
  timeout: 'Timeout',
  assignee: 'Zuständig',
  description: 'Beschreibung',
}

function PropertiesPanel({
  node,
  onUpdate,
  onDelete,
}: {
  node: Node<FlowNodeData> | null
  onUpdate: (id: string, data: Partial<FlowNodeData>) => void
  onDelete: (id: string) => void
}) {
  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="text-4xl mb-3">🎯</div>
        <p className="text-sm font-medium text-gray-600">Node auswählen</p>
        <p className="text-xs text-gray-400 mt-1">Klicke einen Node um seine Einstellungen zu sehen</p>
      </div>
    )
  }

  const colors = NODE_COLORS[node.data.nodeType]

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className={`p-4 border-b border-gray-200 ${colors.bg.replace('bg-', 'bg-').replace('950', '50')}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{node.data.icon}</span>
          <div>
            <div className={`text-xs font-semibold uppercase tracking-wider ${colors.text.replace('300', '600')}`}>
              {node.data.nodeType}
            </div>
            <div className="text-sm font-medium text-gray-800">{node.data.subType.replace(/_/g, ' ')}</div>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 space-y-4">
        {/* Label */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</label>
          <input
            type="text"
            value={node.data.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
        </div>

        {/* Config fields */}
        {Object.entries(node.data.config).map(([key, value]) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              {CONFIG_LABELS[key] ?? key}
            </label>
            {['connection', 'botToken', 'account', 'companyId'].includes(key) ? (
              <select
                value={value}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    window.open('/connections', '_blank')
                    return
                  }
                  onUpdate(node.id, { config: { ...node.data.config, [key]: e.target.value } })
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Bestehende Verbindung wählen...</option>
                {value && <option value={value}>{value}</option>}
                <option value="__new__">→ Neue Verbindung hinzufügen</option>
              </select>
            ) : key === 'description' ? (
              <textarea
                value={value}
                onChange={(e) => onUpdate(node.id, { config: { ...node.data.config, [key]: e.target.value } })}
                rows={6}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
                placeholder="Beschreibe was der CEO tun soll..."
              />
            ) : key === 'prompt' ? (
              <textarea
                value={value}
                onChange={(e) => onUpdate(node.id, { config: { ...node.data.config, [key]: e.target.value } })}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
                placeholder="Prompt eingeben..."
              />
            ) : key === 'model' ? (
              <select
                value={value}
                onChange={(e) => onUpdate(node.id, { config: { ...node.data.config, [key]: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                <option value="claude-opus-4-6">Claude Opus 4.6</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
              </select>
            ) : key === 'unit' ? (
              <select
                value={value}
                onChange={(e) => onUpdate(node.id, { config: { ...node.data.config, [key]: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="seconds">Sekunden</option>
                <option value="minutes">Minuten</option>
                <option value="hours">Stunden</option>
              </select>
            ) : key === 'format' ? (
              <select
                value={value}
                onChange={(e) => onUpdate(node.id, { config: { ...node.data.config, [key]: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
              </select>
            ) : key === 'type' && node.data.subType === 'report_generate' ? (
              <select
                value={value}
                onChange={(e) => onUpdate(node.id, { config: { ...node.data.config, [key]: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="weekly">Wöchentlich</option>
                <option value="monthly">Monatlich</option>
                <option value="custom">Benutzerdefiniert</option>
              </select>
            ) : key === 'operator' ? (
              <select
                value={value}
                onChange={(e) => onUpdate(node.id, { config: { ...node.data.config, [key]: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="equals">= Gleich</option>
                <option value="not_equals">≠ Ungleich</option>
                <option value="contains">Enthält</option>
                <option value="greater_than">&gt; Grösser als</option>
                <option value="less_than">&lt; Kleiner als</option>
              </select>
            ) : (
              <input
                type="text"
                value={value}
                onChange={(e) => onUpdate(node.id, { config: { ...node.data.config, [key]: e.target.value } })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                placeholder={`${CONFIG_LABELS[key] ?? key} eingeben...`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Delete */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => onDelete(node.id)}
          className="w-full px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium"
        >
          🗑️ Node löschen
        </button>
      </div>
    </div>
  )
}

// ─── Main FlowBuilder ─────────────────────────────────────────────────────────

let nodeIdCounter = 100

interface FlowBuilderProps {
  flowId?: string
  initialName?: string
  initialNodes?: Node[]
  initialEdges?: Edge[]
}

export default function FlowBuilder({ flowId, initialName, initialNodes, initialEdges }: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes ?? [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges ?? [])
  const [selectedNode, setSelectedNode] = useState<Node<FlowNodeData> | null>(null)
  const [flowName, setFlowName] = useState(initialName ?? 'Unbenannter Flow')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [isPaletteOpen, setIsPaletteOpen] = useState(true)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showValidation, setShowValidation] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
          },
          eds
        )
      ),
    [setEdges]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node as Node<FlowNodeData>)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      if (!rfInstance || !reactFlowWrapper.current) return

      const dataStr = event.dataTransfer.getData('application/vemo-node')
      if (!dataStr) return

      const paletteItem = JSON.parse(dataStr)
      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = rfInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })

      const newNode: Node<FlowNodeData> = {
        id: `node-${++nodeIdCounter}`,
        type: 'builderNode',
        position,
        data: {
          label: paletteItem.label,
          icon: paletteItem.icon,
          nodeType: paletteItem.nodeType,
          subType: paletteItem.subType,
          config: paletteItem.defaultConfig,
        },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [rfInstance, setNodes]
  )

  const updateNode = useCallback(
    (id: string, data: Partial<FlowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
      )
      setSelectedNode((prev) =>
        prev?.id === id ? { ...prev, data: { ...prev.data, ...data } as FlowNodeData } : prev
      )
    },
    [setNodes]
  )

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
      setSelectedNode(null)
    },
    [setNodes, setEdges]
  )

  const saveFlow = useCallback(async () => {
    setSaving(true)
    setSaveStatus('idle')
    try {
      const body = { name: flowName, nodes, edges, incrementVersion: true }
      let res: Response
      if (flowId) {
        res = await fetch(`/api/flows/${flowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/flows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const data = await res.json()
          // Update URL without navigation
          window.history.replaceState({}, '', `/flows/builder?id=${data.id}`)
        }
      }
      setSaveStatus(res.ok ? 'saved' : 'error')
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [flowId, flowName, nodes, edges])

  const deployFlow = useCallback(async () => {
    if (!flowId) {
      alert('Bitte zuerst speichern!')
      return
    }
    await fetch(`/api/flows/${flowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }, [flowId])

  const validateFlow = useCallback(() => {
    const errors: string[] = []
    const triggerNodes = nodes.filter((n) => (n.data as FlowNodeData).nodeType === 'trigger')
    if (triggerNodes.length === 0) errors.push('Kein Trigger-Node vorhanden. Füge mindestens einen Trigger hinzu.')
    if (triggerNodes.length > 1) errors.push('Mehrere Trigger-Nodes gefunden. Empfehlung: nur ein Trigger pro Flow.')

    // Check for disconnected nodes (not trigger, no incoming edge)
    const targetIds = new Set(edges.map((e) => e.target))
    const sourceIds = new Set(edges.map((e) => e.source))
    nodes.forEach((n) => {
      const data = n.data as FlowNodeData
      if (data.nodeType !== 'trigger' && !targetIds.has(n.id)) {
        errors.push(`Node "${data.label}" hat keine eingehende Verbindung.`)
      }
      if (!sourceIds.has(n.id) && data.nodeType !== 'action' && data.nodeType !== 'integration') {
        // Only warn for condition nodes without outgoing edges
        if (data.nodeType === 'condition') {
          errors.push(`Condition-Node "${data.label}" hat keine ausgehende Verbindung.`)
        }
      }
    })

    // Check required config fields
    nodes.forEach((n) => {
      const data = n.data as FlowNodeData
      if (data.subType === 'telegram_incoming' && !data.config.chatId) {
        errors.push(`Node "${data.label}": Chat-ID fehlt.`)
      }
      if (data.subType === 'email_send' && !data.config.to) {
        errors.push(`Node "${data.label}": Empfänger fehlt.`)
      }
      if (data.subType === 'telegram_send' && !data.config.chatId) {
        errors.push(`Node "${data.label}": Chat-ID fehlt.`)
      }
    })

    setValidationErrors(errors)
    setShowValidation(true)
    return errors.length === 0
  }, [nodes, edges])

  const exportFlow = useCallback(() => {
    const data = { name: flowName, nodes, edges, exportedAt: new Date().toISOString(), version: 1 }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flowName.replace(/\s+/g, '_')}.flow.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [flowName, nodes, edges])

  const importFlow = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.name) setFlowName(data.name)
        if (Array.isArray(data.nodes)) setNodes(data.nodes)
        if (Array.isArray(data.edges)) setEdges(data.edges)
      } catch {
        alert('Ungültige Flow-Datei')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [setNodes, setEdges])

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-[600px] bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0 flex-wrap">
        <button
          onClick={() => setIsPaletteOpen((v) => !v)}
          className="text-gray-500 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          title="Palette ein-/ausblenden"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <input
          type="text"
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          className="flex-1 max-w-xs px-3 py-1.5 text-sm font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-600 font-medium">✓ Gespeichert</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-600 font-medium">⚠ Fehler</span>
          )}
          <span className="text-xs text-gray-400 hidden sm:block">
            {nodes.length} Nodes · {edges.length} Verbindungen
          </span>

          {/* Preview toggle */}
          <button
            onClick={() => setIsPreviewMode((v) => !v)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isPreviewMode ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {isPreviewMode ? '✏️ Bearbeiten' : '👁 Vorschau'}
          </button>

          {/* Validate */}
          <button
            onClick={validateFlow}
            className="px-3 py-1.5 text-sm font-medium border border-yellow-300 text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            ✅ Validieren
          </button>

          {/* Export */}
          <button
            onClick={exportFlow}
            className="px-3 py-1.5 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Flow als JSON exportieren"
          >
            ⬇ Export
          </button>

          {/* Import */}
          <input ref={importInputRef} type="file" accept=".json" onChange={importFlow} className="hidden" />
          <button
            onClick={() => importInputRef.current?.click()}
            className="px-3 py-1.5 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Flow aus JSON importieren"
          >
            ⬆ Import
          </button>

          <button
            onClick={saveFlow}
            disabled={saving}
            className="px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '...' : '💾 Speichern'}
          </button>
          <button
            onClick={deployFlow}
            className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            🚀 Deploy
          </button>
        </div>
      </div>

      {/* ── Validation Panel ─────────────────────────────────────────────────── */}
      {showValidation && (
        <div className={`px-4 py-3 border-b text-sm flex items-start gap-3 ${validationErrors.length === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <span className="text-lg">{validationErrors.length === 0 ? '✅' : '⚠️'}</span>
          <div className="flex-1">
            {validationErrors.length === 0 ? (
              <span className="text-green-700 font-medium">Flow ist gültig und kann deployed werden.</span>
            ) : (
              <div>
                <span className="text-red-700 font-medium">{validationErrors.length} Problem(e) gefunden:</span>
                <ul className="mt-1 space-y-0.5">
                  {validationErrors.map((e, i) => (
                    <li key={i} className="text-red-600 text-xs">• {e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button onClick={() => setShowValidation(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Palette */}
        {isPaletteOpen && !isPreviewMode && (
          <div className="w-60 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                Nodes
              </p>
              {PALETTE_ITEMS.map((group) => (
                <div key={group.category} className="mb-4">
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${NODE_COLORS[group.nodeType].text.replace('300', '600')}`}>
                    {group.category}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <div
                        key={item.subType}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/vemo-node',
                            JSON.stringify({ ...item, nodeType: group.nodeType })
                          )
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
                      >
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 truncate">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 relative" onDragOver={isPreviewMode ? undefined : onDragOver} onDrop={isPreviewMode ? undefined : onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={isPreviewMode ? undefined : onNodesChange}
            onEdgesChange={isPreviewMode ? undefined : onEdgesChange}
            onConnect={isPreviewMode ? undefined : onConnect}
            onNodeClick={isPreviewMode ? undefined : onNodeClick}
            onPaneClick={onPaneClick}
            onInit={setRfInstance}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
            deleteKeyCode={isPreviewMode ? undefined : 'Delete'}
            nodesDraggable={!isPreviewMode}
            nodesConnectable={!isPreviewMode}
            elementsSelectable={!isPreviewMode}
            style={{ background: isPreviewMode ? '#f0f4ff' : '#f8fafc' }}
          >
            <Background color={isPreviewMode ? '#c7d2fe' : '#e2e8f0'} gap={20} size={1} />
            <Controls
              style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
            />
            <MiniMap
              style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8 }}
              nodeColor={(n) => {
                const t = (n.data as FlowNodeData).nodeType
                return t === 'trigger' ? '#3b82f6' : t === 'action' ? '#8b5cf6' : t === 'condition' ? '#f59e0b' : t === 'module' ? '#f97316' : '#10b981'
              }}
            />
            {isPreviewMode && (
              <Panel position="top-center">
                <div className="mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-full shadow pointer-events-none">
                  👁 Vorschau-Modus — nur lesbar
                </div>
              </Panel>
            )}
            {nodes.length === 0 && !isPreviewMode && (
              <Panel position="top-center">
                <div className="mt-16 text-center pointer-events-none">
                  <div className="text-5xl mb-3">🎨</div>
                  <p className="text-sm font-medium text-gray-500">Ziehe Nodes aus der Palette hierher</p>
                  <p className="text-xs text-gray-400 mt-1">Verbinde sie per Drag-and-Drop</p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Right Properties Panel */}
        {!isPreviewMode && (
          <div className="w-64 flex-shrink-0 bg-white border-l border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Eigenschaften</h3>
            </div>
            <PropertiesPanel node={selectedNode} onUpdate={updateNode} onDelete={deleteNode} />
          </div>
        )}
      </div>
    </div>
  )
}
