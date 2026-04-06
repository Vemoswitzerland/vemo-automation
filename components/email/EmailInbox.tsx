'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import EmailApprovalModal from './EmailApprovalModal'
import EmailBatchActions from './EmailBatchActions'

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
  category?: string
  sentiment?: string
}

// Derive category from subject/body heuristics (used in mock mode)
function deriveCategory(email: Email): string {
  const text = (email.subject + ' ' + email.body).toLowerCase()
  if (text.match(/beschwerde|unzufrieden|problem|fehler|defekt|kaputt/)) return 'Beschwerde'
  if (text.match(/preis|angebot|kosten|budget|rabatt|vergünstigung/)) return 'Preisanfrage'
  if (text.match(/termin|meeting|call|besprechung|gespräch/)) return 'Termin'
  if (text.match(/bestellung|lieferung|auftrag|versand|tracking/)) return 'Bestellung'
  if (text.match(/support|hilfe|frage|wie kann|bitte/)) return 'Support'
  if (text.match(/newsletter|abmeld|unsubscribe/)) return 'Newsletter'
  return 'Allgemein'
}

function deriveSentiment(email: Email): 'positiv' | 'neutral' | 'negativ' {
  const text = (email.subject + ' ' + email.body).toLowerCase()
  const neg = text.match(/schlecht|ärger|beschwerde|unzufrieden|enttäuscht|leider|problem|fehler|kaputt|dringend|sofort/)
  const pos = text.match(/danke|toll|super|prima|freue|wunderbar|perfekt|klasse|top/)
  if (neg && neg.length > (pos?.length || 0)) return 'negativ'
  if (pos) return 'positiv'
  return 'neutral'
}

const CATEGORY_COLORS: Record<string, string> = {
  Beschwerde: 'bg-error-50 text-error-700 border-error-200',
  Preisanfrage: 'bg-blue-50 text-blue-700 border-blue-200',
  Termin: 'bg-purple-50 text-purple-700 border-purple-200',
  Bestellung: 'bg-amber-50 text-amber-700 border-amber-200',
  Support: 'bg-vemo-dark-100 text-vemo-dark-700 border-vemo-dark-200',
  Newsletter: 'bg-gray-50 text-gray-600 border-gray-200',
  Allgemein: 'bg-vemo-dark-50 text-vemo-dark-600 border-vemo-dark-100',
}

const SENTIMENT_ICON: Record<string, string> = {
  positiv: '😊',
  neutral: '😐',
  negativ: '😠',
}

async function fetchEmails(isMock: boolean): Promise<Email[]> {
  const url = isMock ? '/api/emails?mock=true&limit=50' : '/api/emails?limit=50'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Fehler beim Laden der E-Mails')
  const data = await res.json()
  return data.emails
}

async function batchApprove(ids: string[], action: 'approve' | 'reject'): Promise<void> {
  await Promise.all(
    ids.map(id =>
      fetch('/api/emails/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: id, action }),
      })
    )
  )
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
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'category'>('priority')

  const enriched = emails.map(e => ({
    ...e,
    category: e.category || deriveCategory(e),
    sentiment: e.sentiment || deriveSentiment(e),
  }))

  const allCategories = Array.from(new Set(enriched.map(e => e.category)))

  const filtered = enriched
    .filter(e => {
      if (filter === 'pending') return e.drafts.some(d => d.status === 'pending')
      if (filter === 'done') return e.drafts.every(d => d.status !== 'pending')
      return true
    })
    .filter(e => categoryFilter === 'all' || e.category === categoryFilter)
    .sort((a, b) => {
      if (sortBy === 'priority') return b.priority - a.priority
      if (sortBy === 'date') return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '')
      return 0
    })

  const pendingCount = emails.filter(e => e.drafts.some(d => d.status === 'pending')).length

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map(e => e.id)))
  }, [filtered])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBatchAction = useCallback(async (action: 'approve' | 'reject' | 'archive') => {
    const ids = Array.from(selectedIds)
    if (action === 'approve' || action === 'reject') {
      await batchApprove(ids, action)
    }
    setSelectedIds(new Set())
    queryClient.invalidateQueries({ queryKey: ['emails'] })
  }, [selectedIds, queryClient])

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
      {/* Filter tabs + sort */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
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

        <div className="flex items-center gap-2 text-xs">
          <span className="text-vemo-dark-500">Sortierung:</span>
          {[
            { key: 'priority', label: 'Priorität' },
            { key: 'date', label: 'Datum' },
            { key: 'category', label: 'Kategorie' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key as any)}
              className={`px-2.5 py-1 rounded-sm font-medium transition-all ${
                sortBy === s.key
                  ? 'bg-vemo-dark-700 text-white'
                  : 'bg-vemo-dark-100 text-vemo-dark-600 hover:bg-vemo-dark-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter pills */}
      {allCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              categoryFilter === 'all'
                ? 'bg-vemo-dark-800 text-white border-transparent'
                : 'bg-white text-vemo-dark-600 border-vemo-dark-200 hover:border-vemo-dark-300'
            }`}
          >
            Alle Kategorien
          </button>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                categoryFilter === cat
                  ? 'bg-vemo-dark-800 text-white border-transparent'
                  : `${CATEGORY_COLORS[cat] || 'bg-white text-vemo-dark-600 border-vemo-dark-200'} hover:opacity-80`
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Batch actions bar */}
      <EmailBatchActions
        selectedIds={Array.from(selectedIds)}
        totalCount={filtered.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBatchAction={handleBatchAction}
      />

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
          const isSelected = selectedIds.has(email.id)
          const catColor = CATEGORY_COLORS[email.category] || CATEGORY_COLORS['Allgemein']

          return (
            <div
              key={email.id}
              className={`card cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected ? 'ring-2 ring-vemo-green-400 bg-vemo-green-50' :
                pendingDraft ? 'border-vemo-green-300 bg-vemo-green-50' : ''
              }`}
              onClick={() => {
                if (selectedIds.size > 0) {
                  toggleSelect(email.id)
                } else {
                  setSelectedEmail(email)
                  setSelectedDraft(pendingDraft || email.drafts[0] || null)
                }
              }}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div
                  className="mt-1 flex-shrink-0"
                  onClick={e => { e.stopPropagation(); toggleSelect(email.id) }}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-vemo-green-500 border-vemo-green-500'
                      : 'border-vemo-dark-300 hover:border-vemo-green-400'
                  }`}>
                    {isSelected && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <PriorityBadge priority={email.priority} />

                    {/* Category badge */}
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${catColor}`}>
                      {email.category}
                    </span>

                    {/* Sentiment icon */}
                    <span title={`Sentiment: ${email.sentiment}`} className="text-sm leading-none">
                      {SENTIMENT_ICON[email.sentiment || 'neutral']}
                    </span>

                    {pendingDraft && (
                      <span className="text-xs bg-vemo-green-100 text-vemo-green-700 px-2 py-0.5 rounded-full font-medium">
                        ✨ KI-Entwurf bereit
                      </span>
                    )}
                    {hasSent && (
                      <span className="text-xs bg-vemo-green-50 text-vemo-green-700 px-2 py-0.5 rounded-full font-medium">
                        ✅ Gesendet
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-vemo-dark-900 truncate">{email.subject}</div>
                  <div className="text-sm text-vemo-dark-600 mt-1">
                    {email.fromName || email.from}
                    <span className="text-vemo-dark-500 ml-2 text-xs">{email.from}</span>
                  </div>
                  <div className="text-sm text-vemo-dark-600 mt-1.5 truncate line-clamp-1">
                    {email.body.substring(0, 120)}...
                  </div>
                </div>

                <div className="text-xs text-vemo-dark-500 whitespace-nowrap pt-1 flex-shrink-0">
                  {new Date(email.receivedAt).toLocaleDateString('de-CH', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit',
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
            queryClient.invalidateQueries({ queryKey: ['emails'] })
          }}
        />
      )}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: number }) {
  if (priority >= 8) return <span className="text-xs bg-error-50 text-error-600 px-2 py-0.5 rounded font-medium border border-error-200">🔴 Kritisch</span>
  if (priority >= 6) return <span className="text-xs bg-warning-50 text-warning-600 px-2 py-0.5 rounded font-medium border border-warning-200">🟠 Hoch</span>
  if (priority >= 4) return <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded font-medium border border-yellow-200">🟡 Mittel</span>
  return <span className="text-xs bg-vemo-dark-100 text-vemo-dark-600 px-2 py-0.5 rounded font-medium">⚪ Niedrig</span>
}
