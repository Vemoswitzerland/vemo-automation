import { prisma } from '@/lib/db'
import { CONNECTORS } from '@/lib/connectors/registry'
import { CATEGORY_LABELS, ConnectorCategory, ConnectorWithState } from '@/lib/connectors/types'
import ConnectorCard from '@/components/connectors/ConnectorCard'

async function getConnectorsWithState(): Promise<ConnectorWithState[]> {
  const states = await prisma.connector.findMany()
  const stateMap = new Map(states.map((s) => [s.id, s]))

  return CONNECTORS.map((def) => {
    const state = stateMap.get(def.id)
    return {
      ...def,
      state: state
        ? {
            id: state.id,
            status: state.status as 'connected' | 'disconnected' | 'error' | 'pending',
            lastTestedAt: state.lastTestedAt?.toISOString(),
            errorMessage: state.errorMessage ?? undefined,
            createdAt: state.createdAt.toISOString(),
            updatedAt: state.updatedAt.toISOString(),
          }
        : undefined,
    }
  })
}

export default async function ConnectorsPage() {
  const connectors = await getConnectorsWithState()

  const connected = connectors.filter((c) => c.state?.status === 'connected').length
  const total = connectors.length

  // Group by category
  const categories = Object.keys(CATEGORY_LABELS) as ConnectorCategory[]
  const grouped = categories
    .map((cat) => ({
      key: cat,
      label: CATEGORY_LABELS[cat],
      items: connectors.filter((c) => c.category === cat),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-vemo-dark-900">Connector Hub</h1>
          <p className="text-vemo-dark-600">
            Alle Integrationen auf einen Blick — verbinden, konfigurieren, steuern
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="card px-5 py-3 text-center">
            <div className="text-3xl font-bold text-vemo-green-600">{connected}</div>
            <div className="text-xs text-vemo-dark-600 mt-1 font-medium">verbunden</div>
          </div>
          <div className="card px-5 py-3 text-center">
            <div className="text-3xl font-bold text-vemo-dark-900">{total}</div>
            <div className="text-xs text-vemo-dark-600 mt-1 font-medium">gesamt</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-vemo-dark-600">
          <span>Verbindungsstatus</span>
          <span>{connected} / {total} verbunden</span>
        </div>
        <div className="h-2 bg-vemo-dark-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-vemo-green-500 to-vemo-green-600 rounded-full transition-all duration-300"
            style={{ width: `${total > 0 ? (connected / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-12">
        {grouped.map((group) => (
          <section key={group.key}>
            <h2 className="text-sm font-semibold text-vemo-dark-900 uppercase tracking-wide mb-6 flex items-center gap-2">
              {group.label}
              <span className="text-vemo-dark-600 font-normal normal-case tracking-normal text-xs">
                ({group.items.filter((c) => c.state?.status === 'connected').length}/{group.items.length})
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.items.map((connector) => (
                <ConnectorCard key={connector.id} connector={connector} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
