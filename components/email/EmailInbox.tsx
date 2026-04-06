'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import EmailApprovalModal from './EmailApprovalModal'
import EmailSuggestionsModal from './EmailSuggestionsModal'

interface Draft {
  id: string
  subject: string
  body: string
  status: string
  createdAt: string
}

interface Email {
  id: string
  from: string
  fromName: string | null
  subject: string
  body: string
  priority: number
  receivedAt: string
  drafts: Draft[]
}

async function fetchEmails(isMock: boolean): Promise<Email[]> {
  const url = isMock ? '/api/emails?mock=true&limit=50' : '/api/emails?limit=50'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Fehler beim Laden der E-Mails')
  const data = await res.json()
  return data.emails
}

interface EmailInboxProps {
  isMock?: boolean
}

export default function EmailInbox({ isMock = false }: EmailInboxProps) {
  const queryClient = useQueryClient()
  const { data: emails = [], isLoading, isError } = useQuery({
    queryKey: ['emails', isMock],
    queryFn: () => fetchEmails(isMock),
  })

  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)
  const [suggestionsEmail, setSuggestionsEmail] = useState<Email | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')

  const filtered = emails.filter(e => {
    if (filter === 'pending') return e.drafts.some(d => d.status === 'pending')
    if (filter === 'done') return e.drafts.every(d => d.status !== 'pending')
    return true
  })

  const pendingCount = emails.filter(e => e.drafts.some(d => d.status === 'pending')).length

  if (isLoading) {
    return (
      <div className="card text-center py-16">
        <div className="text-5xl mb-4">⏳</div>
        <p className="text-vemo-dark-600">E-Mails laden...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="card text-center py-16 border-error-500 bg-error-50">
        <p className="text-error-600 text-sm font-medium">Fehler beim Laden der E-Mails</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { key: 'all', label: `Alle (${emails.length})` },
          { key: 'pending', label: `Ausstehend (${pendingCount})` },
          { key: 'done', label: 'Erledigt' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-all duration-200 ${
              filter === tab.key
                ? 'bg-vemo-green-500 text-white'
                : 'bg-vemo-dark-100 text-vemo-dark-700 hover:bg-vemo-dark-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-vemo-dark-900 font-medium">Keine E-Mails vorhanden</p>
          <p className="text-vemo-dark-600 text-sm mt-2">
            {isMock
              ? 'Demo-Modus: Konfiguriere einen E-Mail-Account in den Einstellungen'
              : 'Klicke auf "E-Mails abrufen" um dein Postfach zu synchronisieren'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(email => {
          const pendingDraft = email.drafts.find(d => d.status === 'pending')
          const hasSent = email.drafts.some(d => d.status === 'sent')

          return (
            <div
              key={email.id}
              className={`card transition-all duration-200 hover:shadow-md ${
                pendingDraft ? 'border-vemo-green-300 bg-vemo-green-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSuggestionsEmail(email)}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <PriorityBadge priority={email.priority} />
                    {pendingDraft && (
                      <span className="text-xs bg-vemo-green-100 text-vemo-green-700 px-2 py-1 rounded-full font-medium">
                        ✨ KI-Entwurf bereit
                      </span>
                    )}
                    {hasSent && (
                      <span className="text-xs bg-vemo-green-50 text-vemo-green-700 px-2 py-1 rounded-full font-medium">
                        ✅ Gesendet
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-vemo-dark-900 truncate">{email.subject}</div>
                  <div className="text-sm text-vemo-dark-600 mt-1">
                    {email.fromName || email.from}
                    <span className="text-vemo-dark-500 ml-2 text-xs">{email.from}</span>
                  </div>
                  <div className="text-sm text-vemo-dark-600 mt-1.5 truncate line-clamp-1">{email.body.substring(0, 120)}...</div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="text-xs text-vemo-dark-500 whitespace-nowrap">
                    {new Date(email.receivedAt).toLocaleDateString('de-CH', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  <button
                    onClick={() => setSuggestionsEmail(email)}
                    className="text-xs px-3 py-1.5 bg-vemo-green-500 text-white rounded-sm font-medium hover:bg-vemo-green-600 transition-colors whitespace-nowrap"
                  >
                    ✨ Reply-Suggestions
                  </button>
                  {pendingDraft && (
                    <button
                      onClick={() => { setSelectedEmail(email); setSelectedDraft(pendingDraft) }}
                      className="text-xs px-3 py-1.5 bg-vemo-dark-100 text-vemo-dark-700 rounded-sm hover:bg-vemo-dark-200 transition-colors"
                    >
                      📝 Entwurf prüfen
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedEmail && selectedDraft && (
        <EmailApprovalModal
          email={selectedEmail}
          draft={selectedDraft}
          onClose={() => { setSelectedEmail(null); setSelectedDraft(null) }}
          onAction={() => {
            setSelectedEmail(null)
            setSelectedDraft(null)
            queryClient.invalidateQueries({ queryKey: ['emails'] })
          }}
        />
      )}

      {suggestionsEmail && (
        <EmailSuggestionsModal
          email={suggestionsEmail}
          isMock={isMock}
          onClose={() => setSuggestionsEmail(null)}
          onSent={() => {
            setSuggestionsEmail(null)
            queryClient.invalidateQueries({ queryKey: ['emails'] })
          }}
        />
      )}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: number }) {
  if (priority >= 8) return <span className="text-xs bg-error-50 text-error-600 px-2 py-1 rounded font-medium">🔴 Kritisch</span>
  if (priority >= 6) return <span className="text-xs bg-warning-50 text-warning-600 px-2 py-1 rounded font-medium">🟠 Hoch</span>
  if (priority >= 4) return <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded font-medium">🟡 Mittel</span>
  return <span className="text-xs bg-vemo-dark-100 text-vemo-dark-600 px-2 py-1 rounded font-medium">⚪ Niedrig</span>
}
