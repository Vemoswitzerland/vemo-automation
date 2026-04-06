'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

/* ── Types ──────────────────────────────────────────── */
interface Agent {
  id: string
  name: string
  role: string
  title: string | null
  description: string | null
  instructions: string
  model: string
  status: string
  heartbeatSec: number
  lastRunAt: string | null
  lastError: string | null
  runCount: number
  createdAt: string
  updatedAt: string
}

interface AgentFile {
  id: string
  agentId: string
  name: string
  content: string
  type: string
  createdAt: string
  updatedAt: string
}

interface AgentRun {
  id: string
  agentId: string
  trigger: string
  input: string | null
  output: string | null
  status: string
  tokensUsed: number
  durationMs: number
  error: string | null
  startedAt: string
  completedAt: string | null
}

/* ── Constants ──────────────────────────────────────── */
const ROLE_ICONS: Record<string, string> = {
  ceo: '👔', cto: '💻', marketing: '📢', designer: '🎨',
  qa: '🧪', devops: '⚙️', worker: '🤖', custom: '🔧',
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  idle: { label: 'Idle', cls: 'bg-gray-100 text-gray-600' },
  running: { label: 'Läuft', cls: 'bg-green-100 text-green-700' },
  paused: { label: 'Pausiert', cls: 'bg-yellow-100 text-yellow-700' },
  error: { label: 'Fehler', cls: 'bg-red-100 text-red-700' },
}

const MODEL_LABELS: Record<string, { short: string; cls: string }> = {
  'claude-sonnet-4-6': { short: 'Sonnet', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  'claude-opus-4-6': { short: 'Opus', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  'claude-haiku-4-5-20251001': { short: 'Haiku', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
}

const RUN_STATUS: Record<string, { label: string; cls: string }> = {
  running: { label: 'Läuft', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Fertig', cls: 'bg-green-100 text-green-700' },
  failed: { label: 'Fehler', cls: 'bg-red-100 text-red-700' },
}

const dateFmt = new Intl.DateTimeFormat('de-CH', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

/* ── Component ──────────────────────────────────────── */
export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string

  const [agent, setAgent] = useState<Agent | null>(null)
  const [files, setFiles] = useState<AgentFile[]>([])
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(true)

  // Instructions editing
  const [instructions, setInstructions] = useState('')
  const [instructionsSaved, setInstructionsSaved] = useState(false)

  // Run input
  const [runInput, setRunInput] = useState('')
  const [runningAgent, setRunningAgent] = useState(false)
  const [runResult, setRunResult] = useState<string | null>(null)

  // New file form
  const [showFileForm, setShowFileForm] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFileContent, setNewFileContent] = useState('')
  const [savingFile, setSavingFile] = useState(false)

  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`)
      if (res.ok) {
        const data = await res.json()
        setAgent(data)
        setInstructions(data.instructions || '')
      }
    } catch { /* ignore */ }
  }, [agentId])

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/files`)
      if (res.ok) setFiles(await res.json())
    } catch { /* ignore */ }
  }, [agentId])

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/run`)
      if (res.ok) setRuns(await res.json())
    } catch { /* ignore */ }
  }, [agentId])

  useEffect(() => {
    Promise.all([fetchAgent(), fetchFiles(), fetchRuns()]).then(() => setLoading(false))
  }, [fetchAgent, fetchFiles, fetchRuns])

  const saveInstructions = async () => {
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions }),
      })
      setInstructionsSaved(true)
      setTimeout(() => setInstructionsSaved(false), 2000)
    } catch { /* ignore */ }
  }

  const handleRun = async () => {
    setRunningAgent(true)
    setRunResult(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: runInput }),
      })
      if (res.ok) {
        const data = await res.json()
        setRunResult(data.output || JSON.stringify(data, null, 2))
        setRunInput('')
        fetchRuns()
        fetchAgent()
      }
    } catch { /* ignore */ }
    setRunningAgent(false)
  }

  const handleAddFile = async () => {
    if (!newFileName.trim()) return
    setSavingFile(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFileName, content: newFileContent }),
      })
      if (res.ok) {
        setNewFileName('')
        setNewFileContent('')
        setShowFileForm(false)
        fetchFiles()
      }
    } catch { /* ignore */ }
    setSavingFile(false)
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/files?fileId=${fileId}`, { method: 'DELETE' })
      fetchFiles()
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-gray-400 text-sm">Agent wird geladen...</span>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-gray-500 text-sm">Agent nicht gefunden</span>
        <Link href="/agents" className="mt-3 text-green-600 text-sm hover:underline">Zurück zu Agents</Link>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle
  const modelCfg = MODEL_LABELS[agent.model] ?? { short: agent.model, cls: 'bg-gray-50 text-gray-600 border-gray-200' }
  const icon = ROLE_ICONS[agent.role] ?? '🔧'

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl">
      {/* Back link */}
      <Link href="/agents" className="text-xs text-gray-400 hover:text-gray-600 transition-colors self-start">
        ← Zurück zu Agents
      </Link>

      {/* Agent Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{icon}</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{agent.name}</h1>
              {agent.title && <p className="text-sm text-gray-500">{agent.title}</p>}
              {agent.description && <p className="text-xs text-gray-400 mt-1">{agent.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
            <span className={`px-2.5 py-1 rounded text-xs font-medium border ${modelCfg.cls}`}>
              {modelCfg.short}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
          <span>Rolle: {agent.role}</span>
          <span>Heartbeat: {agent.heartbeatSec > 0 ? `Alle ${agent.heartbeatSec}s` : 'On-Demand'}</span>
          <span>{agent.runCount} Runs</span>
          {agent.lastRunAt && <span>Letzter Run: {dateFmt.format(new Date(agent.lastRunAt))}</span>}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Instructions (System-Prompt)</h2>
          {instructionsSaved && <span className="text-xs text-green-600 font-medium">Gespeichert!</span>}
        </div>
        <textarea
          rows={12}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          onBlur={saveInstructions}
          placeholder="Detaillierte Anweisungen für den Agenten..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
        />
      </div>

      {/* Run Agent */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Agent ausführen</h2>
        <textarea
          rows={4}
          value={runInput}
          onChange={(e) => setRunInput(e.target.value)}
          placeholder="Input für den Agenten (optional)..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y mb-3"
        />
        <button
          onClick={handleRun}
          disabled={runningAgent}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {runningAgent ? 'Agent läuft...' : '▶ Agent ausführen'}
        </button>

        {runResult && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Ergebnis:</h3>
            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{runResult}</pre>
          </div>
        )}
      </div>

      {/* Files */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Dateien ({files.length})</h2>
          <button
            onClick={() => setShowFileForm(!showFileForm)}
            className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
          >
            + Neue Datei
          </button>
        </div>

        {showFileForm && (
          <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 space-y-3">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Dateiname (z.B. config.json)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            />
            <textarea
              rows={6}
              value={newFileContent}
              onChange={(e) => setNewFileContent(e.target.value)}
              placeholder="Dateiinhalt..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y bg-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddFile}
                disabled={savingFile || !newFileName.trim()}
                className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {savingFile ? 'Speichere...' : 'Datei hinzufügen'}
              </button>
              <button
                onClick={() => setShowFileForm(false)}
                className="px-3 py-1.5 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {files.length === 0 && !showFileForm && (
          <p className="text-xs text-gray-400">Keine Dateien vorhanden</p>
        )}

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div>
                  <span className="text-sm font-medium text-gray-900">{file.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{file.type}</span>
                </div>
                <button
                  onClick={() => handleDeleteFile(file.id)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Löschen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run History */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Run History (letzte 20)</h2>

        {runs.length === 0 && (
          <p className="text-xs text-gray-400">Noch keine Runs vorhanden</p>
        )}

        {runs.length > 0 && (
          <div className="space-y-2">
            {runs.map((run) => {
              const runCfg = RUN_STATUS[run.status] ?? RUN_STATUS.running
              return (
                <div key={run.id} className="p-3 border border-gray-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${runCfg.cls}`}>
                        {runCfg.label}
                      </span>
                      <span className="text-xs text-gray-500">Trigger: {run.trigger}</span>
                      <span className="text-xs text-gray-400">{run.durationMs}ms</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {dateFmt.format(new Date(run.startedAt))}
                    </span>
                  </div>
                  {run.input && (
                    <div className="mb-1">
                      <span className="text-xs text-gray-500 font-medium">Input: </span>
                      <span className="text-xs text-gray-600 line-clamp-1">{run.input}</span>
                    </div>
                  )}
                  {run.output && (
                    <div>
                      <span className="text-xs text-gray-500 font-medium">Output: </span>
                      <span className="text-xs text-gray-600 line-clamp-2">{run.output}</span>
                    </div>
                  )}
                  {run.error && (
                    <div className="mt-1">
                      <span className="text-xs text-red-500">{run.error}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
