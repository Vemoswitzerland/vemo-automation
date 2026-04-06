'use client'

import { useState, useEffect, useCallback } from 'react'

type Approval = {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  channel: string
  chatId: string | null
  messageId: string | null
  metadata: string | null
  approvedAt: string | null
  rejectedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // New approval form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newChannel, setNewChannel] = useState<'telegram' | 'manual'>('telegram')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loadApprovals = useCallback(async () => {
    try {
      const res = await fetch('/api/approvals')
      const data = await res.json()
      setApprovals(data.approvals ?? [])
    } catch {
      console.error('Fehler beim Laden der Approvals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadApprovals()
  }, [loadApprovals])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id + action)
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        await loadApprovals()
      }
    } catch {
      console.error('Fehler beim Aktualisieren')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePoll = async () => {
    setPolling(true)
    try {
      const res = await fetch('/api/telegram/poll', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        await loadApprovals()
      }
    } catch {
      console.error('Polling-Fehler')
    } finally {
      setPolling(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          channel: newChannel,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error ?? 'Fehler beim Erstellen')
        return
      }
      setShowDialog(false)
      setNewTitle('')
      setNewDescription('')
      setNewChannel('telegram')
      await loadApprovals()
    } catch {
      setCreateError('Netzwerkfehler')
    } finally {
      setCreating(false)
    }
  }

  const pendingCount = approvals.filter((a) => a.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-vemo-dark-900">Approval-Zentrale</h1>
          <p className="text-vemo-dark-600 text-sm">
            {pendingCount > 0
              ? `${pendingCount} offene Anfrage${pendingCount !== 1 ? 'n' : ''}`
              : 'Keine offenen Anfragen'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePoll}
            disabled={polling}
            className="px-3 py-2 text-sm font-normal text-vemo-dark-600 border border-vemo-dark-200 rounded-sm hover:bg-vemo-dark-100 transition-colors disabled:opacity-50"
          >
            {polling ? 'Prüfe Telegram...' : '🔄 Telegram abfragen'}
          </button>
          <button
            onClick={() => setShowDialog(true)}
            className="px-4 py-2 text-sm font-medium bg-vemo-green-500 text-white rounded-sm hover:bg-vemo-green-600 transition-colors"
          >
            + Neue Anfrage senden
          </button>
        </div>
      </div>

      {/* Approvals list */}
      {loading ? (
        <div className="text-center py-12 text-vemo-dark-500 text-sm">Lade Approvals...</div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-12 text-vemo-dark-500 text-sm">
          Noch keine Approval-Anfragen. Erstelle eine neue mit dem Button oben.
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={() => handleAction(approval.id, 'approve')}
              onReject={() => handleAction(approval.id, 'reject')}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-vemo-dark-900">Neue Approval-Anfrage</h2>
              <button
                onClick={() => setShowDialog(false)}
                className="text-vemo-dark-400 hover:text-vemo-dark-700 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-vemo-dark-700">
                  Titel <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="z.B. Instagram Post genehmigen"
                  className="w-full px-3 py-2 text-sm border border-vemo-dark-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-vemo-green-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-vemo-dark-700">
                  Beschreibung
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optionale Details zur Anfrage..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-vemo-dark-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-vemo-green-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-vemo-dark-700">Kanal</label>
                <select
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value as 'telegram' | 'manual')}
                  className="w-full px-3 py-2 text-sm border border-vemo-dark-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-vemo-green-500 bg-white"
                >
                  <option value="telegram">Telegram</option>
                  <option value="manual">Manuell (kein Versand)</option>
                </select>
              </div>

              {createError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
                  {createError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDialog(false)}
                  className="flex-1 px-4 py-2 text-sm text-vemo-dark-600 border border-vemo-dark-200 rounded-sm hover:bg-vemo-dark-100 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-vemo-green-500 text-white rounded-sm hover:bg-vemo-green-600 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Erstelle...' : 'Senden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ApprovalCard({
  approval,
  onApprove,
  onReject,
  actionLoading,
}: {
  approval: Approval
  onApprove: () => void
  onReject: () => void
  actionLoading: string | null
}) {
  const isPending = approval.status === 'pending'

  const statusBadge = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    expired: 'bg-gray-100 text-gray-600 border-gray-200',
  }[approval.status]

  const statusLabel = {
    pending: 'Ausstehend',
    approved: 'Approved',
    rejected: 'Rejected',
    expired: 'Abgelaufen',
  }[approval.status]

  const statusIcon = {
    pending: '⏳',
    approved: '✅',
    rejected: '❌',
    expired: '⌛',
  }[approval.status]

  const channelIcon = approval.channel === 'telegram' ? '✈️' : '👤'

  const formattedDate = new Date(approval.createdAt).toLocaleString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`bg-white border rounded-sm p-4 space-y-3 ${isPending ? 'border-yellow-200' : 'border-vemo-dark-200'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-vemo-dark-900 text-sm">{approval.title}</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-full ${statusBadge}`}
            >
              {statusIcon} {statusLabel}
            </span>
            <span className="text-xs text-vemo-dark-400" title={`Kanal: ${approval.channel}`}>
              {channelIcon} {approval.channel}
            </span>
          </div>
          {approval.description && (
            <p className="text-sm text-vemo-dark-600 line-clamp-2">{approval.description}</p>
          )}
          <p className="text-xs text-vemo-dark-400">
            {formattedDate}
            {approval.approvedAt &&
              ` · Approved: ${new Date(approval.approvedAt).toLocaleString('de-CH', { hour: '2-digit', minute: '2-digit' })}`}
            {approval.rejectedAt &&
              ` · Rejected: ${new Date(approval.rejectedAt).toLocaleString('de-CH', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
          <p className="text-xs text-vemo-dark-300 font-mono">{approval.id}</p>
        </div>

        {isPending && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onApprove}
              disabled={actionLoading !== null}
              className="px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded-sm hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {actionLoading === approval.id + 'approve' ? '...' : '✅ Approve'}
            </button>
            <button
              onClick={onReject}
              disabled={actionLoading !== null}
              className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-sm hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {actionLoading === approval.id + 'reject' ? '...' : '❌ Reject'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
