'use client'

import { useState, useEffect } from 'react'
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
  _count?: { files: number; runs: number }
}

/* ── Constants ──────────────────────────────────────── */
const ROLE_ICONS: Record<string, string> = {
  ceo: '👔',
  cto: '💻',
  marketing: '📢',
  designer: '🎨',
  qa: '🧪',
  devops: '⚙️',
  worker: '🤖',
  custom: '🔧',
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

const ROLES = ['ceo', 'cto', 'marketing', 'designer', 'qa', 'devops', 'worker', 'custom']
const MODELS = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001']

const dateFmt = new Intl.DateTimeFormat('de-CH', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

/* ── Component ──────────────────────────────────────── */
export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    role: 'worker',
    title: '',
    description: '',
    model: 'claude-sonnet-4-6',
    heartbeatSec: 0,
    instructions: '',
  })

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      if (res.ok) setAgents(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchAgents() }, [])

  const resetForm = () => {
    setForm({ name: '', role: 'worker', title: '', description: '', model: 'claude-sonnet-4-6', heartbeatSec: 0, instructions: '' })
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        resetForm()
        setShowForm(false)
        fetchAgents()
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleRun = async (id: string) => {
    setRunningId(id)
    try {
      await fetch(`/api/agents/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: '' }),
      })
      fetchAgents()
    } catch { /* ignore */ }
    setRunningId(null)
  }

  const handlePause = async (id: string) => {
    try {
      await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      })
      fetchAgents()
    } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agent Team</h1>
          <p className="text-xs text-gray-500">Deine AI-Agenten — verbunden mit Claude</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-gray-50 rounded-md border border-gray-200 text-xs font-medium text-gray-600">
            {agents.length} Agenten
          </span>
          <button
            onClick={() => { setShowForm(!showForm); if (!showForm) resetForm() }}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            + Neuer Agent
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Neuen Agenten erstellen</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="z.B. Marketing Agent"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rolle</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_ICONS[r]} {r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Titel</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="z.B. Marketing Lead"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Modell</label>
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>{MODEL_LABELS[m]?.short ?? m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Heartbeat (Sekunden)</label>
              <input
                type="number"
                min={0}
                value={form.heartbeatSec}
                onChange={(e) => setForm({ ...form, heartbeatSec: parseInt(e.target.value) || 0 })}
                placeholder="0 = On-Demand"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Beschreibung</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Kurze Beschreibung"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Instructions (System-Prompt für den Agenten)</label>
            <textarea
              rows={10}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="Detaillierte Anweisungen für den Agenten..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreate}
              disabled={saving || !form.name.trim()}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Erstelle...' : 'Agent erstellen'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="text-gray-400 text-sm">Agenten werden geladen...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-200 rounded-xl">
          <span className="text-4xl mb-3">🤖</span>
          <p className="text-gray-600 text-sm font-medium">Noch keine Agenten erstellt</p>
          <p className="text-gray-400 text-xs mt-1">Erstelle deinen ersten AI-Agenten um loszulegen</p>
        </div>
      )}

      {/* Agent Cards Grid */}
      {!loading && agents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle
            const modelCfg = MODEL_LABELS[agent.model] ?? { short: agent.model, cls: 'bg-gray-50 text-gray-600 border-gray-200' }
            const icon = ROLE_ICONS[agent.role] ?? '🔧'

            return (
              <div
                key={agent.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all group"
              >
                {/* Top row: icon + name + status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                        {agent.name}
                      </h3>
                      {agent.title && (
                        <p className="text-xs text-gray-500">{agent.title}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.cls}`}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Description */}
                {agent.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{agent.description}</p>
                )}

                {/* Badges row */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${modelCfg.cls}`}>
                    {modelCfg.short}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                    {agent.heartbeatSec > 0 ? `Alle ${agent.heartbeatSec}s` : 'On-Demand'}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                  <span>{agent.runCount} Runs</span>
                  {agent.lastRunAt && (
                    <span>Letzter Run: {dateFmt.format(new Date(agent.lastRunAt))}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => handleRun(agent.id)}
                    disabled={runningId === agent.id}
                    className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors border border-green-200 disabled:opacity-50"
                  >
                    {runningId === agent.id ? '...' : '▶ Ausführen'}
                  </button>
                  <button
                    onClick={() => handlePause(agent.id)}
                    className="px-3 py-1.5 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200"
                  >
                    ⏸ Pause
                  </button>
                  <Link
                    href={`/agents/${agent.id}`}
                    className="ml-auto px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    ✏️ Bearbeiten
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
