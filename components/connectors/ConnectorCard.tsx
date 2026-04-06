'use client'

import { ConnectorWithState } from '@/lib/connectors/types'
import Link from 'next/link'

interface Props {
  connector: ConnectorWithState
}

const STATUS_CONFIG = {
  connected: { label: 'Verbunden', dot: 'bg-vemo-green-500', text: 'text-vemo-green-700', ring: 'ring-vemo-green-100' },
  disconnected: { label: 'Getrennt', dot: 'bg-gray-400', text: 'text-gray-600', ring: 'ring-gray-200' },
  error: { label: 'Fehler', dot: 'bg-error-500', text: 'text-error-600', ring: 'ring-error-100' },
  pending: { label: 'Ausstehend', dot: 'bg-warning-500', text: 'text-warning-700', ring: 'ring-warning-100' },
}

export default function ConnectorCard({ connector }: Props) {
  const status = connector.state?.status ?? 'disconnected'
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.disconnected

  return (
    <Link
      href={`/connectors/${connector.id}`}
      className={`card hover:shadow-lg transition-all group relative block ring-1 ${cfg.ring}`}
    >
      {/* Status dot */}
      <span className="absolute top-4 right-4 flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${cfg.dot} ${status === 'connected' ? 'animate-pulse' : ''}`} />
        <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
      </span>

      {/* Icon */}
      <div className="text-4xl mb-3">{connector.icon}</div>

      {/* Name + description */}
      <h3 className="font-semibold text-gray-900 group-hover:text-vemo-green-600 transition-colors text-sm leading-snug">
        {connector.name}
      </h3>
      <p className="text-xs text-gray-600 mt-2 line-clamp-2">{connector.description}</p>

      {/* Actions count */}
      <div className="mt-4 flex items-center gap-3 text-xs text-gray-600 font-medium">
        {connector.actions.length > 0 && (
          <span>{connector.actions.length} Aktionen</span>
        )}
        {connector.triggers.length > 0 && (
          <span>{connector.triggers.length} Trigger</span>
        )}
      </div>

      {/* Last tested */}
      {connector.state?.lastTestedAt && (
        <div className="mt-3 text-xs text-gray-500">
          Zuletzt: {new Date(connector.state.lastTestedAt).toLocaleDateString('de-CH')}
        </div>
      )}
    </Link>
  )
}
