import { prisma } from '@/lib/db'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const FlowCanvas = dynamic(() => import('@/components/flow/FlowCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-vemo-dark-50 rounded-xl animate-pulse flex items-center justify-center">
      <span className="text-vemo-dark-400 text-sm">Canvas wird geladen...</span>
    </div>
  ),
})

const TEMPLATES = [
  {
    id: 'email-automation',
    icon: '📧',
    title: 'E-Mail Automation',
    description: 'Gmail → KI-Analyse → Entwurf → Telegram Approval → Senden',
    color: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
  },
  {
    id: 'instagram-pipeline',
    icon: '📸',
    title: 'Instagram Pipeline',
    description: 'Schedule → Content AI → Bildgenerierung → Approval → Instagram Post',
    color: 'bg-pink-50 border-pink-200',
    iconBg: 'bg-pink-100',
  },
  {
    id: 'whatsapp-bot',
    icon: '💬',
    title: 'WhatsApp Bot',
    description: 'WhatsApp Eingang → KI-Klassifizierung → Auto-Antwort / Weiterleitung',
    color: 'bg-green-50 border-green-200',
    iconBg: 'bg-green-100',
  },
  {
    id: 'daily-report',
    icon: '📊',
    title: 'Daily Report',
    description: 'Schedule → Daten sammeln → Report generieren → Telegram senden',
    color: 'bg-orange-50 border-orange-200',
    iconBg: 'bg-orange-100',
  },
  {
    id: 'marketing-campaign',
    icon: '🚀',
    title: 'Marketing Campaign',
    description: 'Trigger → PaperClip CEO → Multi-Channel Content → Approval → Publish',
    color: 'bg-purple-50 border-purple-200',
    iconBg: 'bg-purple-100',
  },
  {
    id: 'lead-nurturing',
    icon: '🎯',
    title: 'Lead Nurturing',
    description: 'Lead eingehend → KI-Analyse → E-Mail Sequenz → Follow-up',
    color: 'bg-yellow-50 border-yellow-200',
    iconBg: 'bg-yellow-100',
  },
]

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    active: { label: 'Aktiv', classes: 'bg-vemo-green-100 text-vemo-green-800' },
    paused: { label: 'Pausiert', classes: 'bg-warning-50 text-yellow-700' },
    draft: { label: 'Entwurf', classes: 'bg-vemo-dark-100 text-vemo-dark-600' },
    archived: { label: 'Archiviert', classes: 'bg-vemo-dark-100 text-vemo-dark-400' },
  }
  const c = config[status] ?? config.draft
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.classes}`}>
      {c.label}
    </span>
  )
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function countNodes(nodesJson: string): number {
  try {
    const arr = JSON.parse(nodesJson)
    return Array.isArray(arr) ? arr.length : 0
  } catch {
    return 0
  }
}

export default async function HomePage() {
  let flows: any[] = []
  let error: string | null = null

  try {
    flows = await prisma.flow.findMany({
      orderBy: { updatedAt: 'desc' },
    })
  } catch (e: any) {
    error = e?.message ?? 'Fehler beim Laden der Flows'
  }

  const activeFlows = flows.filter((f) => f.status === 'active').length
  const totalConnections = flows.reduce((sum, f) => {
    try {
      const edges = JSON.parse(f.edges ?? '[]')
      return sum + (Array.isArray(edges) ? edges.length : 0)
    } catch {
      return sum
    }
  }, 0)
  const pendingApprovals = 0

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-vemo-dark-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-vemo-dark-900">
                Automationszentrale
              </h1>
              <p className="text-sm text-vemo-dark-500 mt-1">
                Erstelle, verwalte und steuere deine Automations-Flows
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-vemo-green-50 rounded-lg border border-vemo-green-200">
                <span className="w-2 h-2 rounded-full bg-vemo-green-500 animate-pulse" />
                <span className="text-xs font-medium text-vemo-green-800">
                  {activeFlows} Flow{activeFlows !== 1 ? 's' : ''} aktiv
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-vemo-dark-50 rounded-lg border border-vemo-dark-200">
                <span className="w-2 h-2 rounded-full bg-vemo-dark-400" />
                <span className="text-xs font-medium text-vemo-dark-600">
                  {totalConnections} Verbindung{totalConnections !== 1 ? 'en' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* Quick Stats Bar */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-vemo-dark-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs text-vemo-dark-500 uppercase tracking-wider font-medium">Aktive Flows</div>
            <div className="mt-2 text-2xl font-bold text-vemo-dark-900">{activeFlows}</div>
          </div>
          <div className="bg-white border border-vemo-dark-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs text-vemo-dark-500 uppercase tracking-wider font-medium">Verbindungen total</div>
            <div className="mt-2 text-2xl font-bold text-vemo-dark-900">{totalConnections}</div>
          </div>
          <div className="bg-white border border-vemo-dark-200 rounded-xl p-5 shadow-sm">
            <div className="text-xs text-vemo-dark-500 uppercase tracking-wider font-medium">Offene Approvals</div>
            <div className="mt-2 text-2xl font-bold text-vemo-dark-900">{pendingApprovals}</div>
          </div>
        </section>

        {/* Saved Flows */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-vemo-dark-900">Deine Flows</h2>
            <Link
              href="/flows/builder"
              className="inline-flex items-center gap-2 px-4 py-2 bg-vemo-green-500 hover:bg-vemo-green-600 text-white text-sm font-medium rounded-lg transition-all duration-vemo ease-vemo shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neuer Flow
            </Link>
          </div>

          {error && (
            <div className="bg-error-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!error && flows.length === 0 && (
            <div className="border border-dashed border-vemo-dark-300 rounded-xl p-10 text-center">
              <div className="text-3xl mb-3">🤖</div>
              <p className="text-vemo-dark-500 text-sm">
                Noch keine Flows vorhanden. Erstelle deinen ersten Flow oder starte mit einem Template.
              </p>
              <Link
                href="/flows/builder"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-vemo-green-500 hover:bg-vemo-green-600 text-white text-sm font-medium rounded-lg transition-all duration-vemo ease-vemo"
              >
                Ersten Flow erstellen
              </Link>
            </div>
          )}

          {!error && flows.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {flows.map((flow) => {
                const nodeCount = countNodes(flow.nodes)
                return (
                  <Link
                    key={flow.id}
                    href={`/flows/builder?id=${flow.id}`}
                    className="group block bg-white border border-vemo-dark-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-vemo-green-300 transition-all duration-vemo ease-vemo"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-semibold text-vemo-dark-900 group-hover:text-vemo-green-700 transition-colors">
                        {flow.name}
                      </h3>
                      <StatusBadge status={flow.status} />
                    </div>
                    {flow.description && (
                      <p className="text-xs text-vemo-dark-500 mb-3 line-clamp-2">{flow.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-vemo-dark-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        {nodeCount} Node{nodeCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDate(flow.updatedAt)}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Flow Templates */}
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-vemo-dark-900">Flow Templates</h2>
            <p className="text-sm text-vemo-dark-500 mt-1">
              Starte mit einem vorgefertigten Template und passe es an deine Beduerfnisse an
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                className={`border rounded-xl p-5 ${tpl.color} flex flex-col`}
              >
                <div className={`w-10 h-10 ${tpl.iconBg} rounded-lg flex items-center justify-center text-xl mb-3`}>
                  {tpl.icon}
                </div>
                <h3 className="text-sm font-semibold text-vemo-dark-900 mb-1">{tpl.title}</h3>
                <p className="text-xs text-vemo-dark-500 mb-4 flex-1">{tpl.description}</p>
                <Link
                  href={`/flows/builder?template=${tpl.id}`}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-vemo-dark-50 border border-vemo-dark-200 text-vemo-dark-700 text-xs font-medium rounded-lg transition-all duration-vemo ease-vemo"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Flow erstellen
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Large Flow Canvas Preview */}
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-vemo-dark-900">Flow Canvas</h2>
            <p className="text-sm text-vemo-dark-500 mt-1">
              Visuelle Uebersicht deiner Automations
            </p>
          </div>
          <div className="border border-vemo-dark-200 rounded-xl overflow-hidden shadow-sm bg-vemo-dark-50">
            <div className="h-[400px]">
              <FlowCanvas />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
