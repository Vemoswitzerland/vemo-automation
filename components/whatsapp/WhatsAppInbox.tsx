'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import WhatsAppApprovalModal from './WhatsAppApprovalModal'

interface Draft {
  id: string
  body: string
  status: string
  createdAt: string
}

interface WaMessage {
  id: string
  from: string
  fromName: string | null
  body: string
  status: string
  receivedAt: string
  drafts: Draft[]
}

async function fetchMessages(): Promise<{ messages: WaMessage[]; isMockMode: boolean }> {
  const res = await fetch('/api/whatsapp?limit=50')
  if (!res.ok) throw new Error('Fehler beim Laden der Nachrichten')
  return res.json()
}

export default function WhatsAppInbox() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['whatsapp-messages'],
    queryFn: fetchMessages,
  })

  const messages = data?.messages ?? []
  const isMockMode = data?.isMockMode ?? true

  const [selectedMessage, setSelectedMessage] = useState<WaMessage | null>(null)
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)

  const filtered = messages.filter(m => {
    if (filter === 'pending') return m.drafts.some(d => d.status === 'pending')
    if (filter === 'done') return m.drafts.some(d => d.status === 'sent') || m.drafts.every(d => d.status !== 'pending')
    return true
  })

  const pendingCount = messages.filter(m => m.drafts.some(d => d.status === 'pending')).length
  const unreadCount = messages.filter(m => m.status === 'unread').length

  const handleGenerateDraft = async (messageId: string) => {
    setGeneratingFor(messageId)
    try {
      const res = await fetch('/api/whatsapp/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      })
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] })
      }
    } finally {
      setGeneratingFor(null)
    }
  }

  const handleOpenDraft = (message: WaMessage, draft: Draft) => {
    setSelectedMessage(message)
    setSelectedDraft(draft)
  }

  const handleModalClose = () => {
    setSelectedMessage(null)
    setSelectedDraft(null)
  }

  const handleModalAction = async () => {
    await queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] })
    handleModalClose()
  }

  if (isLoading) {
    return (
      <div className="card text-center py-16">
        <div className="text-5xl mb-4">⏳</div>
        <p className="text-vemo-dark-600">Nachrichten laden...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="card text-center py-16 border-error-500 bg-error-50">
        <p className="text-error-600 text-sm font-medium">Fehler beim Laden der Nachrichten</p>
      </div>
    )
  }

  return (
    <>
      {/* Mock mode badge */}
      {isMockMode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
          <span>🧪</span>
          <span className="font-medium">Mock-Modus</span>
          <span className="text-amber-600">— Kein WhatsApp Business API-Key konfiguriert. Demo-Daten werden angezeigt.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-vemo-dark-900">{messages.length}</div>
          <div className="text-xs text-vemo-dark-600 mt-1">Nachrichten total</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-amber-500">{unreadCount}</div>
          <div className="text-xs text-vemo-dark-600 mt-1">Ungelesen</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-green-500">{pendingCount}</div>
          <div className="text-xs text-vemo-dark-600 mt-1">Warten auf Freigabe</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: `Alle (${messages.length})` },
          { key: 'pending', label: `Freigabe (${pendingCount})` },
          { key: 'done', label: 'Beantwortet' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as 'all' | 'pending' | 'done')}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-all duration-200 ${
              filter === tab.key
                ? 'bg-green-500 text-white'
                : 'bg-vemo-dark-100 text-vemo-dark-700 hover:bg-vemo-dark-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-vemo-dark-900 font-medium">Keine Nachrichten</p>
          <p className="text-vemo-dark-600 text-sm mt-2">
            {filter === 'pending' ? 'Keine Nachrichten warten auf Freigabe.' : 'Keine WhatsApp-Nachrichten vorhanden.'}
          </p>
        </div>
      )}

      {/* Message list */}
      <div className="space-y-3">
        {filtered.map(message => {
          const pendingDraft = message.drafts.find(d => d.status === 'pending')
          const sentDraft = message.drafts.find(d => d.status === 'sent')
          const approvedDraft = message.drafts.find(d => d.status === 'approved')
          const isUnread = message.status === 'unread'
          const isGenerating = generatingFor === message.id

          return (
            <div
              key={message.id}
              className={`card transition-all duration-200 hover:shadow-md ${
                isUnread ? 'border-l-4 border-l-green-400' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm flex-shrink-0">
                  {(message.fromName || message.from).charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-vemo-dark-900">
                      {message.fromName || message.from}
                    </span>
                    {message.fromName && (
                      <span className="text-xs text-vemo-dark-500">{message.from}</span>
                    )}
                    {isUnread && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Neu
                      </span>
                    )}
                    <span className="text-xs text-vemo-dark-400 ml-auto">
                      {new Date(message.receivedAt).toLocaleString('de-CH', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Message preview */}
                  <p className="text-sm text-vemo-dark-700 line-clamp-2 mb-3">{message.body}</p>

                  {/* Draft status & actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {sentDraft && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700 font-medium">
                        ✓ Gesendet
                      </span>
                    )}
                    {approvedDraft && !sentDraft && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 font-medium">
                        ✓ Entwurf gespeichert
                      </span>
                    )}
                    {pendingDraft && (
                      <button
                        onClick={() => handleOpenDraft(message, pendingDraft)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 rounded text-xs font-semibold transition-colors"
                      >
                        ⚡ Antwort prüfen
                      </button>
                    )}
                    {!pendingDraft && !sentDraft && (
                      <button
                        onClick={() => handleGenerateDraft(message.id)}
                        disabled={isGenerating}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-vemo-dark-100 hover:bg-vemo-dark-200 text-vemo-dark-700 rounded text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {isGenerating ? '⏳ Generiert...' : '✨ KI-Antwort erstellen'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Approval Modal */}
      {selectedMessage && selectedDraft && (
        <WhatsAppApprovalModal
          message={selectedMessage}
          draft={selectedDraft}
          onClose={handleModalClose}
          onAction={handleModalAction}
        />
      )}
    </>
  )
}
