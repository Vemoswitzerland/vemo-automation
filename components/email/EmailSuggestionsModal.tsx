'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

type ToneSetting = 'formal' | 'freundlich' | 'juristisch'

interface EmailSuggestion {
  id: string
  style: 'hoeflich' | 'technisch' | 'dringend'
  styleLabel: string
  styleEmoji: string
  subject: string
  body: string
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
  isMock?: boolean
  onClose: () => void
  onSent: () => void
}

const TONES: { key: ToneSetting; label: string; desc: string }[] = [
  { key: 'formal', label: 'Formal', desc: 'Professionell, "Sie"' },
  { key: 'freundlich', label: 'Freundlich', desc: 'Herzlich, "Du"' },
  { key: 'juristisch', label: 'Juristisch', desc: 'Präzise, mit Disclaimer' },
]

async function fetchSuggestions(emailId: string, tone: ToneSetting, isMock: boolean): Promise<EmailSuggestion[]> {
  const params = new URLSearchParams({ emailId, tone })
  if (isMock) params.set('mock', 'true')
  const res = await fetch(`/api/emails/suggestions?${params}`)
  if (!res.ok) throw new Error('Fehler beim Laden der Vorschläge')
  const data = await res.json()
  return data.suggestions
}

export default function EmailSuggestionsModal({ email, isMock = false, onClose, onSent }: Props) {
  const [tone, setTone] = useState<ToneSetting>('formal')
  const [activeTone, setActiveTone] = useState<ToneSetting>('formal')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedTexts, setEditedTexts] = useState<Record<string, { subject: string; body: string }>>({})
  const [sending, setSending] = useState<string | null>(null)
  const [sentId, setSentId] = useState<string | null>(null)
  const [showTemplateInsert, setShowTemplateInsert] = useState<string | null>(null)

  const { data: suggestions = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['email-suggestions', email.id, activeTone, isMock],
    queryFn: () => fetchSuggestions(email.id, activeTone, isMock),
    staleTime: 5 * 60 * 1000,
  })

  // Reset edits when suggestions change
  useEffect(() => {
    setEditedTexts({})
    setEditingId(null)
  }, [activeTone])

  const getText = (s: EmailSuggestion) => editedTexts[s.id] || { subject: s.subject, body: s.body }

  const handleToneApply = () => {
    setActiveTone(tone)
  }

  const handleAcceptAndSend = async (suggestion: EmailSuggestion) => {
    setSending(suggestion.id)
    try {
      const text = getText(suggestion)
      const res = await fetch('/api/emails/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email.id,
          action: 'send',
          subject: text.subject,
          body: text.body,
          suggestionStyle: suggestion.style,
          tone: activeTone,
          isMock,
        }),
      })
      if (res.ok) {
        setSentId(suggestion.id)
        setTimeout(() => { onSent() }, 1200)
      }
    } finally {
      setSending(null)
    }
  }

  const handleSaveDraft = async (suggestion: EmailSuggestion) => {
    setSending(`draft-${suggestion.id}`)
    try {
      const text = getText(suggestion)
      await fetch('/api/emails/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email.id,
          action: 'approve',
          subject: text.subject,
          body: text.body,
          suggestionStyle: suggestion.style,
          tone: activeTone,
          isMock,
        }),
      })
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4">
      <div className="bg-white border border-vemo-dark-200 rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-vemo-dark-200 bg-vemo-dark-50 rounded-t-2xl">
          <div>
            <h2 className="text-base font-semibold text-vemo-dark-900">✨ KI Reply-Suggestions</h2>
            <p className="text-xs text-vemo-dark-500 mt-0.5 truncate max-w-md">{email.subject}</p>
          </div>
          <button onClick={onClose} className="text-vemo-dark-400 hover:text-vemo-dark-900 p-2 rounded-sm hover:bg-vemo-dark-100 transition-colors">✕</button>
        </div>

        <div className="flex flex-col lg:flex-row gap-0 flex-1 overflow-hidden">
          {/* Left: Original email */}
          <div className="lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-vemo-dark-200 p-4 overflow-y-auto flex-shrink-0">
            <div className="text-xs font-semibold text-vemo-dark-500 uppercase tracking-wide mb-3">Original E-Mail</div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-vemo-dark-500 text-xs">Von:</span>
                <div className="font-medium text-vemo-dark-900 mt-0.5">{email.fromName || email.from}</div>
                {email.fromName && <div className="text-xs text-vemo-dark-500">{email.from}</div>}
              </div>
              <div>
                <span className="text-vemo-dark-500 text-xs">Betreff:</span>
                <div className="font-medium text-vemo-dark-900 mt-0.5">{email.subject}</div>
              </div>
              <div>
                <span className="text-vemo-dark-500 text-xs">Nachricht:</span>
                <div className="text-vemo-dark-700 mt-1 whitespace-pre-wrap leading-relaxed text-xs">{email.body}</div>
              </div>
            </div>

            {/* Tone selector */}
            <div className="mt-5 pt-4 border-t border-vemo-dark-200">
              <div className="text-xs font-semibold text-vemo-dark-500 uppercase tracking-wide mb-2">Tonalität</div>
              <div className="space-y-1.5">
                {TONES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTone(t.key)}
                    className={`w-full text-left px-3 py-2 rounded-sm text-xs transition-all ${
                      tone === t.key
                        ? 'bg-vemo-green-500 text-white'
                        : 'bg-vemo-dark-100 text-vemo-dark-700 hover:bg-vemo-dark-200'
                    }`}
                  >
                    <span className="font-medium">{t.label}</span>
                    <span className={`ml-1.5 ${tone === t.key ? 'text-vemo-green-100' : 'text-vemo-dark-500'}`}>— {t.desc}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={handleToneApply}
                disabled={tone === activeTone || isFetching}
                className="mt-3 w-full btn-primary text-xs py-2 disabled:opacity-40"
              >
                {isFetching ? '⏳ Generiere...' : tone === activeTone ? '✓ Aktiv' : `✨ Neu mit "${TONES.find(t=>t.key===tone)?.label}" generieren`}
              </button>
              <div className="mt-2 text-center">
                <a href="/emails/templates" className="text-xs text-vemo-green-600 hover:text-vemo-green-700 font-medium">
                  📋 Template-Library öffnen →
                </a>
              </div>
            </div>
          </div>

          {/* Right: Suggestions */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading || isFetching ? (
              <div className="flex flex-col items-center justify-center h-48 text-vemo-dark-500">
                <div className="text-4xl mb-3">✨</div>
                <p className="text-sm font-medium">KI generiert 3 Antwort-Vorschläge...</p>
                <p className="text-xs mt-1 text-vemo-dark-400">Tonalität: {TONES.find(t => t.key === activeTone)?.label}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-vemo-dark-500 uppercase tracking-wide">
                  3 Antwort-Vorschläge — Tonalität: <span className="text-vemo-green-600">{TONES.find(t => t.key === activeTone)?.label}</span>
                </div>
                {suggestions.map((s) => {
                  const text = getText(s)
                  const isEditing = editingId === s.id
                  const isSendingThis = sending === s.id
                  const isSavingDraft = sending === `draft-${s.id}`
                  const wasSent = sentId === s.id

                  return (
                    <div key={s.id} className={`border rounded-xl p-4 transition-all ${wasSent ? 'border-vemo-green-400 bg-vemo-green-50' : 'border-vemo-dark-200 hover:border-vemo-dark-300'}`}>
                      {/* Suggestion header */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{s.styleEmoji}</span>
                        <div>
                          <div className="text-sm font-semibold text-vemo-dark-900">{s.styleLabel}</div>
                        </div>
                        {wasSent && <span className="ml-auto text-xs text-vemo-green-600 font-medium">✅ Gesendet!</span>}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-vemo-dark-600 mb-1 block">Betreff</label>
                            <input
                              value={text.subject}
                              onChange={e => setEditedTexts(prev => ({ ...prev, [s.id]: { ...text, subject: e.target.value } }))}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-vemo-dark-600 mb-1 block">Nachricht</label>
                            <textarea
                              value={text.body}
                              onChange={e => setEditedTexts(prev => ({ ...prev, [s.id]: { ...text, body: e.target.value } }))}
                              rows={8}
                              className="input w-full text-sm resize-none"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs px-3 py-1.5 text-vemo-dark-600 hover:text-vemo-dark-900 border border-vemo-dark-200 rounded-sm hover:bg-vemo-dark-100"
                            >
                              Fertig
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs">
                            <span className="text-vemo-dark-500">Betreff: </span>
                            <span className="text-vemo-dark-800 font-medium">{text.subject}</span>
                          </div>
                          <div className="text-xs text-vemo-dark-700 whitespace-pre-wrap leading-relaxed bg-vemo-dark-50 rounded-sm p-2.5 max-h-36 overflow-y-auto">
                            {text.body}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-vemo-dark-100">
                        <button
                          onClick={() => handleAcceptAndSend(s)}
                          disabled={!!sending || wasSent}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-vemo-green-500 text-white text-xs font-semibold rounded-sm hover:bg-vemo-green-600 transition-colors disabled:opacity-50"
                        >
                          {isSendingThis ? '⏳' : '📤'} Senden
                        </button>
                        <button
                          onClick={() => setEditingId(isEditing ? null : s.id)}
                          disabled={!!sending || wasSent}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-vemo-dark-100 text-vemo-dark-700 text-xs font-medium rounded-sm hover:bg-vemo-dark-200 transition-colors disabled:opacity-50"
                        >
                          ✏️ {isEditing ? 'Fertig' : 'Bearbeiten'}
                        </button>
                        <button
                          onClick={() => handleSaveDraft(s)}
                          disabled={!!sending || wasSent}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-vemo-dark-100 text-vemo-dark-700 text-xs font-medium rounded-sm hover:bg-vemo-dark-200 transition-colors disabled:opacity-50"
                        >
                          {isSavingDraft ? '⏳' : '💾'} Entwurf
                        </button>
                        <button
                          disabled={!!sending || wasSent}
                          onClick={() => {
                            // Just skip this suggestion (no action needed)
                          }}
                          className="ml-auto text-xs text-vemo-dark-400 hover:text-vemo-dark-600 transition-colors disabled:opacity-30"
                          title="Ablehnen"
                        >
                          ❌ Ablehnen
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
