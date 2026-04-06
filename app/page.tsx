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
  { id: 'email-automation', icon: '📧', title: 'E-Mail Automation', desc: 'Gmail → KI → Entwurf → Approval → Senden' },
  { id: 'instagram-pipeline', icon: '📸', title: 'Instagram Pipeline', desc: 'Schedule → AI → Bild → Approval → Post' },
  { id: 'whatsapp-bot', icon: '💬', title: 'WhatsApp Bot', desc: 'Eingang → KI → Auto-Antwort' },
  { id: 'daily-report', icon: '📊', title: 'Daily Report', desc: 'Schedule → Daten → Report → Telegram' },
  { id: 'marketing-campaign', icon: '🚀', title: 'Marketing', desc: 'Trigger → PaperClip CEO → Publish' },
  { id: 'lead-nurturing', icon: '🎯', title: 'Lead Nurturing', desc: 'Lead → KI → E-Mail → Follow-up' },
]

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, { label: string; cls: string }> = {
    active: { label: 'Aktiv', cls: 'bg-green-100 text-green-700' },
    paused: { label: 'Pausiert', cls: 'bg-yellow-100 text-yellow-700' },
    draft: { label: 'Entwurf', cls: 'bg-gray-100 text-gray-600' },
  }
  const cfg = c[status] ?? c.draft
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
}

function countNodes(json: string): number {
  try { const a = JSON.parse(json); return Array.isArray(a) ? a.length : 0 } catch { return 0 }
}

export default async function HomePage() {
  let flows: any[] = []
  try {
    flows = await prisma.flow.findMany({ orderBy: { updatedAt: 'desc' }, take: 10 })
  } catch { /* DB not ready */ }

  const activeFlows = flows.filter((f) => f.status === 'active').length

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Flow Dashboard</h1>
          <p className="text-xs text-gray-500">Erstelle und verwalte deine Automations-Flows</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-md border border-green-200 text-xs font-medium text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {activeFlows} aktiv
          </span>
          <span className="px-2.5 py-1 bg-gray-50 rounded-md border border-gray-200 text-xs font-medium text-gray-600">
            {flows.length} Flows
          </span>
        </div>
      </div>

      {/* ── Templates — horizontale Reihe ───────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TEMPLATES.map((t) => (
          <Link
            key={t.id}
            href={`/flows/builder?template=${t.id}`}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all"
          >
            <span className="text-base">{t.icon}</span>
            <div>
              <div className="text-xs font-semibold text-gray-900 whitespace-nowrap">{t.title}</div>
              <div className="text-[10px] text-gray-400 whitespace-nowrap">{t.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── FLOW BUILDER — Hauptelement, volle Breite ──── */}
      <div className="w-full" style={{ height: 'calc(100vh - 240px)', minHeight: '450px' }}>
        <FlowBuilder
          initialName="Neuer Flow"
          initialNodes={[]}
          initialEdges={[]}
        />
      </div>

      {/* ── Gespeicherte Flows — darunter ──────────────── */}
      {flows.length > 0 && (
        <div className="w-full">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Gespeicherte Flows</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {flows.map((flow) => (
              <Link
                key={flow.id}
                href={`/flows/builder?id=${flow.id}`}
                className="group bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm hover:border-green-300 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-900 group-hover:text-green-700 truncate pr-1">
                    {flow.name}
                  </span>
                  <StatusBadge status={flow.status} />
                </div>
                <span className="text-[10px] text-gray-400">{countNodes(flow.nodes)} Nodes · v{flow.version}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
