'use client'

import { useState } from 'react'
import EmailApprovalModal from './EmailApprovalModal'

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

export default function EmailInbox({ emails }: { emails: Email[] }) {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')

  const filtered = emails.filter(e => {
    if (filter === 'pending') return e.drafts.some(d => d.status === 'pending')
    if (filter === 'done') return e.drafts.every(d => d.status !== 'pending')
    return true
  })

  const pendingCount = emails.filter(e => e.drafts.some(d => d.status === 'pending')).length

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
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
          <p className="text-vemo-dark-600 text-sm mt-2">Klicke auf "E-Mails abrufen" um dein Postfach zu synchronisieren</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(email => {
          const pendingDraft = email.drafts.find(d => d.status === 'pending')
          const hasSent = email.drafts.some(d => d.status === 'sent')

          return (
            <div
              key={email.id}
              className={`card cursor-pointer transition-all duration-200 hover:shadow-md ${
                pendingDraft ? 'border-vemo-green-300 bg-vemo-green-50' : ''
              }`}
              onClick={() => {
                setSelectedEmail(email)
                setSelectedDraft(pendingDraft || email.drafts[0] || null)
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
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
                <div className="text-xs text-vemo-dark-500 whitespace-nowrap pt-1">
                  {new Date(email.receivedAt).toLocaleDateString('de-CH', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                  })}
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
            window.location.reload()
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
