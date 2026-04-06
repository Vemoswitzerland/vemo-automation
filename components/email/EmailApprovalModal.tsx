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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">✨ KI-Entwurf prüfen</h2>
            <p className="text-sm text-gray-400 mt-0.5">Überprüfe und bearbeite die KI-generierte Antwort</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
            ✕
          </button>
        </div>

        <div className="flex gap-6 p-6 overflow-auto flex-1">
          {/* Original email */}
          <div className="flex-1">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Eingegangene E-Mail</div>
            <div className="card bg-gray-950/50 h-full">
              <div className="mb-3">
                <div className="text-xs text-gray-600">Von:</div>
                <div className="text-sm text-gray-300">{email.fromName || email.from}</div>
                {email.fromName && <div className="text-xs text-gray-600">{email.from}</div>}
              </div>
              <div className="mb-3">
                <div className="text-xs text-gray-600">Betreff:</div>
                <div className="text-sm text-white font-medium">{email.subject}</div>
              </div>
              <div className="text-xs text-gray-600 mb-1">Nachricht:</div>
              <div className="text-sm text-gray-400 whitespace-pre-wrap">{email.body}</div>
            </div>
          </div>

          {/* Draft response */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">KI-Antwort (editierbar)</div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Betreff</label>
              <input
                value={editedSubject}
                onChange={e => setEditedSubject(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Nachricht</label>
              <textarea
                value={editedBody}
                onChange={e => setEditedBody(e.target.value)}
                rows={12}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            {/* Regenerate */}
            <div>
              {!showRegen ? (
                <button
                  onClick={() => setShowRegen(true)}
                  className="text-xs text-sky-500 hover:text-sky-400 transition-colors"
                >
                  🔄 Neu generieren mit Anweisungen
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={regenInstructions}
                    onChange={e => setRegenInstructions(e.target.value)}
                    placeholder="z.B. 'formeller', 'kürzer', 'auf Englisch'"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                  >
                    {regenerating ? '⏳' : '✨ Neu'}
                  </button>
                  <button onClick={() => setShowRegen(false)} className="text-gray-500 hover:text-white text-xs">
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <button
            onClick={() => handleAction('reject')}
            disabled={loading}
            className="btn-danger disabled:opacity-50"
          >
            ✕ Ablehnen
          </button>
          <div className="flex gap-2">
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
              className="btn-success disabled:opacity-50"
            >
              📤 Senden
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
