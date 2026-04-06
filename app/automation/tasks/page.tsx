'use client'

import { useState, useEffect, useCallback } from 'react'

type AutomationTask = {
  id: string
  type: string
  status: 'pending' | 'running' | 'preview' | 'waiting_approval' | 'done' | 'failed'
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  agentId: string | null
  error: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<AutomationTask['status'], string> = {
  pending: 'Ausstehend',
  running: 'Läuft',
  preview: 'Vorschau',
  waiting_approval: 'Warte auf Freigabe',
  done: 'Erledigt',
  failed: 'Fehlgeschlagen',
}

const STATUS_COLORS: Record<AutomationTask['status'], string> = {
  pending: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-700',
  preview: 'bg-purple-100 text-purple-700',
  waiting_approval: 'bg-yellow-100 text-yellow-800',
  done: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

function StatusBadge({ status }: { status: AutomationTask['status'] }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export default function AutomationTasksPage() {
  const [tasks, setTasks] = useState<AutomationTask[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<AutomationTask | null>(null)

  const loadTasks = useCallback(async () => {
    try {
      const url = statusFilter !== 'all'
        ? `/api/automation/tasks?status=${statusFilter}`
        : '/api/automation/tasks'
      const res = await fetch(url)
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } catch {
      console.error('Fehler beim Laden der Tasks')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadTasks()
    const interval = setInterval(loadTasks, 10000) // auto-refresh every 10s
    return () => clearInterval(interval)
  }, [loadTasks])

  const handleApprove = async (id: string) => {
    setActionLoading(id + '_approve')
    try {
      const res = await fetch(`/api/automation/tasks/${id}/approve`, { method: 'POST' })
      if (res.ok) await loadTasks()
    } catch {
      console.error('Fehler beim Genehmigen')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: string) => {
    setActionLoading(id + '_reject')
    try {
      const res = await fetch(`/api/automation/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'failed', error: 'Manuell abgelehnt' }),
      })
      if (res.ok) await loadTasks()
    } catch {
      console.error('Fehler beim Ablehnen')
    } finally {
      setActionLoading(null)
    }
  }

  const statusOptions = ['all', 'pending', 'running', 'preview', 'waiting_approval', 'done', 'failed']

  const approvalTasks = tasks.filter(t => t.status === 'waiting_approval' || t.status === 'preview')

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            Agent-Dashboard-Kommunikation — alle Automation-Tasks im Überblick
          </p>
        </div>
        <button
          onClick={loadTasks}
          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          ↻ Aktualisieren
        </button>
      </div>

      {/* Approval Banner */}
      {approvalTasks.length > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-800">
            ⚠️ {approvalTasks.length} Task{approvalTasks.length > 1 ? 's' : ''} warte{approvalTasks.length === 1 ? 't' : 'n'} auf deine Freigabe
          </p>
        </div>
      )}

      {/* Status Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statusOptions.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs rounded-full border transition ${
              statusFilter === s
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'Alle' : STATUS_LABELS[s as AutomationTask['status']]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Laden…</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Keine Tasks gefunden
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={task.status} />
                    <span className="text-xs font-mono text-gray-400 truncate">
                      {task.type}
                    </span>
                    {task.agentId && (
                      <span className="text-xs text-gray-400 truncate">
                        · Agent: {task.agentId.slice(0, 8)}…
                      </span>
                    )}
                  </div>

                  {task.error && (
                    <p className="text-xs text-red-600 mt-1">❌ {task.error}</p>
                  )}

                  {task.output && (
                    <button
                      onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                      className="text-xs text-blue-600 hover:underline mt-1"
                    >
                      {selectedTask?.id === task.id ? '▲ Output ausblenden' : '▼ Output anzeigen'}
                    </button>
                  )}

                  {selectedTask?.id === task.id && task.output && (
                    <pre className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 overflow-auto max-h-40">
                      {JSON.stringify(task.output, null, 2)}
                    </pre>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(task.createdAt).toLocaleString('de-CH')}
                    {task.approvedAt && ` · Genehmigt: ${new Date(task.approvedAt).toLocaleString('de-CH')}`}
                  </p>
                </div>

                {/* Actions */}
                {(task.status === 'waiting_approval' || task.status === 'preview') && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(task.id)}
                      disabled={!!actionLoading}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      {actionLoading === task.id + '_approve' ? '…' : '✓ Genehmigen'}
                    </button>
                    <button
                      onClick={() => handleReject(task.id)}
                      disabled={!!actionLoading}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition"
                    >
                      {actionLoading === task.id + '_reject' ? '…' : '✗ Ablehnen'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6 text-center">
        Auto-Refresh alle 10 Sekunden · {tasks.length} Task{tasks.length !== 1 ? 's' : ''} geladen
      </p>
    </div>
  )
}
