import dynamic from 'next/dynamic'
import { prisma } from '@/lib/db'

const FlowCanvas = dynamic(() => import('@/components/flow/FlowCanvas'), { ssr: false })

async function getFlowStats() {
  try {
    const [totalEmails, pendingDrafts, instagramPosts] = await Promise.all([
      prisma.email.count(),
      prisma.emailDraft.count({ where: { status: 'pending' } }),
      prisma.instagramPost.count(),
    ])
    return { totalEmails, pendingDrafts, instagramPosts }
  } catch {
    return { totalEmails: 0, pendingDrafts: 0, instagramPosts: 0 }
  }
}

const recentActivity = [
  { time: 'Gerade eben', icon: '📧', text: 'Gmail: 3 neue Mails analysiert', color: 'text-sky-400' },
  { time: 'Vor 2 Min.', icon: '🤖', text: 'KI-Analyse: 2 Antworten vorgeschlagen', color: 'text-purple-400' },
  { time: 'Vor 5 Min.', icon: '📸', text: 'Instagram: Content-Entwurf erstellt', color: 'text-pink-400' },
  { time: 'Vor 8 Min.', icon: '✅', text: 'User-Approval: 1 Post genehmigt', color: 'text-green-400' },
  { time: 'Vor 12 Min.', icon: '🚀', text: 'Post Publisher: Veröffentlichung geplant', color: 'text-yellow-400' },
]

const flowTemplates = [
  {
    icon: '📧',
    title: 'E-Mail Auto-Response',
    description: 'Gmail → KI-Analyse → Entwurf → Approval',
    status: 'active',
    steps: 4,
  },
  {
    icon: '📸',
    title: 'Instagram Content Pipeline',
    description: 'Scheduler → Content-Gen → Bild → Publish',
    status: 'active',
    steps: 5,
  },
  {
    icon: '📊',
    title: 'Daily Report',
    description: 'Scheduler → Daten → Report → Telegram',
    status: 'paused',
    steps: 4,
  },
  {
    icon: '🎯',
    title: 'Marketing Campaign',
    description: 'Trigger → AI → Multi-Channel-Post',
    status: 'idle',
    steps: 6,
  },
]

export default async function FlowsPage() {
  const stats = await getFlowStats()
  const activeFlows = flowTemplates.filter((f) => f.status === 'active').length

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Flow Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-400 mt-1">Alle Verbindungen und aktiven Flows auf einen Blick</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Aktive Flows</span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-green-400">{activeFlows}</div>
          <div className="text-xs text-gray-500 mt-1">von {flowTemplates.length} Flows</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">E-Mails</div>
          <div className="text-2xl font-bold text-sky-400">{stats.totalEmails}</div>
          <div className="text-xs text-gray-500 mt-1">gesamt verarbeitet</div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Entwürfe</span>
            {stats.pendingDrafts > 0 && (
              <span className="bg-sky-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {stats.pendingDrafts}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-white">{stats.pendingDrafts}</div>
          <div className="text-xs text-gray-500 mt-1">warten auf Freigabe</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Instagram Posts</div>
          <div className="text-2xl font-bold text-pink-400">{stats.instagramPosts}</div>
          <div className="text-xs text-gray-500 mt-1">erstellt</div>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white text-lg">Flow-Übersicht</h2>
            <p className="text-sm text-gray-500">Ziehe Nodes um, verbinde sie per Drag-and-Drop</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-400 inline-block" />
              Aktiv
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-gray-500 border-dashed inline-block" style={{ borderTop: '2px dashed #6b7280', height: 0, display: 'inline-block' }} />
              Inaktiv
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
              Verbunden
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              Pausiert
            </span>
          </div>
        </div>
        <FlowCanvas />
      </div>

      {/* Bottom row: Flow Templates + Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Flow Templates */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Flow-Templates</h2>
            <button className="btn-primary text-xs px-3 py-1.5">+ Neuer Flow</button>
          </div>
          <div className="space-y-3">
            {flowTemplates.map((flow) => (
              <div
                key={flow.title}
                className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer group"
              >
                <span className="text-xl mt-0.5">{flow.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white group-hover:text-sky-400 transition-colors">
                      {flow.title}
                    </span>
                    <StatusBadge status={flow.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{flow.description}</p>
                  <span className="text-xs text-gray-600 mt-1 inline-block">{flow.steps} Schritte</span>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-sky-400 hover:text-sky-300 shrink-0">
                  Bearbeiten
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Aktivitäten</h2>
            <span className="text-xs text-gray-500">Live-Feed</span>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="relative mt-1">
                  <span className="text-base">{activity.icon}</span>
                  {i < recentActivity.length - 1 && (
                    <div className="absolute left-1/2 top-6 w-px h-4 bg-gray-700 -translate-x-1/2" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${activity.color}`}>{activity.text}</p>
                  <span className="text-xs text-gray-600">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800">
            <a href="/emails" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
              Alle E-Mail-Aktivitäten →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { label: 'Aktiv', className: 'bg-green-900/50 text-green-400 border border-green-700/50' },
    paused: { label: 'Pausiert', className: 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/50' },
    idle: { label: 'Idle', className: 'bg-gray-800 text-gray-500 border border-gray-700' },
    error: { label: 'Fehler', className: 'bg-red-900/50 text-red-400 border border-red-700/50' },
  }[status] ?? { label: status, className: 'bg-gray-800 text-gray-500' }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
