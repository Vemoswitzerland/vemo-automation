'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface EmailTemplate {
  id: string
  name: string
  category: string
  subject: string
  body: string
  tone: string
  usageCount: number
  createdAt: string
  updatedAt: string
}

async function fetchTemplates(): Promise<EmailTemplate[]> {
  const res = await fetch('/api/emails/templates')
  if (!res.ok) throw new Error('Fehler beim Laden der Templates')
  const data = await res.json()
  return data.templates
}

export default function EmailTemplateLibrary() {
  const queryClient = useQueryClient()
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: fetchTemplates,
  })

  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', category: 'Allgemein', subject: '', body: '', tone: 'formal' })
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<EmailTemplate | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filter, setFilter] = useState('Alle')

  const categories = ['Alle', ...Array.from(new Set(templates.map(t => t.category)))]
  const filtered = filter === 'Alle' ? templates : templates.filter(t => t.category === filter)

  const handleSave = async () => {
    if (!newForm.name || !newForm.subject || !newForm.body) return
    setSaving(true)
    try {
      const res = await fetch('/api/emails/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['email-templates'] })
        setShowNew(false)
        setNewForm({ name: '', category: 'Allgemein', subject: '', body: '', tone: 'formal' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await fetch(`/api/emails/templates?id=${id}`, { method: 'DELETE' })
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
    } finally {
      setDeleting(null)
    }
  }

  const TONE_COLORS: Record<string, string> = {
    formal: 'bg-blue-50 text-blue-700',
    freundlich: 'bg-vemo-green-50 text-vemo-green-700',
    juristisch: 'bg-yellow-50 text-yellow-700',
  }

  if (isLoading) {
    return (
      <div className="card text-center py-16">
        <div className="text-4xl mb-3">⏳</div>
        <p className="text-vemo-dark-600 text-sm">Templates laden...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
                filter === cat ? 'bg-vemo-green-500 text-white' : 'bg-vemo-dark-100 text-vemo-dark-700 hover:bg-vemo-dark-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary text-xs px-4 py-2">
          + Neues Template
        </button>
      </div>

      {/* New template form */}
      {showNew && (
        <div className="card border-vemo-green-200 bg-vemo-green-50">
          <div className="text-sm font-semibold text-vemo-dark-900 mb-4">Neues Template erstellen</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-vemo-dark-700 mb-1 block">Name *</label>
              <input
                value={newForm.name}
                onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))}
                placeholder="z.B. FAQ – Preisanfrage"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-vemo-dark-700 mb-1 block">Kategorie</label>
              <input
                value={newForm.category}
                onChange={e => setNewForm(p => ({ ...p, category: e.target.value }))}
                placeholder="z.B. Sales, Support, Administration"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-vemo-dark-700 mb-1 block">Tonalität</label>
              <select
                value={newForm.tone}
                onChange={e => setNewForm(p => ({ ...p, tone: e.target.value }))}
                className="input w-full text-sm"
              >
                <option value="formal">Formal</option>
                <option value="freundlich">Freundlich</option>
                <option value="juristisch">Juristisch</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-vemo-dark-700 mb-1 block">Betreff *</label>
              <input
                value={newForm.subject}
                onChange={e => setNewForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="Re: {{subject}}"
                className="input w-full text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-vemo-dark-700 mb-1 block">
                Nachricht * <span className="text-vemo-dark-400 font-normal">— Verwende {'{{'+'name'+'}}'} für Kundennamen, {'{{'+'subject'+'}}'} für Betreff</span>
              </label>
              <textarea
                value={newForm.body}
                onChange={e => setNewForm(p => ({ ...p, body: e.target.value }))}
                rows={6}
                placeholder="Guten Tag {{name}}\n\n..."
                className="input w-full text-sm resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving || !newForm.name || !newForm.subject || !newForm.body}
              className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
            >
              {saving ? '⏳ Speichern...' : '💾 Template speichern'}
            </button>
            <button onClick={() => setShowNew(false)} className="btn-secondary text-xs px-4 py-2">Abbrechen</button>
          </div>
        </div>
      )}

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-vemo-dark-900 font-medium">Keine Templates vorhanden</p>
          <p className="text-vemo-dark-600 text-sm mt-1">Erstelle dein erstes Template für häufige Anfragen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setPreview(t)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-vemo-dark-900 text-sm">{t.name}</div>
                  <div className="text-xs text-vemo-dark-500 mt-0.5">{t.category}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TONE_COLORS[t.tone] || 'bg-vemo-dark-100 text-vemo-dark-600'}`}>
                  {t.tone}
                </span>
              </div>
              <div className="text-xs text-vemo-dark-600 mb-3 truncate">{t.subject}</div>
              <div className="text-xs text-vemo-dark-500 line-clamp-2 leading-relaxed">{t.body}</div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-vemo-dark-100">
                <span className="text-xs text-vemo-dark-400">{t.usageCount}x verwendet</span>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(t.id) }}
                  disabled={deleting === t.id}
                  className="text-xs text-vemo-dark-400 hover:text-error-600 transition-colors"
                >
                  {deleting === t.id ? '⏳' : '🗑️'} Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-vemo-dark-200 rounded-2xl w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-vemo-dark-200 bg-vemo-dark-50 rounded-t-2xl">
              <div>
                <h3 className="font-semibold text-vemo-dark-900">{preview.name}</h3>
                <span className="text-xs text-vemo-dark-500">{preview.category} · {preview.tone}</span>
              </div>
              <button onClick={() => setPreview(null)} className="text-vemo-dark-400 hover:text-vemo-dark-900 p-2 rounded-sm hover:bg-vemo-dark-100">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <div className="text-xs font-medium text-vemo-dark-500 mb-1">Betreff:</div>
                <div className="text-sm text-vemo-dark-900 font-medium">{preview.subject}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-vemo-dark-500 mb-1">Nachricht:</div>
                <div className="text-sm text-vemo-dark-700 whitespace-pre-wrap leading-relaxed bg-vemo-dark-50 p-3 rounded-sm">{preview.body}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
