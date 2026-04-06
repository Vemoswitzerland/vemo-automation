'use client'

import { useState } from 'react'

interface Props {
  selectedIds: string[]
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onBatchAction: (action: 'approve' | 'reject' | 'archive') => Promise<void>
}

export default function EmailBatchActions({
  selectedIds,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBatchAction,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  const count = selectedIds.length

  if (count === 0) {
    return (
      <div className="flex items-center gap-3 text-xs text-vemo-dark-500">
        <button
          onClick={onSelectAll}
          className="px-3 py-1.5 bg-vemo-dark-100 hover:bg-vemo-dark-200 text-vemo-dark-700 rounded-sm font-medium transition-colors"
        >
          ☑ Alle auswählen
        </button>
        <span>{totalCount} E-Mail(s)</span>
      </div>
    )
  }

  const handle = async (action: 'approve' | 'reject' | 'archive') => {
    setLoading(action)
    try {
      await onBatchAction(action)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-vemo-green-50 border border-vemo-green-200 rounded-sm px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm font-medium text-vemo-green-800">
        <span className="bg-vemo-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {count}
        </span>
        ausgewählt
      </div>

      <div className="flex gap-2 ml-2">
        <button
          onClick={() => handle('approve')}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-vemo-green-500 text-white text-xs font-semibold rounded-sm hover:bg-vemo-green-600 transition-colors disabled:opacity-50"
        >
          {loading === 'approve' ? '⏳' : '✓'} Entwürfe genehmigen
        </button>
        <button
          onClick={() => handle('reject')}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-error-50 text-error-700 text-xs font-semibold rounded-sm border border-error-200 hover:bg-error-100 transition-colors disabled:opacity-50"
        >
          {loading === 'reject' ? '⏳' : '✕'} Ablehnen
        </button>
        <button
          onClick={() => handle('archive')}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-vemo-dark-100 text-vemo-dark-700 text-xs font-medium rounded-sm hover:bg-vemo-dark-200 transition-colors disabled:opacity-50"
        >
          {loading === 'archive' ? '⏳' : '📁'} Archivieren
        </button>
      </div>

      <button
        onClick={onClearSelection}
        className="ml-auto text-xs text-vemo-dark-500 hover:text-vemo-dark-800 transition-colors px-2 py-1 rounded-sm hover:bg-vemo-green-100"
      >
        ✕ Abwählen
      </button>
    </div>
  )
}
