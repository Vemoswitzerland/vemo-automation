import { prisma } from '@/lib/db'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const FlowBuilder = dynamic(() => import('@/components/flow/FlowBuilder'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 rounded-xl animate-pulse flex items-center justify-center border border-gray-200">
      <span className="text-gray-400 text-sm">Flow Builder wird geladen...</span>
    </div>
  ),
})

const TEMPLATES = [
  {
    id: 'email-automation',
    icon: '📧',
    title: 'E-Mail Automation',
    description: 'Gmail → KI-Analyse → Entwurf → Telegram Approval → Senden',
    color: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
  },
  {
    id: 'instagram-pipeline',
    icon: '📸',
    title: 'Instagram Pipeline',
    description: 'Schedule → Content AI → Bild → Approval → Post',
    color: 'border-pink-200 bg-pink-50 hover:bg-pink-100',
  },
  {
    id: 'whatsapp-bot',
    icon: '💬',
    title: 'WhatsApp Bot',
    description: 'Eingang → KI-Klassifizierung → Auto-Antwort',
    color: 'border-green-200 bg-green-50 hover:bg-green-100',
  },
  {
    id: 'daily-report',
    icon: '📊',
    title: 'Daily Report',
    description: 'Schedule → Daten → Report → Telegram',
    color: 'border-orange-200 bg-orange-50 hover:bg-orange-100',
  },
  {
    id: 'marketing-campaign',
    icon: '🚀',
    title: 'Marketing Campaign',
    description: 'Trigger → PaperClip CEO → Multi-Channel → Publish',
    color: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
  },
  {
    id: 'lead-nurturing',
    icon: '🎯',
    title: 'Lead Nurturing',
    description: 'Lead → KI-Analyse → E-Mail → Follow-up',
    color: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100',
  },
]

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    active: { label: 'Aktiv', classes: 'bg-green-100 text-green-700' },
    paused: { label: 'Pausiert', classes: 'bg-yellow-100 text-yellow-700' },
    draft: { label: 'Entwurf', classes: 'bg-gray-100 text-gray-600' },
    archived: { label: 'Archiviert', classes: 'bg-gray-100 text-gray-400' },
  }
  const c = config[status] ?? config.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.classes}`}>
      {c.label}
    </span>
  )
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

  try {
    flows = await prisma.flow.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })
  } catch {
    // DB not ready yet — show empty state
  }

  const activeFlows = flows.filter((f) => f.status === 'active').length

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flow Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Erstelle und verwalte deine Automations-Flows</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-800">{activeFlows} aktiv</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-xs font-medium text-gray-600">{flows.length} Flows</span>
          </div>
        </div>
      </div>

      {/* ── GROSSER FLOW BUILDER — Hauptelement ────────────────────── */}
      <section>
        <div className="h-[calc(100vh-220px)] min-h-[500px]">
          <FlowBuilder
            initialName="Neuer Flow"
            initialNodes={[]}
            initialEdges={[]}
          />
        </div>
      </section>

      {/* ── Gespeicherte Flows + Templates nebeneinander ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gespeicherte Flows — 2/3 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Gespeicherte Flows</h2>
            <Link
              href="/flows/builder"
              className="text-xs text-green-600 hover:text-green-700 font-medium"
            >
              Alle ansehen →
            </Link>
          </div>

          {flows.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <div className="text-2xl mb-2">🤖</div>
              <p className="text-sm text-gray-500">Noch keine Flows gespeichert.</p>
              <p className="text-xs text-gray-400 mt-1">Erstelle oben einen Flow und speichere ihn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {flows.slice(0, 6).map((flow) => {
                const nodeCount = countNodes(flow.nodes)
                return (
                  <Link
                    key={flow.id}
                    href={`/flows/builder?id=${flow.id}`}
                    className="group block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-green-300 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors truncate pr-2">
                        {flow.name}
                      </h3>
                      <StatusBadge status={flow.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{nodeCount} Nodes</span>
                      <span>v{flow.version}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Flow Templates — 1/3 */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Templates</h2>
          <div className="space-y-2">
            {TEMPLATES.map((tpl) => (
              <Link
                key={tpl.id}
                href={`/flows/builder?template=${tpl.id}`}
                className={`block border rounded-lg p-3 transition-all ${tpl.color}`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-lg mt-0.5">{tpl.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{tpl.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{tpl.description}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
