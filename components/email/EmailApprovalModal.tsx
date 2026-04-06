'use client'

import { useState } from 'react'

interface Draft {
  id: string
  subject: string
  body: string
  status: string
}

interface Email {
  id: string
  from: string
  fromName: string | null
  subject: string
  body: string
  receivedAt: string
}

interface Props {
  email: Email
  draft: Draft
  onClose: () => void
  onAction: () => void
}

export default function EmailApprovalModal({ email, draft, onClose, onAction }: Props) {
  const [editedSubject, setEditedSubject] = useState(draft.subject)
  const [editedBody, setEditedBody] = useState(draft.body)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenInstructions, setRegenInstructions] = useState('')
  const [showRegen, setShowRegen] = useState(false)

  const handleAction = async (action: 'approve' | 'reject' | 'send') => {
    setLoading(true)
    try {
      const res = await fetch('/api/emails/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: draft.id,
          action,
          editedSubject: editedSubject !== draft.subject ? editedSubject : undefined,
          editedBody: editedBody !== draft.body ? editedBody : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        onAction()
      } else {
        alert('Fehler: ' + data.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await fetch('/api/emails/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: email.id, instructions: regenInstructions }),
      })
      const data = await res.json()
      if (res.ok) {
        setEditedSubject(data.subject)
        setEditedBody(data.body)
        setShowRegen(false)
        setRegenInstructions('')
      }
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-vemo-dark-200 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-vemo-dark-200 bg-vemo-dark-50">
          <div>
            <h2 className="text-lg font-semibold text-vemo-dark-900">✨ KI-Entwurf prüfen</h2>
            <p className="text-sm text-vemo-dark-600 mt-1">Überprüfe und bearbeite die KI-generierte Antwort</p>
          </div>
          <button onClick={onClose} className="text-vemo-dark-400 hover:text-vemo-dark-900 transition-colors p-2 rounded-sm hover:bg-vemo-dark-100">
            ✕
          </button>
        </div>

        <div className="flex gap-6 p-6 overflow-auto flex-1">
          {/* Original email */}
          <div className="flex-1">
            <div className="text-xs text-vemo-dark-600 uppercase tracking-wide mb-3 font-semibold">Eingegangene E-Mail</div>
            <div className="card h-full">
              <div className="mb-4 pb-4 border-b border-vemo-dark-200">
                <div className="text-xs text-vemo-dark-600 font-medium">Von:</div>
                <div className="text-sm text-vemo-dark-900 font-medium mt-1">{email.fromName || email.from}</div>
                {email.fromName && <div className="text-xs text-vemo-dark-600 mt-0.5">{email.from}</div>}
              </div>
              <div className="mb-4 pb-4 border-b border-vemo-dark-200">
                <div className="text-xs text-vemo-dark-600 font-medium">Betreff:</div>
                <div className="text-sm text-vemo-dark-900 font-medium mt-1">{email.subject}</div>
              </div>
              <div className="text-xs text-vemo-dark-600 font-medium mb-2">Nachricht:</div>
              <div className="text-sm text-vemo-dark-700 whitespace-pre-wrap leading-relaxed">{email.body}</div>
            </div>
          </div>

          {/* Draft response */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="text-xs text-vemo-dark-600 uppercase tracking-wide font-semibold">KI-Antwort (editierbar)</div>
            <div>
              <label className="text-xs font-medium text-vemo-dark-700 mb-2 block">Betreff</label>
              <input
                value={editedSubject}
                onChange={e => setEditedSubject(e.target.value)}
                className="input w-full"
              />
            </div>
            <div className="flex-1 flex flex-col">
              <label className="text-xs font-medium text-vemo-dark-700 mb-2 block">Nachricht</label>
              <textarea
                value={editedBody}
                onChange={e => setEditedBody(e.target.value)}
                rows={12}
                className="input w-full flex-1 resize-none"
              />
            </div>

            {/* Regenerate */}
            <div>
              {!showRegen ? (
                <button
                  onClick={() => setShowRegen(true)}
                  className="text-xs text-vemo-green-600 hover:text-vemo-green-700 font-medium transition-colors"
                >
                  🔄 Neu generieren mit Anweisungen
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={regenInstructions}
                    onChange={e => setRegenInstructions(e.target.value)}
                    placeholder="z.B. 'formeller', 'kürzer', 'auf Englisch'"
                    className="input flex-1 text-xs py-2"
                  />
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
                  >
                    {regenerating ? '⏳' : '✨ Neu'}
                  </button>
                  <button onClick={() => setShowRegen(false)} className="text-vemo-dark-400 hover:text-vemo-dark-900 text-xs px-2 py-2 rounded-sm hover:bg-vemo-dark-100">
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-vemo-dark-200 bg-vemo-dark-50">
          <button
            onClick={() => handleAction('reject')}
            disabled={loading}
            className="btn-danger disabled:opacity-50"
          >
            ✕ Ablehnen
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => handleAction('approve')}
              disabled={loading}
              className="btn-secondary disabled:opacity-50"
            >
              ✓ Entwurf speichern
            </button>
            <button
              onClick={() => handleAction('send')}
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-vemo-green-500 text-white font-semibold rounded-sm text-sm transition-all duration-200 hover:bg-vemo-green-600 disabled:opacity-50"
            >
              📤 Senden
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
