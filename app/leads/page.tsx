'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

type Lead = {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string
  status: string
  notes: string | null
  value: number | null
  score: number
  lastContact: string | null
  externalId: string | null
  syncedAt: string | null
  createdAt: string
}

type SortKey = 'name' | 'score' | 'status' | 'source' | 'value' | 'lastContact' | 'createdAt'
type SortDir = 'asc' | 'desc'
type DateRange = 'today' | '7days' | '30days' | 'all'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:       { label: 'Neu',          color: 'bg-blue-100 text-blue-700 border-blue-200' },
  qualified: { label: 'Qualifiziert', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  contacted: { label: 'Kontaktiert',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  converted: { label: 'Konvertiert',  color: 'bg-green-100 text-green-700 border-green-200' },
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
  instagram: 'Instagram', facebook: 'Facebook', google_ads: 'Google Ads',
  referral: 'Empfehlung', manual: 'Manuell', unknown: 'Unbekannt',
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-green-100 text-green-700 border-green-300'
  if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-300'
  return 'bg-red-100 text-red-700 border-red-300'
}

function scoreDot(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Heute'
  if (days === 1) return 'Gestern'
  if (days < 7) return `vor ${days} Tagen`
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ─── Analytics Block ──────────────────────────────────────────────────────────

function filterByDateRange(leads: Lead[], range: DateRange): Lead[] {
  if (range === 'all') return leads
  const now = new Date()
  const cutoff = new Date()
  if (range === 'today') cutoff.setHours(0, 0, 0, 0)
  else if (range === '7days') cutoff.setDate(now.getDate() - 7)
  else if (range === '30days') cutoff.setDate(now.getDate() - 30)
  return leads.filter((l) => new Date(l.createdAt) >= cutoff)
}

function exportLeadsCSV(leads: Lead[]) {
  const headers = ['Name', 'Email', 'Telefon', 'Quelle', 'Status', 'Score', 'Wert (CHF)', 'Notizen', 'Erstellt am']
  const rows = leads.map((l) => [
    l.name, l.email ?? '', l.phone ?? '',
    SOURCE_LABELS[l.source] ?? l.source,
    STATUS_CONFIG[l.status]?.label ?? l.status,
    String(l.score),
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

function LeadAnalyticsBlock({ leads }: { leads: Lead[] }) {
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const ranged = useMemo(() => filterByDateRange(leads, dateRange), [leads, dateRange])

  const total = ranged.length
  const convertedCount = ranged.filter((l) => l.status === 'converted').length
  const lostCount = ranged.filter((l) => l.status === 'lost').length
  const newCount = ranged.filter((l) => l.status === 'new').length
  const qualifiedCount = ranged.filter((l) => l.status === 'qualified').length
  const contactedCount = ranged.filter((l) => l.status === 'contacted').length
  const conversionRate = total > 0 ? Math.round((convertedCount / total) * 100) : 0
  const avgScore = total > 0 ? Math.round(ranged.reduce((s, l) => s + l.score, 0) / total) : 0

  const newTodayCount = leads.filter((l) => {
    const d = new Date(l.createdAt)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }).length

  const sourceMap = ranged.reduce<Record<string, number>>((acc, l) => {
    acc[l.source || 'unknown'] = (acc[l.source || 'unknown'] ?? 0) + 1
    return acc
  }, {})
  const topSources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxSrc = topSources[0]?.[1] ?? 1

  const greenPct  = total > 0 ? Math.round((convertedCount / total) * 100) : 0
  const yellowPct = total > 0 ? Math.round(((qualifiedCount + contactedCount) / total) * 100) : 0
  const redPct    = total > 0 ? Math.round((lostCount / total) * 100) : 0

  const dateButtons: { key: DateRange; label: string }[] = [
    { key: 'today', label: 'Heute' },
    { key: '7days', label: '7 Tage' },
    { key: '30days', label: '30 Tage' },
    { key: 'all', label: 'Alle' },
  ]

  const scoreGroups = [
    { label: 'Neu', count: newCount, color: 'bg-blue-400' },
    { label: 'Qualif.', count: qualifiedCount, color: 'bg-purple-400' },
    { label: 'Kont.', count: contactedCount, color: 'bg-yellow-400' },
    { label: 'Konv.', count: convertedCount, color: 'bg-vemo-green-500' },
    { label: 'Verl.', count: lostCount, color: 'bg-red-400' },
  ]

  return (
    <div className="space-y-4">
      {/* Date Range + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {dateButtons.map(({ key, label }) => (
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
          onClick={() => exportLeadsCSV(ranged)}
          className="btn-outline text-xs px-4 py-1.5 min-h-0 gap-1"
        >
          ⬇ CSV Export
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

        {/* 2. Score Distribution */}
        <div className="card p-4 flex flex-col gap-2">
          <div className="text-xs font-semibold text-vemo-dark-700 uppercase tracking-wide text-center">Score-Verteilung</div>
          <div className="flex gap-0.5 h-7 rounded-sm overflow-hidden w-full">
            {scoreGroups.map((g) =>
              g.count > 0 ? (
                <div
                  key={g.label}
                  title={`${g.label}: ${g.count}`}
                  className={`${g.color} flex items-center justify-center text-white text-xs font-bold`}
                  style={{ width: `${Math.round((g.count / Math.max(total, 1)) * 100)}%` }}
                >
                  {Math.round((g.count / Math.max(total, 1)) * 100) >= 15 ? g.count : ''}
                </div>
              ) : null
            )}
            {total === 0 && <div className="bg-vemo-dark-100 w-full flex items-center justify-center text-xs text-vemo-dark-400">—</div>}
          </div>
          <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 justify-center">
            <span className="text-xs text-blue-600 font-medium">N:{newCount}</span>
            <span className="text-xs text-purple-600 font-medium">Q:{qualifiedCount}</span>
            <span className="text-xs text-yellow-600 font-medium">K:{contactedCount}</span>
            <span className="text-xs text-vemo-green-700 font-medium">✓:{convertedCount}</span>
            <span className="text-xs text-red-500 font-medium">✗:{lostCount}</span>
          </div>
        </div>

        {/* 3. Conversion Rate */}
        <div className="card p-4 text-center flex flex-col items-center gap-1">
          <div className="text-2xl">📈</div>
          <div className="text-2xl font-bold text-vemo-green-600">{conversionRate}%</div>
          <div className="text-xs text-vemo-dark-500 font-medium">Conversion Rate</div>
          <div className="text-xs text-vemo-dark-400">Ø Score: {avgScore}</div>
        </div>

        {/* 4. Top Channels */}
        <div className="card p-4 flex flex-col gap-2">
          <div className="text-xs font-semibold text-vemo-dark-700 uppercase tracking-wide">Top Kanäle</div>
          <div className="space-y-1.5">
            {topSources.length === 0 ? (
              <div className="text-xs text-vemo-dark-400">Keine Daten</div>
            ) : topSources.map(([src, count]) => (
              <div key={src} className="flex items-center gap-1.5">
                <span className="text-sm w-5 text-center flex-shrink-0">{SOURCE_ICONS[src] ?? '❓'}</span>
                <div className="flex-1 min-w-0">
                  <div className="h-2 bg-vemo-green-400 rounded-full" style={{ width: `${Math.round((count / maxSrc) * 100)}%` }} />
                </div>
                <span className="text-xs text-vemo-dark-600 font-semibold w-4 text-right flex-shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Quick Stats */}
        <div className="card p-4 flex flex-col gap-2">
          <div className="text-xs font-semibold text-vemo-dark-700 uppercase tracking-wide">Quick Stats</div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-vemo-dark-500">🆕 Neu Heute</span>
              <span className="text-sm font-bold text-blue-600">{newTodayCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-vemo-dark-500">🔥 Hot Leads</span>
              <span className="text-sm font-bold text-vemo-green-600">{convertedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-vemo-dark-500">⚠️ At Risk</span>
              <span className="text-sm font-bold text-red-500">{lostCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Gauge + Channel Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Quality Gauge (Ampel) */}
        <div className="card p-4">
          <div className="text-xs font-semibold text-vemo-dark-700 uppercase tracking-wide mb-3">Lead-Qualität (Ampel)</div>
          <div className="flex gap-1 h-6 rounded-sm overflow-hidden mb-2">
            {greenPct > 0 && (
              <div className="bg-vemo-green-500 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${greenPct}%` }} title={`Konvertiert: ${greenPct}%`}>
                {greenPct >= 10 ? `${greenPct}%` : ''}
              </div>
            )}
            {yellowPct > 0 && (
              <div className="bg-yellow-400 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${yellowPct}%` }} title={`Pipeline: ${yellowPct}%`}>
                {yellowPct >= 10 ? `${yellowPct}%` : ''}
              </div>
            )}
            {redPct > 0 && (
              <div className="bg-red-400 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${redPct}%` }} title={`Verloren: ${redPct}%`}>
                {redPct >= 10 ? `${redPct}%` : ''}
              </div>
            )}
            {total === 0 && <div className="bg-vemo-dark-100 w-full flex items-center justify-center text-xs text-vemo-dark-400">Keine Leads</div>}
          </div>
          <div className="flex gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-vemo-dark-600"><span className="w-3 h-3 rounded-sm bg-vemo-green-500 inline-block" />Konvertiert {greenPct}%</span>
            <span className="flex items-center gap-1 text-xs text-vemo-dark-600"><span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" />Pipeline {yellowPct}%</span>
            <span className="flex items-center gap-1 text-xs text-vemo-dark-600"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />Verloren {redPct}%</span>
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="card p-4">
          <div className="text-xs font-semibold text-vemo-dark-700 uppercase tracking-wide mb-3">Kanal-Verteilung</div>
          <div className="space-y-2">
            {topSources.length === 0 ? (
              <div className="text-xs text-vemo-dark-400">Keine Daten</div>
            ) : topSources.map(([src, count]) => (
              <div key={src} className="flex items-center gap-2">
                <span className="w-20 text-xs text-vemo-dark-600 truncate flex-shrink-0">{SOURCE_ICONS[src] ?? '❓'} {SOURCE_LABELS[src] ?? src}</span>
                <div className="flex-1 bg-vemo-dark-100 rounded-full h-2 overflow-hidden">
                  <div className="h-2 bg-vemo-green-500 rounded-full" style={{ width: `${Math.round((count / maxSrc) * 100)}%` }} />
                </div>
                <span className="text-xs font-semibold text-vemo-dark-700 w-5 text-right flex-shrink-0">{count}</span>
                <span className="text-xs text-vemo-dark-400 w-9 text-right flex-shrink-0">{total > 0 ? `${Math.round((count / total) * 100)}%` : '0%'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [filterScoreMin, setFilterScoreMin] = useState(0)
  const [filterScoreMax, setFilterScoreMax] = useState(100)
  const [showFilters, setShowFilters] = useState(false)

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Selection & bulk
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')

  // Detail view
  const [detailLead, setDetailLead] = useState<Lead | null>(null)

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'manual', status: 'new', notes: '', value: '' })
  const [saving, setSaving] = useState(false)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterSource !== 'all') params.set('source', filterSource)
      if (search) params.set('search', search)
      if (filterScoreMin > 0) params.set('scoreMin', String(filterScoreMin))
      if (filterScoreMax < 100) params.set('scoreMax', String(filterScoreMax))
      const url = `/api/leads${params.toString() ? '?' + params.toString() : ''}`
      const res = await fetch(url)
      const data = await res.json()
      setLeads(data.leads ?? [])
      setIsMock(data.isMock ?? false)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterSource, search, filterScoreMin, filterScoreMax])

  useEffect(() => { loadLeads() }, [loadLeads])

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let av: any, bv: any
      switch (sortKey) {
        case 'name': av = a.name; bv = b.name; break
        case 'score': av = a.score; bv = b.score; break
        case 'status': av = a.status; bv = b.status; break
        case 'source': av = a.source; bv = b.source; break
        case 'value': av = a.value ?? 0; bv = b.value ?? 0; break
        case 'lastContact': av = a.lastContact ?? ''; bv = b.lastContact ?? ''; break
        case 'createdAt': av = a.createdAt; bv = b.createdAt; break
        default: av = a.score; bv = b.score
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [leads, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-vemo-dark-300 ml-1">↕</span>
    return <span className="text-vemo-green-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const allSelected = sortedLeads.length > 0 && sortedLeads.every((l) => selected.has(l.id))
  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(sortedLeads.map((l) => l.id)))
  }
  function toggleOne(id: string) {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  async function handleBulkAction() {
    if (!bulkStatus || selected.size === 0) return
    // In mock mode, just update local state
    setLeads((prev) => prev.map((l) => selected.has(l.id) ? { ...l, status: bulkStatus } : l))
    setSelected(new Set())
    setBulkStatus('')
  }

  async function handleDelete(id: string) {
    if (!confirm('Lead wirklich löschen?')) return
    if (id.startsWith('mock-')) {
      setLeads((prev) => prev.filter((l) => l.id !== id))
      if (detailLead?.id === id) setDetailLead(null)
      return
    }
    await fetch(`/api/leads?id=${id}`, { method: 'DELETE' })
    await loadLeads()
    if (detailLead?.id === id) setDetailLead(null)
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

  const totalValue = leads.reduce((s, l) => s + (l.value ?? 0), 0)
  const avgScore = leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0
  const hotLeads = leads.filter((l) => l.score >= 70).length
  const convertedCount = leads.filter((l) => l.status === 'converted').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎯</span>
            <h1 className="text-2xl font-bold text-vemo-dark-900">Lead-Dashboard</h1>
            {isMock && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-200">🔌 Mock-Daten</span>
            )}
          </div>
          <p className="text-vemo-dark-500 text-sm">Lead-Tracking mit Score-Bewertung und Pipeline-Verwaltung</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm whitespace-nowrap">
          + Lead hinzufügen
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Leads gesamt', value: leads.length, icon: '👥', sub: `${hotLeads} hot` },
          { label: 'Ø Score', value: avgScore, icon: '🏆', sub: avgScore >= 70 ? '↑ Gut' : avgScore >= 40 ? '→ Mittel' : '↓ Niedrig' },
          { label: 'Konvertiert', value: convertedCount, icon: '✅', sub: leads.length ? `${Math.round(convertedCount / leads.length * 100)}%` : '0%' },
          { label: 'Pipeline-Wert', value: `CHF ${totalValue.toLocaleString('de-CH')}`, icon: '💰', sub: '' },
        ].map(({ label, value, icon, sub }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xl font-bold text-vemo-dark-900">{value}</div>
            <div className="text-xs text-vemo-dark-500">{label}</div>
            {sub && <div className="text-xs text-vemo-dark-400 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Analytics Dashboard */}
      {!loading && <LeadAnalyticsBlock leads={leads} />}

      {/* Score Legend */}
      <div className="flex items-center gap-4 text-xs text-vemo-dark-500">
        <span className="font-semibold">Score:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {'< 40 Kalt'}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> 40–70 Warm</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {'> 70 Hot 🔥'}</span>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider mb-4">Neuer Lead</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Name *</label>
              <input className="input w-full text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Max Mustermann" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">E-Mail</label>
              <input className="input w-full text-sm" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="max@beispiel.ch" />
            </div>
            <div>
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Telefon</label>
              <input className="input w-full text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+41 79 123 45 67" />
            </div>
            <div>
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Wert (CHF)</label>
              <input className="input w-full text-sm" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="490" />
            </div>
            <div>
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Quelle</label>
              <select className="input w-full text-sm" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Status</label>
              <select className="input w-full text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Notizen</label>
              <textarea className="input w-full text-sm h-20 resize-none" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informationen zum Lead..." />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Speichern...' : 'Lead speichern'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Abbrechen</button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vemo-dark-400 text-sm">🔍</span>
          <input
            className="input w-full text-sm pl-8"
            placeholder="Name, E-Mail oder Telefon suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters((f) => !f)}
          className={`btn-outline text-sm flex items-center gap-2 ${showFilters ? 'bg-vemo-dark-50' : ''}`}
        >
          🎛 Filter {(filterStatus !== 'all' || filterSource !== 'all' || filterScoreMin > 0 || filterScoreMax < 100) && (
            <span className="w-2 h-2 rounded-full bg-vemo-green-500 inline-block" />
          )}
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Status</label>
            <select className="input w-full text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Alle Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Quelle</label>
            <select className="input w-full text-sm" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
              <option value="all">Alle Quellen</option>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Score Minimum: {filterScoreMin}</label>
            <input type="range" min={0} max={100} value={filterScoreMin} onChange={(e) => setFilterScoreMin(Number(e.target.value))} className="w-full accent-vemo-green-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">Score Maximum: {filterScoreMax}</label>
            <input type="range" min={0} max={100} value={filterScoreMax} onChange={(e) => setFilterScoreMax(Number(e.target.value))} className="w-full accent-vemo-green-500" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button onClick={() => { setFilterStatus('all'); setFilterSource('all'); setFilterScoreMin(0); setFilterScoreMax(100) }} className="text-xs text-vemo-dark-500 hover:text-vemo-dark-800 underline">
              Filter zurücksetzen
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="card p-3 bg-vemo-green-50 border border-vemo-green-200 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-vemo-dark-800">{selected.size} ausgewählt</span>
          <select className="input text-sm py-1" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
            <option value="">Status ändern...</option>
            {Object.entries(STATUS_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
          </select>
          <button onClick={handleBulkAction} disabled={!bulkStatus} className="btn-primary text-sm py-1 disabled:opacity-40">Anwenden</button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-vemo-dark-500 hover:text-vemo-dark-800 underline">Abwählen</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-vemo-dark-500">Lade Leads...</div>
      ) : sortedLeads.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <div className="text-sm text-vemo-dark-500">Keine Leads gefunden.</div>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm mt-3">+ Lead hinzufügen</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-vemo-dark-50 border-b border-vemo-dark-200">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded cursor-pointer accent-vemo-green-500" />
                  </th>
                  {([
                    ['name', 'Lead'],
                    ['source', 'Quelle'],
                    ['status', 'Status'],
                    ['score', 'Score'],
                    ['value', 'Wert'],
                    ['lastContact', 'Letzter Kontakt'],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => toggleSort(key)}
                      className="text-left text-xs font-semibold text-vemo-dark-600 uppercase tracking-wider px-4 py-3 cursor-pointer hover:bg-vemo-dark-100 select-none"
                    >
                      {label}<SortIcon col={key} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold text-vemo-dark-600 uppercase tracking-wider text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vemo-dark-100">
                {sortedLeads.map((lead) => {
                  const statusCfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-700 border-gray-200' }
                  const isSelected = selected.has(lead.id)
                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-vemo-dark-50 transition-colors cursor-pointer ${isSelected ? 'bg-vemo-green-50' : ''}`}
                      onClick={() => setDetailLead(lead)}
                    >
                      <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleOne(lead.id) }}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(lead.id)} className="rounded cursor-pointer accent-vemo-green-500" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-vemo-dark-900">{lead.name}</div>
                        <div className="text-xs text-vemo-dark-400">{lead.email ?? lead.phone ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-base">{SOURCE_ICONS[lead.source] ?? '❓'}</span>
                        <span className="ml-1 text-xs text-vemo-dark-500">{SOURCE_LABELS[lead.source] ?? lead.source}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${scoreDot(lead.score)}`} />
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${scoreColor(lead.score)}`}>{lead.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-vemo-dark-900">
                        {lead.value ? `CHF ${lead.value.toLocaleString('de-CH')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-vemo-dark-500">
                        {formatDate(lead.lastContact)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} title="Anrufen" className="p-1.5 rounded hover:bg-vemo-dark-100 text-vemo-dark-400 hover:text-vemo-dark-700 transition-colors">📞</a>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} title="E-Mail" className="p-1.5 rounded hover:bg-vemo-dark-100 text-vemo-dark-400 hover:text-vemo-dark-700 transition-colors">✉️</a>
                          )}
                          <button
                            onClick={() => handleDelete(lead.id)}
                            title="Löschen"
                            className="p-1.5 rounded hover:bg-red-50 text-vemo-dark-400 hover:text-red-500 transition-colors"
                          >🗑</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-vemo-dark-100 text-xs text-vemo-dark-400 flex justify-between">
            <span>{sortedLeads.length} Lead{sortedLeads.length !== 1 ? 's' : ''}</span>
            <span>Sortiert nach: {sortKey} {sortDir === 'asc' ? '↑' : '↓'}</span>
          </div>
        </div>
      )}

      {/* Lead Detail Slide-over */}
      {detailLead && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setDetailLead(null)}>
          <div className="flex-1 bg-black/30" />
          <div
            className="w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-vemo-dark-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${scoreDot(detailLead.score)}`} />
                  <h2 className="text-lg font-bold text-vemo-dark-900">{detailLead.name}</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${(STATUS_CONFIG[detailLead.status] ?? { color: 'bg-gray-100 text-gray-600 border-gray-200' }).color}`}>
                    {(STATUS_CONFIG[detailLead.status] ?? { label: detailLead.status }).label}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${scoreColor(detailLead.score)}`}>Score {detailLead.score}/100</span>
                </div>
              </div>
              <button onClick={() => setDetailLead(null)} className="text-vemo-dark-400 hover:text-vemo-dark-700 text-xl font-bold leading-none p-1">×</button>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* Score Bar */}
              <div>
                <div className="flex justify-between text-xs text-vemo-dark-500 mb-1">
                  <span>Lead-Score</span>
                  <span className="font-bold">{detailLead.score}/100</span>
                </div>
                <div className="h-3 bg-vemo-dark-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${detailLead.score >= 70 ? 'bg-green-500' : detailLead.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${detailLead.score}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-vemo-dark-400 mt-1">
                  <span>Kalt</span><span>Warm</span><span>Hot</span>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-xs font-bold text-vemo-dark-600 uppercase tracking-wider mb-3">Kontaktdaten</h3>
                <div className="space-y-2">
                  {detailLead.email && (
                    <div className="flex items-center gap-3">
                      <span className="text-base">✉️</span>
                      <a href={`mailto:${detailLead.email}`} className="text-sm text-vemo-dark-700 hover:underline">{detailLead.email}</a>
                    </div>
                  )}
                  {detailLead.phone && (
                    <div className="flex items-center gap-3">
                      <span className="text-base">📞</span>
                      <a href={`tel:${detailLead.phone}`} className="text-sm text-vemo-dark-700 hover:underline">{detailLead.phone}</a>
                    </div>
                  )}
                  {!detailLead.email && !detailLead.phone && (
                    <div className="text-sm text-vemo-dark-400">Keine Kontaktdaten hinterlegt</div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div>
                <h3 className="text-xs font-bold text-vemo-dark-600 uppercase tracking-wider mb-3">Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-vemo-dark-400 mb-0.5">Quelle</div>
                    <div className="font-medium text-vemo-dark-800">{SOURCE_ICONS[detailLead.source]} {SOURCE_LABELS[detailLead.source] ?? detailLead.source}</div>
                  </div>
                  <div>
                    <div className="text-xs text-vemo-dark-400 mb-0.5">Pipeline-Wert</div>
                    <div className="font-medium text-vemo-dark-800">{detailLead.value ? `CHF ${detailLead.value.toLocaleString('de-CH')}` : '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-vemo-dark-400 mb-0.5">Letzter Kontakt</div>
                    <div className="font-medium text-vemo-dark-800">{formatDate(detailLead.lastContact)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-vemo-dark-400 mb-0.5">Erstellt</div>
                    <div className="font-medium text-vemo-dark-800">{formatDate(detailLead.createdAt)}</div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {detailLead.notes && (
                <div>
                  <h3 className="text-xs font-bold text-vemo-dark-600 uppercase tracking-wider mb-2">Notizen</h3>
                  <div className="bg-vemo-dark-50 rounded-lg p-3 text-sm text-vemo-dark-700 whitespace-pre-wrap">{detailLead.notes}</div>
                </div>
              )}

              {/* Activity (Mock History) */}
              <div>
                <h3 className="text-xs font-bold text-vemo-dark-600 uppercase tracking-wider mb-3">Aktivitäts-Verlauf</h3>
                <div className="space-y-3">
                  {[
                    { icon: '🎯', text: `Lead erstellt (${SOURCE_LABELS[detailLead.source] ?? detailLead.source})`, date: detailLead.createdAt },
                    ...(detailLead.status !== 'new' ? [{ icon: '📞', text: 'Erstkontakt hergestellt', date: detailLead.lastContact ?? detailLead.createdAt }] : []),
                    ...(detailLead.status === 'qualified' || detailLead.status === 'converted' ? [{ icon: '✅', text: 'Lead qualifiziert', date: detailLead.lastContact ?? detailLead.createdAt }] : []),
                    ...(detailLead.status === 'converted' ? [{ icon: '🎉', text: 'Abschluss — Konvertiert!', date: detailLead.lastContact ?? detailLead.createdAt }] : []),
                  ].map((event, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-sm">{event.icon}</span>
                      <div>
                        <div className="text-sm text-vemo-dark-800">{event.text}</div>
                        <div className="text-xs text-vemo-dark-400">{formatDate(event.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-vemo-dark-200 flex gap-2 flex-wrap">
              {detailLead.phone && (
                <a href={`tel:${detailLead.phone}`} className="btn-primary text-sm flex-1 text-center">📞 Anrufen</a>
              )}
              {detailLead.email && (
                <a href={`mailto:${detailLead.email}`} className="btn-outline text-sm flex-1 text-center">✉️ E-Mail</a>
              )}
              <button onClick={() => handleDelete(detailLead.id)} className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">🗑</button>
            </div>
          </div>
        </div>
      )}

      {/* API Info */}
      {isMock && (
        <div className="card p-5 bg-blue-50/50 border border-blue-200">
          <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2">🔌 API-Integration vorbereitet</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• <strong>HubSpot:</strong> <code className="bg-blue-100 px-1 rounded">HUBSPOT_API_KEY</code> setzen → automatischer CRM-Sync</p>
            <p>• <strong>Pipedrive:</strong> <code className="bg-blue-100 px-1 rounded">PIPEDRIVE_API_KEY</code> setzen → Deals und Kontakte synchronisieren</p>
          </div>
        </div>
      )}
    </div>
  )
}
