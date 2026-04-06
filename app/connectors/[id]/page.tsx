import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getConnectorById } from '@/lib/connectors/registry'
import ConnectorConfigForm from '@/components/connectors/ConnectorConfigForm'

type Props = { params: Promise<{ id: string }> }

export default async function ConnectorDetailPage({ params }: Props) {
  const { id } = await params
  const def = getConnectorById(id)
  if (!def) notFound()

  const state = await prisma.connector.findUnique({ where: { id } })

  const stateData = state
    ? {
        id: state.id,
        status: state.status as 'connected' | 'disconnected' | 'error' | 'pending',
        lastTestedAt: state.lastTestedAt?.toISOString(),
        errorMessage: state.errorMessage ?? undefined,
        createdAt: state.createdAt.toISOString(),
        updatedAt: state.updatedAt.toISOString(),
      }
    : undefined

  const STATUS_LABELS = {
    connected: '✅ Verbunden',
    disconnected: '⚫ Getrennt',
    error: '❌ Fehler',
    pending: '⏳ Ausstehend',
  }

  const currentStatus = stateData?.status ?? 'disconnected'

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <a href="/connectors" className="text-sm text-gray-500 hover:text-gray-300 transition-colors inline-flex items-center gap-1 mb-6">
        ← Zurück zum Connector Hub
      </a>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="text-5xl">{def.icon}</div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{def.name}</h1>
          <p className="text-gray-400 text-sm mt-1">{def.description}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm">{STATUS_LABELS[currentStatus]}</span>
            {stateData?.lastTestedAt && (
              <span className="text-xs text-gray-600">
                Zuletzt verbunden: {new Date(stateData.lastTestedAt).toLocaleString('de-CH')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {stateData?.errorMessage && (
        <div className="card border-red-800 bg-red-900/20 text-red-300 text-sm mb-6 p-4">
          ⚠️ {stateData.errorMessage}
        </div>
      )}

      {/* Config Form */}
      <ConnectorConfigForm connector={{ ...def, state: stateData }} />

      {/* Actions & Triggers info */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        {def.actions.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Aktionen</h3>
            <ul className="space-y-1">
              {def.actions.map((action) => (
                <li key={action} className="text-xs text-gray-400 flex items-center gap-2">
                  <span className="text-sky-400">▸</span> {action}
                </li>
              ))}
            </ul>
          </div>
        )}
        {def.triggers.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Trigger</h3>
            <ul className="space-y-1">
              {def.triggers.map((trigger) => (
                <li key={trigger} className="text-xs text-gray-400 flex items-center gap-2">
                  <span className="text-green-400">⚡</span> {trigger}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
