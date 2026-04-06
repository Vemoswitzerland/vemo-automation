import { prisma } from '@/lib/db'
import { CONNECTORS } from '@/lib/connectors/registry'
import { CATEGORY_LABELS, ConnectorCategory, ConnectorWithState } from '@/lib/connectors/types'
import ConnectorCard from '@/components/connectors/ConnectorCard'
import Link from 'next/link'

const FEATURED_IDS = ['gmail', 'instagram', 'telegram', 'whatsapp', 'anthropic', 'paperclip']

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

const STATUS_CONFIG = {
  connected: { label: 'Verbunden', dot: 'bg-vemo-green-500', text: 'text-vemo-green-700', bg: 'bg-vemo-green-50', border: 'border-vemo-green-200' },
  disconnected: { label: 'Nicht verbunden', dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  error: { label: 'Fehler', dot: 'bg-error-500', text: 'text-error-600', bg: 'bg-error-50', border: 'border-error-200' },
  pending: { label: 'Ausstehend', dot: 'bg-warning-500', text: 'text-warning-700', bg: 'bg-warning-50', border: 'border-warning-200' },
}

function FeaturedCard({ connector }: { connector: ConnectorWithState }) {
  const status = connector.state?.status ?? 'disconnected'
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.disconnected

  return (
    <Link
      href={`/connectors/${connector.id}`}
      className={`relative block rounded-2xl border ${cfg.border} bg-white p-6 hover:shadow-lg transition-all group`}
    >
      {/* Status badge */}
      <span className={`absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        <span className={`w-2 h-2 rounded-full ${cfg.dot} ${status === 'connected' ? 'animate-pulse' : ''}`} />
        {cfg.label}
      </span>

      {/* Icon large */}
      <div className="text-5xl mb-4">{connector.icon}</div>

      {/* Name */}
      <h3 className="text-lg font-bold text-gray-900 group-hover:text-vemo-green-600 transition-colors">
        {connector.name}
      </h3>
      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{connector.description}</p>

      {/* Meta */}
      <div className="mt-4 flex items-center gap-3 text-xs text-gray-500 font-medium">
        {connector.actions.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-vemo-green-400" />
            {connector.actions.length} Aktionen
          </span>
        )}
        {connector.triggers.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-vemo-blue-400" />
            {connector.triggers.length} Trigger
          </span>
        )}
      </div>

      {/* Last tested */}
      {connector.state?.lastTestedAt && (
        <div className="mt-3 text-xs text-gray-400">
          Zuletzt getestet: {new Date(connector.state.lastTestedAt).toLocaleDateString('de-CH')}
        </div>
      )}
    </Link>
  )
}

export default async function ConnectionsPage() {
  const connectors = await getConnectorsWithState()

  const connected = connectors.filter((c) => c.state?.status === 'connected').length
  const total = connectors.length
  const percentage = total > 0 ? Math.round((connected / total) * 100) : 0

  // Featured connectors
  const featured = FEATURED_IDS
    .map((id) => connectors.find((c) => c.id === id))
    .filter((c): c is ConnectorWithState => c !== undefined)

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
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Verbindungen & APIs
          </h1>
          <p className="text-gray-600 text-base max-w-xl">
            Alle Integrationen zentral verwalten. Verbinde deine Tools, konfiguriere APIs und behalte den Status im Blick.
          </p>
        </div>

        {/* Connection stats */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-center min-w-[80px] shadow-sm">
            <div className="text-3xl font-extrabold text-vemo-green-600">{connected}</div>
            <div className="text-xs text-gray-500 mt-0.5 font-medium">Aktiv</div>
          </div>
          <div className="text-2xl text-gray-300 font-light">/</div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-center min-w-[80px] shadow-sm">
            <div className="text-3xl font-extrabold text-gray-800">{total}</div>
            <div className="text-xs text-gray-500 mt-0.5 font-medium">Gesamt</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800">Verbindungsstatus</span>
          <span className="text-sm font-medium text-gray-600">
            {connected} von {total} verbunden ({percentage}%)
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-vemo-green-400 to-vemo-green-600 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-vemo-green-500" />
            {connected} Verbunden
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            {total - connected} Nicht verbunden
          </span>
        </div>
      </div>

      {/* Featured connections */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              Wichtigste Verbindungen
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              {featured.filter((c) => c.state?.status === 'connected').length} / {featured.length} aktiv
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((connector) => (
              <FeaturedCard key={connector.id} connector={connector} />
            ))}
          </div>
        </section>
      )}

      {/* All connections by category */}
      <div className="space-y-12">
        {grouped.map((group) => {
          const groupConnected = group.items.filter((c) => c.state?.status === 'connected').length
          return (
            <section key={group.key}>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  {group.label}
                </h2>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {groupConnected} / {group.items.length}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {group.items.map((connector) => (
                  <ConnectorCard key={connector.id} connector={connector} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
