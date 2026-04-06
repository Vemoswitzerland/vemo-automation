import { prisma } from '@/lib/db'
import Link from 'next/link'

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, { label: string; dot: string; cls: string }> = {
    active: { label: 'Aktiv', dot: 'bg-green-500 animate-pulse', cls: 'bg-green-50 text-green-700 border-green-200' },
    paused: { label: 'Pausiert', dot: 'bg-yellow-500', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    draft: { label: 'Entwurf', dot: 'bg-gray-400', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
  }
  const cfg = c[status] ?? c.draft
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function countNodes(json: string): number {
  try {
    const a = JSON.parse(json)
    return Array.isArray(a) ? a.length : 0
  } catch {
    return 0
  }
}

function timeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours}h`
  const days = Math.floor(hours / 24)
  return `vor ${days}d`
}

export default async function DashboardPage() {
  let flows: any[] = []
  try {
    flows = await prisma.flow.findMany({ orderBy: { updatedAt: 'desc' } })
  } catch {
    /* DB not ready */
  }

  const activeFlows = flows.filter((f) => f.status === 'active').length
  const totalNodes = flows.reduce((sum, f) => sum + countNodes(f.nodes), 0)

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Flow Dashboard</h1>
          <p className="text-sm text-gray-500">Erstelle und verwalte deine Automations-Flows</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-md border border-green-200 text-xs font-medium text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {activeFlows} aktiv
            </span>
            <span className="px-2.5 py-1 bg-gray-50 rounded-md border border-gray-200 text-xs font-medium text-gray-600">
              {flows.length} Flows
            </span>
            <span className="px-2.5 py-1 bg-gray-50 rounded-md border border-gray-200 text-xs font-medium text-gray-600">
              {totalNodes} Nodes
            </span>
          </div>
          <Link
            href="/editor"
            className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
          >
            + Neuer Flow
          </Link>
        </div>
      </div>

      {/* Flow Cards */}
      {flows.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {flows.map((flow) => (
            <Link
              key={flow.id}
              href={`/editor?id=${flow.id}`}
              className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-green-300 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-green-700 truncate pr-2">
                  {flow.name}
                </h3>
                <StatusBadge status={flow.status} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{countNodes(flow.nodes)} Nodes</span>
                <span>{timeAgo(flow.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-xl">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Noch keine Flows</h2>
          <p className="text-sm text-gray-500 mb-6">Erstelle deinen ersten Automation-Flow</p>
          <Link
            href="/editor"
            className="px-5 py-2.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
          >
            Ersten Flow erstellen
          </Link>
        </div>
      )}
    </div>
  )
}
