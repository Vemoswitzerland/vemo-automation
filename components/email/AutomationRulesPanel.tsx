'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface AutomationRule {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  priority: number
  triggerType: string
  triggerValue: string
  matchMode: string
  actionType: string
  replyTemplate?: string | null
  replySubject?: string | null
  labelValue?: string | null
  triggerCount: number
  lastTriggeredAt?: string | null
}

const TRIGGER_TYPES = [
  { value: 'keyword', label: 'Schlüsselwort (Betreff + Body)' },
  { value: 'sender', label: 'Absender-E-Mail' },
  { value: 'subject', label: 'Betreff' },
]

const MATCH_MODES = [
  { value: 'contains', label: 'Enthält' },
  { value: 'equals', label: 'Ist gleich' },
  { value: 'startsWith', label: 'Beginnt mit' },
  { value: 'regex', label: 'Regex' },
]

const ACTION_TYPES = [
  { value: 'auto_reply', label: 'Auto-Antwort senden' },
  { value: 'queue', label: 'In Queue stellen' },
  { value: 'label', label: 'Label hinzufügen' },
]

const emptyForm = {
  name: '',
  description: '',
  isActive: true,
  priority: 0,
  triggerType: 'keyword',
  triggerValue: '',
  matchMode: 'contains',
  actionType: 'auto_reply',
  replyTemplate: '',
  replySubject: '',
  labelValue: '',
}

async function fetchRules(isMock: boolean): Promise<AutomationRule[]> {
  const res = await fetch(`/api/emails/automation-rules${isMock ? '?mock=true' : ''}`)
  if (!res.ok) throw new Error('Fehler beim Laden')
  return res.json()
}

interface Props { isMock?: boolean }

export default function AutomationRulesPanel({ isMock = false }: Props) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules', isMock],
    queryFn: () => fetchRules(isMock),
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await fetch('/api/emails/automation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Fehler beim Erstellen')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      setShowForm(false)
      setForm(emptyForm)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AutomationRule> }) => {
      const res = await fetch(`/api/emails/automation-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Fehler beim Aktualisieren')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      setEditingRule(null)
      setShowForm(false)
      setForm(emptyForm)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/emails/automation-rules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Löschen')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-rules'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/emails/automation-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error('Fehler')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-rules'] }),
  })

  function openCreate() {
    setEditingRule(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(rule: AutomationRule) {
    setEditingRule(rule)
    setForm({
      name: rule.name,
      description: rule.description ?? '',
      isActive: rule.isActive,
      priority: rule.priority,
      triggerType: rule.triggerType,
      triggerValue: rule.triggerValue,
      matchMode: rule.matchMode,
      actionType: rule.actionType,
      replyTemplate: rule.replyTemplate ?? '',
      replySubject: rule.replySubject ?? '',
      labelValue: rule.labelValue ?? '',
    })
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const actionColor: Record<string, string> = {
    auto_reply: 'bg-green-100 text-green-700',
    queue: 'bg-yellow-100 text-yellow-700',
    label: 'bg-blue-100 text-blue-700',
  }

  const actionLabel: Record<string, string> = {
    auto_reply: 'Auto-Antwort',
    queue: 'Queue',
    label: 'Label',
  }

  if (isLoading) {
    return <div className="card py-12 text-center text-vemo-dark-500">Regeln laden...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-vemo-dark-900">Automatisierungs-Regeln</h2>
          <p className="text-sm text-vemo-dark-500">
            {rules.filter(r => r.isActive).length} aktiv · {rules.length} total
          </p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <span>+</span> Neue Regel
        </button>
      </div>

      {/* Rule Form */}
      {showForm && (
        <div className="card border-2 border-vemo-green-500">
          <h3 className="font-semibold text-vemo-dark-900 mb-4">
            {editingRule ? 'Regel bearbeiten' : 'Neue Regel erstellen'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-vemo-dark-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input w-full"
                  placeholder="z.B. Newsletter-Abmeldung"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vemo-dark-700 mb-1">Priorität</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                  className="input w-full"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-vemo-dark-700 mb-1">Beschreibung</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input w-full"
                placeholder="Optional"
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-vemo-dark-700 mb-3">Trigger-Bedingung</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-vemo-dark-600 mb-1">Typ *</label>
                  <select
                    value={form.triggerType}
                    onChange={e => setForm(f => ({ ...f, triggerType: e.target.value }))}
                    className="input w-full"
                  >
                    {TRIGGER_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-vemo-dark-600 mb-1">Übereinstimmung</label>
                  <select
                    value={form.matchMode}
                    onChange={e => setForm(f => ({ ...f, matchMode: e.target.value }))}
                    className="input w-full"
                  >
                    {MATCH_MODES.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-vemo-dark-600 mb-1">Wert *</label>
                  <input
                    type="text"
                    required
                    value={form.triggerValue}
                    onChange={e => setForm(f => ({ ...f, triggerValue: e.target.value }))}
                    className="input w-full"
                    placeholder="z.B. abmelden"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-vemo-dark-700 mb-3">Aktion</p>
              <div className="mb-3">
                <label className="block text-xs text-vemo-dark-600 mb-1">Aktionstyp *</label>
                <select
                  value={form.actionType}
                  onChange={e => setForm(f => ({ ...f, actionType: e.target.value }))}
                  className="input w-full md:w-1/2"
                >
                  {ACTION_TYPES.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              {form.actionType === 'auto_reply' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-vemo-dark-600 mb-1">Betreff der Antwort</label>
                    <input
                      type="text"
                      value={form.replySubject}
                      onChange={e => setForm(f => ({ ...f, replySubject: e.target.value }))}
                      className="input w-full"
                      placeholder="Re: {{subject}}"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-vemo-dark-600 mb-1">
                      Antwort-Template{' '}
                      <span className="text-vemo-dark-400">(Variablen: {'{{from}}'}, {'{{subject}}'}, {'{{date}}'})</span>
                    </label>
                    <textarea
                      value={form.replyTemplate}
                      onChange={e => setForm(f => ({ ...f, replyTemplate: e.target.value }))}
                      className="input w-full"
                      rows={5}
                      placeholder="Hallo {{from}},&#10;&#10;vielen Dank für Ihre Nachricht...&#10;&#10;Mit freundlichen Grüssen&#10;Vemo Team"
                    />
                  </div>
                </div>
              )}

              {form.actionType === 'label' && (
                <div>
                  <label className="block text-xs text-vemo-dark-600 mb-1">Label-Wert *</label>
                  <input
                    type="text"
                    value={form.labelValue}
                    onChange={e => setForm(f => ({ ...f, labelValue: e.target.value }))}
                    className="input w-full md:w-1/2"
                    placeholder="z.B. Spam, Newsletter, Priorität"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary"
              >
                {editingRule ? 'Speichern' : 'Erstellen'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingRule(null) }}
                className="btn-secondary"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="card py-12 text-center">
          <div className="text-4xl mb-3">⚡</div>
          <p className="text-vemo-dark-600 font-medium">Noch keine Regeln definiert</p>
          <p className="text-vemo-dark-400 text-sm mt-1">
            Erstelle deine erste Automatisierungs-Regel
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div
              key={rule.id}
              className={`card flex items-start gap-4 ${!rule.isActive ? 'opacity-60' : ''}`}
            >
              {/* Toggle */}
              <button
                onClick={() => !isMock && toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                className={`mt-1 w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                  rule.isActive ? 'bg-vemo-green-500' : 'bg-gray-300'
                }`}
                title={rule.isActive ? 'Deaktivieren' : 'Aktivieren'}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-1 ${
                    rule.isActive ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-vemo-dark-900">{rule.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor[rule.actionType] ?? 'bg-gray-100 text-gray-600'}`}>
                    {actionLabel[rule.actionType] ?? rule.actionType}
                  </span>
                  <span className="text-xs text-vemo-dark-400">Priorität {rule.priority}</span>
                </div>
                {rule.description && (
                  <p className="text-sm text-vemo-dark-500 mt-0.5">{rule.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-vemo-dark-400 flex-wrap">
                  <span>
                    <span className="font-medium">Trigger:</span> {rule.triggerType} {rule.matchMode} &quot;{rule.triggerValue}&quot;
                  </span>
                  <span>·</span>
                  <span>{rule.triggerCount}× ausgelöst</span>
                  {rule.lastTriggeredAt && (
                    <>
                      <span>·</span>
                      <span>Zuletzt {new Date(rule.lastTriggeredAt).toLocaleDateString('de-CH')}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(rule)}
                  className="text-xs text-vemo-dark-500 hover:text-vemo-dark-800 px-2 py-1 rounded hover:bg-gray-100"
                >
                  ✏️ Bearbeiten
                </button>
                <button
                  onClick={() => !isMock && confirm(`Regel "${rule.name}" wirklich löschen?`) && deleteMutation.mutate(rule.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
