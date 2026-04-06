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
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: `Alle (${emails.length})` },
          { key: 'pending', label: `Ausstehend (${pendingCount})` },
          { key: 'done', label: 'Erledigt' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === tab.key
                ? 'bg-sky-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-400">Keine E-Mails vorhanden</p>
          <p className="text-gray-600 text-sm mt-1">Klicke auf "E-Mails abrufen" um dein Postfach zu synchronisieren</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(email => {
          const pendingDraft = email.drafts.find(d => d.status === 'pending')
          const hasSent = email.drafts.some(d => d.status === 'sent')

          return (
            <div
              key={email.id}
              className={`card hover:border-gray-700 cursor-pointer transition-all ${
                pendingDraft ? 'border-sky-900/50 bg-sky-950/10' : ''
              }`}
              onClick={() => {
                setSelectedEmail(email)
                setSelectedDraft(pendingDraft || email.drafts[0] || null)
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <PriorityBadge priority={email.priority} />
                    {pendingDraft && (
                      <span className="text-xs bg-sky-900/50 text-sky-300 px-2 py-0.5 rounded-full">
                        ✨ KI-Entwurf bereit
                      </span>
                    )}
                    {hasSent && (
                      <span className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full">
                        ✅ Gesendet
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-white truncate">{email.subject}</div>
                  <div className="text-sm text-gray-400 mt-0.5">
                    {email.fromName || email.from}
                    <span className="text-gray-600 ml-2 text-xs">{email.from}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1 truncate">{email.body.substring(0, 120)}...</div>
                </div>
                <div className="text-xs text-gray-600 whitespace-nowrap">
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
  if (priority >= 8) return <span className="text-xs bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded">🔴 Kritisch</span>
  if (priority >= 6) return <span className="text-xs bg-orange-900/50 text-orange-300 px-1.5 py-0.5 rounded">🟠 Hoch</span>
  if (priority >= 4) return <span className="text-xs bg-yellow-900/50 text-yellow-300 px-1.5 py-0.5 rounded">🟡 Mittel</span>
  return <span className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">⚪ Niedrig</span>
}
