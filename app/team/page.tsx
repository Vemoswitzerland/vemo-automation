'use client'

import { useEffect, useState, useCallback } from 'react'

interface ActiveTask {
  id: string
  identifier: string
  title: string
  status: string
  priority: string
}

interface Agent {
  id: string
  name: string
  role: string
  title: string | null
  icon: string | null
  status: 'running' | 'idle' | 'paused' | 'error'
  reportsTo: string | null
  capabilities: string | null
  lastHeartbeatAt: string | null
  urlKey: string
  activeTasks: ActiveTask[]
}

interface Dashboard {
  agents: { active: number; running: number; paused: number; error: number }
  tasks: { open: number; inProgress: number; blocked: number; done: number }
}

interface TeamData {
  agents: Agent[]
  dashboard: Dashboard
  fetchedAt: string
  error?: string
}

const ROLE_LABELS: Record<string, string> = {
  ceo: 'CEO',
  cto: 'CTO',
  cmo: 'CMO',
  engineer: 'Engineer',
  designer: 'Designer',
  pm: 'Product Manager',
  qa: 'QA',
  devops: 'DevOps',
  researcher: 'Researcher',
  general: 'Assistant',
}

const ROLE_COLORS: Record<string, string> = {
  ceo: 'bg-purple-100 text-purple-700 border-purple-200',
  cto: 'bg-blue-100 text-blue-700 border-blue-200',
  cmo: 'bg-pink-100 text-pink-700 border-pink-200',
  engineer: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  designer: 'bg-orange-100 text-orange-700 border-orange-200',
  pm: 'bg-teal-100 text-teal-700 border-teal-200',
  qa: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  devops: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  researcher: 'bg-violet-100 text-violet-700 border-violet-200',
  general: 'bg-gray-100 text-gray-700 border-gray-200',
}

const ROLE_ICONS: Record<string, string> = {
  ceo: '👑',
  cto: '⚙️',
  cmo: '📣',
  engineer: '💻',
  designer: '🎨',
  pm: '🗂️',
  qa: '🛡️',
  devops: '🔧',
  researcher: '🔭',
  general: '🤖',
}

const STATUS_CONFIG = {
  running: { dot: 'bg-vemo-green-500 animate-pulse', label: 'Läuft', badge: 'bg-vemo-green-100 text-vemo-green-700 border-vemo-green-200' },
  idle: { dot: 'bg-gray-300', label: 'Bereit', badge: 'bg-gray-100 text-gray-500 border-gray-200' },
  paused: { dot: 'bg-yellow-400', label: 'Pausiert', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  error: { dot: 'bg-red-500', label: 'Fehler', badge: 'bg-red-100 text-red-700 border-red-200' },
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-600',
  high: 'text-orange-500',
  medium: 'text-yellow-600',
  low: 'text-gray-400',
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Nie'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const h = Math.floor(mins / 60)
  if (h < 24) return `vor ${h} Std.`
  return `vor ${Math.floor(h / 24)} Tagen`
}

function AgentCard({ agent }: { agent: Agent }) {
  const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle
  const roleColor = ROLE_COLORS[agent.role] || ROLE_COLORS.general
  const roleIcon = ROLE_ICONS[agent.role] || '🤖'
  const roleLabel = ROLE_LABELS[agent.role] || agent.role

  return (
    <div className={`card p-4 flex flex-col gap-3 border-l-4 transition-all duration-200 hover:shadow-md ${
      agent.status === 'running' ? 'border-l-vemo-green-500' :
      agent.status === 'paused' ? 'border-l-yellow-400' :
      agent.status === 'error' ? 'border-l-red-500' :
      'border-l-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{roleIcon}</span>
          <div className="min-w-0">
            <div className="font-bold text-vemo-dark-900 text-sm truncate">{agent.name}</div>
            <div className="text-xs text-vemo-dark-500 truncate">{agent.title || roleLabel}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${roleColor}`}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Active Tasks */}
      {agent.activeTasks.length > 0 ? (
        <div className="space-y-1.5">
          {agent.activeTasks.slice(0, 2).map((task) => (
            <div key={task.id} className="flex items-start gap-1.5 bg-vemo-dark-50 rounded p-2">
              <span className={`text-xs font-bold shrink-0 mt-0.5 ${PRIORITY_COLORS[task.priority] || 'text-gray-400'}`}>
                ●
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-vemo-dark-700 truncate">{task.title}</div>
                <div className="text-xs text-vemo-dark-400">{task.identifier} · {task.status === 'in_progress' ? '▶ Aktiv' : '📋 Todo'}</div>
              </div>
            </div>
          ))}
          {agent.activeTasks.length > 2 && (
            <div className="text-xs text-vemo-dark-400 pl-1">+{agent.activeTasks.length - 2} weitere</div>
          )}
        </div>
      ) : (
        <div className="text-xs text-vemo-dark-300 italic py-1">Kein aktiver Task</div>
      )}

      {/* Footer */}
      <div className="text-xs text-vemo-dark-400 flex items-center gap-1 mt-auto pt-1 border-t border-vemo-dark-100">
        <span>⏱</span>
        <span>{timeAgo(agent.lastHeartbeatAt)}</span>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className={`text-2xl font-bold ${color || 'text-vemo-dark-900'}`}>{value}</div>
      <div className="text-xs font-semibold text-vemo-dark-700">{label}</div>
      {sub && <div className="text-xs text-vemo-dark-400">{sub}</div>}
    </div>
  )
}

export default function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/team', { cache: 'no-store' })
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } catch {
      setData({ agents: [], dashboard: { agents: { active: 0, running: 0, paused: 0, error: 0 }, tasks: { open: 0, inProgress: 0, blocked: 0, done: 0 } }, fetchedAt: new Date().toISOString(), error: 'Verbindung zu Paperclip nicht möglich' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // auto-refresh every 30s
    return () => clearInterval(interval)
  }, [fetchData])

  const agents = data?.agents || []
  const running = agents.filter(a => a.status === 'running')
  const idle = agents.filter(a => a.status === 'idle')
  const paused = agents.filter(a => a.status === 'paused')

  // Group by role category
  const leadership = agents.filter(a => ['ceo', 'cto', 'cmo'].includes(a.role))
  const engineering = agents.filter(a => ['engineer', 'devops', 'qa'].includes(a.role))
  const design = agents.filter(a => ['designer'].includes(a.role))
  const other = agents.filter(a => ['pm', 'researcher', 'general'].includes(a.role))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2.5 h-2.5 rounded-full ${running.length > 0 ? 'bg-vemo-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className={`text-xs font-semibold uppercase tracking-widest ${running.length > 0 ? 'text-vemo-green-600' : 'text-gray-400'}`}>
              {running.length > 0 ? `${running.length} Agent${running.length > 1 ? 'en' : ''} aktiv` : 'Alle bereit'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-vemo-dark-900">Team</h1>
          <p className="text-sm text-vemo-dark-500 mt-1">Paperclip AI-Agenten — Live-Übersicht & Steuerung</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchData() }}
          className="btn-outline text-sm self-start sm:self-auto"
          disabled={loading}
        >
          {loading ? '⏳ Lädt…' : '🔄 Aktualisieren'}
        </button>
      </div>

      {/* Error banner */}
      {data?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          ⚠️ {data.error} — Paperclip muss lokal laufen (http://127.0.0.1:3100)
        </div>
      )}

      {/* Stats Bar */}
      {data && !data.error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Agenten total" value={agents.length} sub="im Team" />
          <StatCard label="Aktiv / Läuft" value={running.length} sub="gerade beschäftigt" color="text-vemo-green-600" />
          <StatCard label="Tasks in Progress" value={data.dashboard.tasks.inProgress} sub={`${data.dashboard.tasks.open} offen`} color="text-blue-600" />
          <StatCard label="Erledigt" value={data.dashboard.tasks.done} sub="gesamt abgeschlossen" color="text-gray-500" />
        </div>
      )}

      {loading && !data && (
        <div className="card p-8 text-center text-vemo-dark-400">
          <div className="text-2xl mb-2">⏳</div>
          Lade Team-Daten…
        </div>
      )}

      {/* Agent Groups */}
      {agents.length > 0 && (
        <div className="space-y-8">
          {/* Leadership */}
          {leadership.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider">Führung</h2>
                <span className="text-xs text-vemo-dark-400">({leadership.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {leadership.map(a => <AgentCard key={a.id} agent={a} />)}
              </div>
            </section>
          )}

          {/* Engineering */}
          {engineering.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider">Engineering</h2>
                <span className="text-xs text-vemo-dark-400">({engineering.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {engineering.map(a => <AgentCard key={a.id} agent={a} />)}
              </div>
            </section>
          )}

          {/* Design */}
          {design.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider">Design</h2>
                <span className="text-xs text-vemo-dark-400">({design.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {design.map(a => <AgentCard key={a.id} agent={a} />)}
              </div>
            </section>
          )}

          {/* Other */}
          {other.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider">Weitere</h2>
                <span className="text-xs text-vemo-dark-400">({other.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {other.map(a => <AgentCard key={a.id} agent={a} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Footer / refresh info */}
      {lastRefresh && (
        <div className="text-xs text-vemo-dark-300 text-center pb-4">
          Zuletzt aktualisiert: {lastRefresh.toLocaleTimeString('de-CH')} · Auto-Refresh alle 30 Sek.
        </div>
      )}
    </div>
  )
}
