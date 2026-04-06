'use client'

import { useState, useEffect, useMemo } from 'react'

type Lead = {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string
  status: string
  notes: string | null
  value: number | null
  externalId: string | null
  syncedAt: string | null
  createdAt: string
}

type DateRange = 'today' | '7days' | '30days' | 'all'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:       { label: 'Neu',          color: 'bg-blue-100 text-blue-700 border-blue-200' },
  qualified: { label: 'Qualifiziert', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  contacted: { label: 'Kontaktiert',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  converted: { label: 'Konvertiert',  color: 'bg-vemo-green-100 text-vemo-green-700 border-vemo-green-200' },
  lost:      { label: 'Verloren',     color: 'bg-red-100 text-red-700 border-red-200' },
}

const SOURCE_ICONS: Record<string, string> = {
  instagram:  '📸',
  facebook:   '📘',
  google_ads: '🔍',
  referral:   '👥',
  manual:     '✏️',
  unknown:    '❓',
}

const SOURCE_LABELS: Record<string, string> = {
  instagram:  'Instagram',
  facebook:   'Facebook',
  google_ads: 'Google Ads',
  referral:   'Empfehlung',
  manual:     'Manuell',
  unknown:    'Unbekannt',
}

function filterByDateRange(leads: Lead[], range: DateRange): Lead[] {
  if (range === 'all') return leads
  const now = new Date()
  const cutoff = new Date()
  if (range === 'today') {
    cutoff.setHours(0, 0, 0, 0)
  } else if (range === '7days') {
    cutoff.setDate(now.getDate() - 7)
  } else if (range === '30days') {
    cutoff.setDate(now.getDate() - 30)
  }
  return leads.filter((l) => new Date(l.createdAt) >= cutoff)
}

function exportCSV(leads: Lead[]) {
  const headers = ['Name', 'Email', 'Telefon', 'Quelle', 'Status', 'Wert (CHF)', 'Notizen', 'Erstellt am']
  const rows = leads.map((l) => [
    l.name,
    l.email ?? '',
    l.phone ?? '',
    SOURCE_LABELS[l.source] ?? l.source,
    STATUS_CONFIG[l.status]?.label ?? l.status,
    l.value?.toString() ?? '',
    l.notes ?? '',
    new Date(l.createdAt).toLocaleDateString('de-CH'),
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Lead Dashboard Section ───────────────────────────────────────────────────

function LeadDashboard({ allLeads }: { allLeads: Lead[] }) {
  const [dateRange, setDateRange] = useState<DateRange>('all')

  const leads = useMemo(() => filterByDateRange(allLeads, dateRange), [allLeads, dateRange])

  // KPI calculations
  const total = leads.length
  const convertedCount = leads.filter((l) => l.status === 'converted').length
  const lostCount = leads.filter((l) => l.status === 'lost').length
  const newCount = leads.filter((l) => l.status === 'new').length
  const hotCount = convertedCount
  const atRiskCount = lostCount
  const newTodayCount = leads.filter((l) => {
    const d = new Date(l.createdAt)
    const today = new Date()
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  }).length

  const conversionRate = total > 0 ? Math.round((convertedCount / total) * 100) : 0

  // Lead Score Distribution: new+qualified = "potential", contacted = "in progress", converted = "won", lost = "lost"
  const qualifiedCount = leads.filter((l) => l.status === 'qualified').length
  const contactedCount = leads.filter((l) => l.status === 'contacted').length
  const scoreGroups = [
    { label: 'Neu / Qualif.', count: newCount + qualifiedCount, color: 'bg-yellow-400', textColor: 'text-yellow-700' },
    { label: 'Kontaktiert',   count: contactedCount,              color: 'bg-blue-400',   textColor: 'text-blue-700' },
    { label: 'Konvertiert',   count: convertedCount,              color: 'bg-vemo-green-500', textColor: 'text-vemo-green-700' },
    { label: 'Verloren',      count: lostCount,                   color: 'bg-red-400',    textColor: 'text-red-700' },
  ]

  // Channel Distribution
  const sourceMap = leads.reduce<Record<string, number>>((acc, l) => {
    const src = l.source || 'unknown'
    acc[src] = (acc[src] ?? 0) + 1
    return acc
  }, {})
  const topSources = Object.entries(sourceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxSourceCount = topSources[0]?.[1] ?? 1

  // Quality Gauge: green = converted%, yellow = qualified+contacted%, red = lost%
  const greenPct  = total > 0 ? Math.round((convertedCount / total) * 100) : 0
  const yellowPct = total > 0 ? Math.round(((qualifiedCount + contactedCount) / total) * 100) : 0
  const redPct    = total > 0 ? Math.round((lostCount / total) * 100) : 0

  const dateRangeButtons: { key: DateRange; label: string }[] = [
    { key: 'today',  label: 'Heute' },
    { key: '7days',  label: '7 Tage' },
    { key: '30days', label: '30 Tage' },
    { key: 'all',    label: 'Alle' },
  ]

  return (
    <div className="space-y-4">
      {/* Date Range + Export Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {dateRangeButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                dateRange === key
                  ? 'bg-vemo-dark-900 text-white border-vemo-dark-900'
                  : 'bg-white text-vemo-dark-600 border-vemo-dark-200 hover:border-vemo-dark-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => exportCSV(leads)}
          className="btn-outline text-xs px-4 py-1.5 min-h-0 gap-1.5"
        >
          <span>⬇</span> CSV Export
        </button>
      </div>

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Total Leads */}
        <div className="card p-4 text-center flex flex-col items-center gap-1">
          <div className="text-2xl">👥</div>
          <div className="text-2xl font-bold text-vemo-dark-900">{total}</div>
          <div className="text-xs text-vemo-dark-500 font-medium">Total Leads</div>
        </div>

        {/* 2. Lead Score Distribution */}
        <div className="card p-4 flex flex-col gap-2 sm:col-span-1 lg:col-span-1">
          <div className="text-xs font-semibold text-vemo-dark-700 uppercase tracking-wide text-center">Score-Verteilung</div>
          <div className="flex gap-1 h-8 rounded-sm overflow-hidden w-full">
            {scoreGroups.map((g) =>
              g.count > 0 ? (
                <div
                  key={g.label}
                  title={`${g.label}: ${g.count}`}
                  className={`${g.color} flex items-center justify-center text-white text-xs font-bold transition-all`}
                  style={{ width: `${Math.round((g.count / Math.max(total, 1)) * 100)}%` }}
                >
                  {g.count}
                </div>
              ) : null
            )}
            {total === 0 && (
              <div className="bg-vemo-dark-100 w-full rounded-sm flex items-center justify-center text-xs text-vemo-dark-400">—</div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 justify-center">
            {scoreGroups.map((g) => (
              <span key={g.label} className={`text-xs ${g.textColor} font-medium`}>
                {g.label.split(' ')[0]} {g.count}
              </span>
            ))}
          </div>
        </div>

        {/* 3. Conversion Rate */}
        <div className="card p-4 text-center flex flex-col items-center gap-1">
          <div className="text-2xl">📈</div>
          <div className="text-2xl font-bold text-vemo-green-600">{conversionRate}%</div>
          <div className="text-xs text-vemo-dark-500 font-medium">Conversion Rate</div>
          <div className="text-xs text-vemo-dark-400">{convertedCount} von {total}</div>
        </div>

        {/* 4. Top Channels */}
        <div className="card p-4 flex flex-col gap-2">
          <div className="text-xs font-semibold text-vemo-dark-700 uppercase tracking-wide">Top Kanäle</div>
          <div className="space-y-1.5">
            {topSources.length === 0 ? (
              <div className="text-xs text-vemo-dark-400">Keine Daten</div>
            ) : (
              topSources.map(([src, count]) => (
                <div key={src} className="flex items-center gap-1.5">
                  <span className="text-sm w-5 text-center flex-shrink-0">{SOURCE_ICONS[src] ?? '❓'}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="h-2 bg-vemo-green-400 rounded-full transition-all"
                      style={{ width: `${Math.round((count / maxSourceCount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-vemo-dark-600 font-semibold w-4 text-right flex-shrink-0">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 5. Pending Actions / Quick Stats */}
        <div className="card p-4 flex flex-col gap-2">
          <div className="text-xs font-semibold text-vemo-dark-700 uppercase tracking-wide">Quick Stats</div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-vemo-dark-500 flex items-center gap-1"><span>🆕</span> Neu Heute</span>
              <span className="text-sm font-bold text-blue-600">{newTodayCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-vemo-dark-500 flex items-center gap-1"><span>🔥</span> Hot Leads</span>
              <span className="text-sm font-bold text-vemo-green-600">{hotCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-vemo-dark-500 flex items-center gap-1"><span>⚠️</span> At Risk</span>
              <span className="text-sm font-bold text-red-500">{atRiskCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Gauge + Channel Bar — second row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Quality Gauge */}
        <div className="card p-4">
          <div className="text-xs font-semibold text-vemo-dark-700 uppercase tracking-wide mb-3">Lead-Qualität (Ampel)</div>
          <div className="flex gap-2 h-6 rounded-sm overflow-hidden mb-2">
            {greenPct > 0 && (
              <div
                className="bg-vemo-green-500 flex items-center justify-center text-white text-xs font-bold transition-all"
                style={{ width: `${greenPct}%` }}
                title={`Konvertiert: ${greenPct}%`}
              >
                {greenPct >= 10 ? `${greenPct}%` : ''}
              </div>
            )}
            {yellowPct > 0 && (
              <div
                className="bg-yellow-400 flex items-center justify-center text-white text-xs font-bold transition-all"
                style={{ width: `${yellowPct}%` }}
                title={`Qualifiziert/Kontaktiert: ${yellowPct}%`}
              >
                {yellowPct >= 10 ? `${yellowPct}%` : ''}
              </div>
            )}
            {redPct > 0 && (
              <div
                className="bg-red-400 flex items-center justify-center text-white text-xs font-bold transition-all"
                style={{ width: `${redPct}%` }}
                title={`Verloren: ${redPct}%`}
              >
                {redPct >= 10 ? `${redPct}%` : ''}
              </div>
            )}
            {total === 0 && (
              <div className="bg-vemo-dark-100 w-full flex items-center justify-center text-xs text-vemo-dark-400">Keine Leads</div>
            )}
          </div>
          <div className="flex gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-vemo-dark-600">
              <span className="w-3 h-3 rounded-sm bg-vemo-green-500 inline-block"></span>
              Konvertiert {greenPct}%
            </span>
            <span className="flex items-center gap-1 text-xs text-vemo-dark-600">
              <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block"></span>
              Pipeline {yellowPct}%
            </span>
            <span className="flex items-center gap-1 text-xs text-vemo-dark-600">
              <span className="w-3 h-3 rounded-sm bg-red-400 inline-block"></span>
              Verloren {redPct}%
            </span>
          </div>
        </div>

        {/* Channel Distribution Detail */}
        <div className="card p-4">
          <div className="text-xs font-semibold text-vemo-dark-700 uppercase tracking-wide mb-3">Kanal-Verteilung</div>
          <div className="space-y-2">
            {topSources.length === 0 ? (
              <div className="text-xs text-vemo-dark-400">Keine Daten</div>
            ) : (
              topSources.map(([src, count]) => (
                <div key={src} className="flex items-center gap-2">
                  <span className="w-16 text-xs text-vemo-dark-600 truncate flex-shrink-0">
                    {SOURCE_ICONS[src] ?? '❓'} {SOURCE_LABELS[src] ?? src}
                  </span>
                  <div className="flex-1 bg-vemo-dark-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 bg-vemo-green-500 rounded-full transition-all"
                      style={{ width: `${Math.round((count / maxSourceCount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-vemo-dark-700 w-6 text-right flex-shrink-0">{count}</span>
                  <span className="text-xs text-vemo-dark-400 w-8 text-right flex-shrink-0">
                    {total > 0 ? `${Math.round((count / total) * 100)}%` : '0%'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'manual', status: 'new', notes: '', value: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadLeads()
  }, [filter])

  async function loadLeads() {
    setLoading(true)
    try {
      const url = filter !== 'all' ? `/api/leads?status=${filter}` : '/api/leads'
      const res = await fetch(url)
      const data = await res.json()
      setLeads(data.leads ?? [])
      setIsMock(data.isMock ?? false)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, value: form.value ? parseFloat(form.value) : null }),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ name: '', email: '', phone: '', source: 'manual', status: 'new', notes: '', value: '' })
        await loadLeads()
      }
    } finally {
      setSaving(false)
    }
  }

  // All leads (unfiltered by status) for dashboard
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  useEffect(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((d) => setAllLeads(d.leads ?? []))
      .catch(() => {})
  }, [])

  // Sync allLeads when we reload with 'all' filter
  useEffect(() => {
    if (filter === 'all') setAllLeads(leads)
  }, [leads, filter])

  const totalValue = leads.reduce((sum, l) => sum + (l.value ?? 0), 0)
  const newCount = leads.filter((l) => l.status === 'new').length
  const convertedCount = leads.filter((l) => l.status === 'converted').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎯</span>
            <h1 className="text-2xl font-bold text-vemo-dark-900">Lead-Dashboard</h1>
            {isMock && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-200">
                🔌 API-Stub (Mock-Daten)
              </span>
            )}
          </div>
          <p className="text-vemo-dark-500 text-sm">Lead-Tracking, Qualifizierung und Pipeline-Verwaltung</p>
          {isMock && (
            <p className="text-xs text-blue-500 mt-1">
              Sobald <code className="bg-blue-50 px-1 rounded">CRM_API_KEY</code> gesetzt ist, werden echte CRM-Daten geladen.
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          + Lead hinzufügen
        </button>
      </div>

      {/* ─── Lead Dashboard Analytics ─────────────────────────────────────────── */}
      {!loading && <LeadDashboard allLeads={allLeads} />}

      {/* Legacy Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Leads gesamt', value: leads.length, icon: '👥' },
          { label: 'Neu', value: newCount, icon: '🆕' },
          { label: 'Konvertiert', value: convertedCount, icon: '✅' },
          { label: 'Pipeline-Wert', value: `CHF ${totalValue.toLocaleString('de-CH')}`, icon: '💰' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xl font-bold text-vemo-dark-900">{value}</div>
            <div className="text-xs text-vemo-dark-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Create Lead Form */}
      {showForm && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider mb-4">Neuer Lead</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Name *</label>
              <input
                className="input w-full text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Max Mustermann"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">E-Mail</label>
              <input
                className="input w-full text-sm"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="max@beispiel.ch"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Telefon</label>
              <input
                className="input w-full text-sm"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+41 79 123 45 67"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Wert (CHF)</label>
              <input
                className="input w-full text-sm"
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="490"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Quelle</label>
              <select className="input w-full text-sm" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="google_ads">Google Ads</option>
                <option value="referral">Empfehlung</option>
                <option value="manual">Manuell</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Status</label>
              <select className="input w-full text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Notizen</label>
              <textarea
                className="input w-full text-sm h-20 resize-none"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Informationen zum Lead..."
              />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
                {saving ? 'Speichern...' : 'Lead speichern'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Alle'], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              filter === key
                ? 'bg-vemo-dark-900 text-white border-vemo-dark-900'
                : 'bg-white text-vemo-dark-600 border-vemo-dark-200 hover:border-vemo-dark-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-vemo-dark-500">Lade Leads...</div>
      ) : leads.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <div className="text-sm text-vemo-dark-500">Noch keine Leads vorhanden.</div>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm mt-3">
            + Ersten Lead hinzufügen
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-vemo-dark-50 border-b border-vemo-dark-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-vemo-dark-600 uppercase tracking-wider px-4 py-3">Lead</th>
                  <th className="text-left text-xs font-semibold text-vemo-dark-600 uppercase tracking-wider px-4 py-3">Quelle</th>
                  <th className="text-left text-xs font-semibold text-vemo-dark-600 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-vemo-dark-600 uppercase tracking-wider px-4 py-3">Wert</th>
                  <th className="text-left text-xs font-semibold text-vemo-dark-600 uppercase tracking-wider px-4 py-3">Notizen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vemo-dark-100">
                {leads.map((lead) => {
                  const statusCfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-700 border-gray-200' }
                  return (
                    <tr key={lead.id} className="hover:bg-vemo-dark-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-vemo-dark-900">{lead.name}</div>
                        <div className="text-xs text-vemo-dark-400">{lead.email ?? lead.phone ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-base">{SOURCE_ICONS[lead.source] ?? '❓'}</span>
                        <span className="ml-1 text-xs text-vemo-dark-500 capitalize">{lead.source.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-vemo-dark-900">
                        {lead.value ? `CHF ${lead.value.toLocaleString('de-CH')}` : '—'}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-xs text-vemo-dark-500 truncate">{lead.notes ?? '—'}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API Integration Info */}
      <div className="card p-5 bg-blue-50/50 border border-blue-200">
        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2">🔌 API-Integration vorbereitet</h3>
        <div className="text-xs text-blue-700 space-y-1">
          <p>• <strong>HubSpot:</strong> <code className="bg-blue-100 px-1 rounded">HUBSPOT_API_KEY</code> setzen → automatischer CRM-Sync</p>
          <p>• <strong>Pipedrive:</strong> <code className="bg-blue-100 px-1 rounded">PIPEDRIVE_API_KEY</code> setzen → Deals und Kontakte synchronisieren</p>
          <p>• <strong>Connector einrichten:</strong> <a href="/connectors/hubspot" className="underline">Connectors → HubSpot</a></p>
        </div>
      </div>
    </div>
  )
}
