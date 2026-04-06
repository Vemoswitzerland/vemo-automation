'use client'

import { useState, useMemo } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type DateRange = 'today' | '7days' | '30days' | 'all'

type LeadEvent = {
  id: string
  type: 'created' | 'contacted' | 'qualified' | 'status_change' | 'note' | 'call' | 'email'
  description: string
  timestamp: string
}

type Lead = {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string
  status: string
  score: number
  lastContact: string | null
  notes: string | null
  value: number | null
  createdAt: string
  history: LeadEvent[]
}

type SortField = 'name' | 'score' | 'status' | 'source' | 'lastContact' | 'value' | 'createdAt'
type SortDir = 'asc' | 'desc'

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_LEADS: Lead[] = [
  {
    id: 'l1', name: 'Anna Müller', email: 'anna@beispiel.ch', phone: '+41 79 123 45 67',
    source: 'instagram', status: 'qualified', score: 82,
    lastContact: '2026-04-05T14:30:00Z', notes: 'Interesse an Premium-Kurs. Sehr engagiert.',
    value: 890, createdAt: '2026-03-28T09:00:00Z',
    history: [
      { id: 'e1', type: 'created', description: 'Lead über Instagram-Story erstellt', timestamp: '2026-03-28T09:00:00Z' },
      { id: 'e2', type: 'email', description: 'Willkommens-Mail gesendet', timestamp: '2026-03-28T09:15:00Z' },
      { id: 'e3', type: 'call', description: 'Erstgespräch 12 Min. — sehr interessiert', timestamp: '2026-04-02T11:00:00Z' },
      { id: 'e4', type: 'status_change', description: 'Status: neu → qualifiziert', timestamp: '2026-04-02T11:15:00Z' },
      { id: 'e5', type: 'email', description: 'Angebot für Premium-Paket gesendet', timestamp: '2026-04-05T14:30:00Z' },
    ],
  },
  {
    id: 'l2', name: 'Thomas Keller', email: 'thomas@beispiel.ch', phone: '+41 78 987 65 43',
    source: 'google_ads', status: 'new', score: 61,
    lastContact: '2026-04-06T08:00:00Z', notes: 'Über Google Search auf Landing Page gekommen',
    value: 490, createdAt: '2026-04-06T07:45:00Z',
    history: [
      { id: 'e6', type: 'created', description: 'Lead über Google Ads Landing Page', timestamp: '2026-04-06T07:45:00Z' },
      { id: 'e7', type: 'email', description: 'Automatische Bestätigungsmail gesendet', timestamp: '2026-04-06T08:00:00Z' },
    ],
  },
  {
    id: 'l3', name: 'Sara Meier', email: 'sara@beispiel.ch', phone: null,
    source: 'referral', status: 'converted', score: 95,
    lastContact: '2026-04-04T16:00:00Z', notes: 'Empfehlung von Thomas Weber. Kauf abgeschlossen.',
    value: 1290, createdAt: '2026-03-20T10:00:00Z',
    history: [
      { id: 'e8', type: 'created', description: 'Lead via Empfehlung (Thomas Weber)', timestamp: '2026-03-20T10:00:00Z' },
      { id: 'e9', type: 'call', description: 'Beratungsgespräch 25 Min.', timestamp: '2026-03-25T14:00:00Z' },
      { id: 'e10', type: 'status_change', description: 'Status: neu → qualifiziert', timestamp: '2026-03-25T14:30:00Z' },
      { id: 'e11', type: 'email', description: 'Premium-Angebot zugestellt', timestamp: '2026-03-28T09:00:00Z' },
      { id: 'e12', type: 'call', description: 'Abschlussgespräch — Kauf bestätigt', timestamp: '2026-04-04T16:00:00Z' },
      { id: 'e13', type: 'status_change', description: 'Status: qualifiziert → konvertiert', timestamp: '2026-04-04T16:05:00Z' },
    ],
  },
  {
    id: 'l4', name: 'Martin Weber', email: 'martin@beispiel.ch', phone: '+41 76 555 12 34',
    source: 'facebook', status: 'contacted', score: 44,
    lastContact: '2026-04-03T10:15:00Z', notes: 'Hat auf Facebook-Ad geklickt, Infos angefragt',
    value: 290, createdAt: '2026-04-01T12:00:00Z',
    history: [
      { id: 'e14', type: 'created', description: 'Lead über Facebook-Ad erstellt', timestamp: '2026-04-01T12:00:00Z' },
      { id: 'e15', type: 'email', description: 'Infomaterial gesendet', timestamp: '2026-04-01T12:30:00Z' },
      { id: 'e16', type: 'contacted', description: 'Kurze Rückmeldung per E-Mail erhalten', timestamp: '2026-04-03T10:15:00Z' },
    ],
  },
  {
    id: 'l5', name: 'Lisa Brunner', email: 'lisa@beispiel.ch', phone: '+41 79 444 56 78',
    source: 'instagram', status: 'lost', score: 22,
    lastContact: '2026-03-30T11:00:00Z', notes: 'Kein weiteres Interesse nach Follow-up',
    value: 0, createdAt: '2026-03-22T08:30:00Z',
    history: [
      { id: 'e17', type: 'created', description: 'Lead über Instagram DM', timestamp: '2026-03-22T08:30:00Z' },
      { id: 'e18', type: 'call', description: 'Erstgespräch — kein Interesse an Premium', timestamp: '2026-03-28T13:00:00Z' },
      { id: 'e19', type: 'email', description: 'Follow-up Mail gesendet — keine Antwort', timestamp: '2026-03-30T11:00:00Z' },
      { id: 'e20', type: 'status_change', description: 'Status: kontaktiert → verloren', timestamp: '2026-04-01T09:00:00Z' },
    ],
  },
  {
    id: 'l6', name: 'Michael Schmid', email: 'michael@firma.ch', phone: '+41 77 321 98 76',
    source: 'google_ads', status: 'qualified', score: 77,
    lastContact: '2026-04-05T09:30:00Z', notes: 'KMU-Inhaber, Interesse an Firmen-Lösung',
    value: 2490, createdAt: '2026-03-31T14:00:00Z',
    history: [
      { id: 'e21', type: 'created', description: 'Lead über Google Search Ad (B2B)', timestamp: '2026-03-31T14:00:00Z' },
      { id: 'e22', type: 'email', description: 'B2B-Präsentation gesendet', timestamp: '2026-04-01T10:00:00Z' },
      { id: 'e23', type: 'call', description: 'Erstgespräch Firmen-Lösung 20 Min.', timestamp: '2026-04-05T09:30:00Z' },
      { id: 'e24', type: 'status_change', description: 'Status: neu → qualifiziert', timestamp: '2026-04-05T09:45:00Z' },
    ],
  },
  {
    id: 'l7', name: 'Petra Zimmermann', email: null, phone: '+41 78 111 22 33',
    source: 'manual', status: 'new', score: 35,
    lastContact: null, notes: 'Visitenkarte an Messe erhalten',
    value: 390, createdAt: '2026-04-04T17:00:00Z',
    history: [
      { id: 'e25', type: 'created', description: 'Lead manuell nach Messe-Kontakt erstellt', timestamp: '2026-04-04T17:00:00Z' },
    ],
  },
]

// ─── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:       { label: 'Neu',          color: 'bg-blue-100 text-blue-700 border-blue-200' },
  qualified: { label: 'Qualifiziert', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  contacted: { label: 'Kontaktiert',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  converted: { label: 'Konvertiert',  color: 'bg-vemo-green-100 text-vemo-green-700 border-vemo-green-200' },
  lost:      { label: 'Verloren',     color: 'bg-red-100 text-red-700 border-red-200' },
}

const SOURCE_CONFIG: Record<string, { label: string; icon: string }> = {
  instagram:  { label: 'Instagram', icon: '📸' },
  facebook:   { label: 'Facebook',  icon: '📘' },
  google_ads: { label: 'Google',    icon: '🔍' },
  referral:   { label: 'Empfehlung',icon: '👥' },
  manual:     { label: 'Manuell',   icon: '✏️' },
}

const EVENT_CONFIG: Record<string, { icon: string; color: string }> = {
  created:       { icon: '✨', color: 'bg-blue-100 text-blue-700' },
  contacted:     { icon: '📩', color: 'bg-yellow-100 text-yellow-700' },
  qualified:     { icon: '⭐', color: 'bg-purple-100 text-purple-700' },
  status_change: { icon: '🔄', color: 'bg-gray-100 text-gray-600' },
  note:          { icon: '📝', color: 'bg-gray-100 text-gray-600' },
  call:          { icon: '📞', color: 'bg-vemo-green-100 text-vemo-green-700' },
  email:         { icon: '✉️', color: 'bg-blue-100 text-blue-700' },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-vemo-green-100 text-vemo-green-700 border-vemo-green-200'
  if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

function scoreBarColor(score: number): string {
  if (score >= 70) return 'bg-vemo-green-500'
  if (score >= 40) return 'bg-yellow-400'
  return 'bg-red-400'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  if (diffH < 1) return 'Gerade eben'
  if (diffH < 24) return `vor ${diffH}h`
  if (diffD < 7) return `vor ${diffD}T`
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })
}

function formatCHF(v: number | null): string {
  if (!v) return '—'
  return `CHF ${v.toLocaleString('de-CH')}`
}

// ─── CSV Export ────────────────────────────────────────────────────────────────

function exportCSV(leads: Lead[]) {
  const headers = ['Name', 'Email', 'Telefon', 'Quelle', 'Status', 'Score', 'Wert (CHF)', 'Letzter Kontakt', 'Notizen', 'Erstellt am']
  const rows = leads.map((l) => [
    l.name,
    l.email ?? '',
    l.phone ?? '',
    SOURCE_CONFIG[l.source]?.label ?? l.source,
    STATUS_CONFIG[l.status]?.label ?? l.status,
    String(l.score),
    l.value?.toString() ?? '',
    l.lastContact ? new Date(l.lastContact).toLocaleDateString('de-CH') : '',
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

// ─── Date Range Filter ──────────────────────────────────────────────────────────

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

// ─── Analytics Dashboard ────────────────────────────────────────────────────────

function LeadAnalytics({ leads }: { leads: Lead[] }) {
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const rangedLeads = useMemo(() => filterByDateRange(leads, dateRange), [leads, dateRange])

  const total = rangedLeads.length
  const convertedCount = rangedLeads.filter((l) => l.status === 'converted').length
  const lostCount = rangedLeads.filter((l) => l.status === 'lost').length
  const newCount = rangedLeads.filter((l) => l.status === 'new').length
  const qualifiedCount = rangedLeads.filter((l) => l.status === 'qualified').length
  const contactedCount = rangedLeads.filter((l) => l.status === 'contacted').length
  const conversionRate = total > 0 ? Math.round((convertedCount / total) * 100) : 0
  const avgScore = total > 0 ? Math.round(rangedLeads.reduce((s, l) => s + l.score, 0) / total) : 0
  const newTodayCount = leads.filter((l) => {
    const d = new Date(l.createdAt)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }).length
  const hotCount = leads.filter((l) => l.status === 'converted').length
  const atRiskCount = leads.filter((l) => l.status === 'lost').length

  // Score distribution (stacked bar)
  const scoreGroups = [
    { label: 'Neu', count: newCount, color: 'bg-blue-400' },
    { label: 'Qualif.', count: qualifiedCount, color: 'bg-purple-400' },
    { label: 'Kont.', count: contactedCount, color: 'bg-yellow-400' },
    { label: 'Konv.', count: convertedCount, color: 'bg-vemo-green-500' },
    { label: 'Verloren', count: lostCount, color: 'bg-red-400' },
  ]

  // Channel distribution
  const sourceMap = rangedLeads.reduce<Record<string, number>>((acc, l) => {
    const src = l.source || 'unknown'
    acc[src] = (acc[src] ?? 0) + 1
    return acc
  }, {})
  const topSources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxSourceCount = topSources[0]?.[1] ?? 1

  // Quality gauge
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
          onClick={() => exportCSV(rangedLeads)}
          className="btn-outline text-xs px-4 py-1.5 min-h-0 gap-1.5"
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

        {/* 2. Lead Score Distribution */}
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
            ) : (
              topSources.map(([src, count]) => {
                const cfg = SOURCE_CONFIG[src] ?? { label: src, icon: '❓' }
                return (
                  <div key={src} className="flex items-center gap-1.5">
                    <span className="text-sm w-5 text-center flex-shrink-0">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div
                        className="h-2 bg-vemo-green-400 rounded-full"
                        style={{ width: `${Math.round((count / maxSourceCount) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-vemo-dark-600 font-semibold w-4 text-right flex-shrink-0">{count}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 5. Pending Actions / Quick Stats */}
        <div className="card p-4 flex flex-col gap-2">
          <div className="text-xs font-semibold text-vemo-dark-700 uppercase tracking-wide">Quick Stats</div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-vemo-dark-500">🆕 Neu Heute</span>
              <span className="text-sm font-bold text-blue-600">{newTodayCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-vemo-dark-500">🔥 Hot Leads</span>
              <span className="text-sm font-bold text-vemo-green-600">{hotCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-vemo-dark-500">⚠️ At Risk</span>
              <span className="text-sm font-bold text-red-500">{atRiskCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Gauge + Channel Detail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Quality Gauge (Ampel) */}
        <div className="card p-4">
          <div className="text-xs font-semibold text-vemo-dark-700 uppercase tracking-wide mb-3">Lead-Qualität (Ampel)</div>
          <div className="flex gap-1 h-6 rounded-sm overflow-hidden mb-2">
            {greenPct > 0 && (
              <div
                className="bg-vemo-green-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${greenPct}%` }}
                title={`Konvertiert: ${greenPct}%`}
              >
                {greenPct >= 10 ? `${greenPct}%` : ''}
              </div>
            )}
            {yellowPct > 0 && (
              <div
                className="bg-yellow-400 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${yellowPct}%` }}
                title={`Pipeline: ${yellowPct}%`}
              >
                {yellowPct >= 10 ? `${yellowPct}%` : ''}
              </div>
            )}
            {redPct > 0 && (
              <div
                className="bg-red-400 flex items-center justify-center text-white text-xs font-bold"
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
              <span className="w-3 h-3 rounded-sm bg-vemo-green-500 inline-block" />
              Konvertiert {greenPct}%
            </span>
            <span className="flex items-center gap-1 text-xs text-vemo-dark-600">
              <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" />
              Pipeline {yellowPct}%
            </span>
            <span className="flex items-center gap-1 text-xs text-vemo-dark-600">
              <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
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
              topSources.map(([src, count]) => {
                const cfg = SOURCE_CONFIG[src] ?? { label: src, icon: '❓' }
                return (
                  <div key={src} className="flex items-center gap-2">
                    <span className="w-20 text-xs text-vemo-dark-600 truncate flex-shrink-0">
                      {cfg.icon} {cfg.label}
                    </span>
                    <div className="flex-1 bg-vemo-dark-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 bg-vemo-green-500 rounded-full"
                        style={{ width: `${Math.round((count / maxSourceCount) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-vemo-dark-700 w-5 text-right flex-shrink-0">{count}</span>
                    <span className="text-xs text-vemo-dark-400 w-9 text-right flex-shrink-0">
                      {total > 0 ? `${Math.round((count / total) * 100)}%` : '0%'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Lead Detail Modal ─────────────────────────────────────────────────────────

function LeadDetailModal({ lead, onClose, onStatusChange }: {
  lead: Lead
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
}) {
  const statusCfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
  const sourceCfg = SOURCE_CONFIG[lead.source] ?? { label: lead.source, icon: '❓' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-vemo-dark-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-bold text-vemo-dark-900">{lead.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${scoreColor(lead.score)}`}>
                Score {lead.score}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-vemo-dark-500 flex-wrap">
              <span>{sourceCfg.icon} {sourceCfg.label}</span>
              {lead.email && <span>✉️ {lead.email}</span>}
              {lead.phone && <span>📞 {lead.phone}</span>}
              <span>💰 {formatCHF(lead.value)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-vemo-dark-400 hover:text-vemo-dark-700 text-xl leading-none ml-4">✕</button>
        </div>

        {/* Score Bar */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between text-xs text-vemo-dark-500 mb-1">
            <span>Lead-Score</span>
            <span className={`font-bold ${lead.score >= 70 ? 'text-vemo-green-700' : lead.score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{lead.score}/100</span>
          </div>
          <div className="h-2 bg-vemo-dark-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${scoreBarColor(lead.score)}`} style={{ width: `${lead.score}%` }} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-4 flex gap-2 flex-wrap border-b border-vemo-dark-100">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-vemo-green-50 text-vemo-green-700 border border-vemo-green-200 hover:bg-vemo-green-100 font-medium transition-colors">
              📞 Anrufen
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium transition-colors">
              ✉️ E-Mail
            </a>
          )}
          <div className="flex items-center gap-1 text-xs text-vemo-dark-500 ml-2">
            <span>Status ändern:</span>
          </div>
          {Object.entries(STATUS_CONFIG).filter(([k]) => k !== lead.status).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => onStatusChange(lead.id, key)}
              className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition-colors hover:opacity-80 ${cfg.color}`}
            >
              → {cfg.label}
            </button>
          ))}
        </div>

        {/* Notes */}
        {lead.notes && (
          <div className="px-6 py-4 border-b border-vemo-dark-100">
            <h3 className="text-xs font-bold text-vemo-dark-600 uppercase tracking-wider mb-2">Notizen</h3>
            <p className="text-sm text-vemo-dark-700">{lead.notes}</p>
          </div>
        )}

        {/* History */}
        <div className="px-6 py-4">
          <h3 className="text-xs font-bold text-vemo-dark-600 uppercase tracking-wider mb-3">Aktivitätsverlauf</h3>
          <div className="relative pl-4">
            {/* Timeline line */}
            <div className="absolute left-1.5 top-0 bottom-0 w-px bg-vemo-dark-100" />
            <div className="space-y-4">
              {[...lead.history].reverse().map((event) => {
                const cfg = EVENT_CONFIG[event.type] ?? { icon: '•', color: 'bg-gray-100 text-gray-600' }
                return (
                  <div key={event.id} className="relative flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs -ml-4 ${cfg.color}`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs text-vemo-dark-700">{event.description}</p>
                      <p className="text-xs text-vemo-dark-400 mt-0.5">{formatDate(event.timestamp)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS)
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterScoreMin, setFilterScoreMin] = useState(0)
  const [filterScoreMax, setFilterScoreMax] = useState(100)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailLead, setDetailLead] = useState<Lead | null>(null)
  const [bulkStatus, setBulkStatus] = useState('')

  // ── Filtering & Sorting ──
  const filtered = useMemo(() => {
    let result = leads.filter(l => {
      const q = search.toLowerCase()
      if (q && !l.name.toLowerCase().includes(q) && !l.email?.toLowerCase().includes(q) && !l.phone?.includes(q)) return false
      if (filterSource !== 'all' && l.source !== filterSource) return false
      if (filterStatus !== 'all' && l.status !== filterStatus) return false
      if (l.score < filterScoreMin || l.score > filterScoreMax) return false
      return true
    })

    result = [...result].sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0
      switch (sortField) {
        case 'name': av = a.name; bv = b.name; break
        case 'score': av = a.score; bv = b.score; break
        case 'value': av = a.value ?? 0; bv = b.value ?? 0; break
        case 'lastContact': av = a.lastContact ?? ''; bv = b.lastContact ?? ''; break
        case 'createdAt': av = a.createdAt; bv = b.createdAt; break
        case 'status': av = a.status; bv = b.status; break
        case 'source': av = a.source; bv = b.source; break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [leads, search, filterSource, filterStatus, filterScoreMin, filterScoreMax, sortField, sortDir])

  // ── Sort handler ──
  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="text-vemo-dark-300 ml-0.5">⇅</span>
    return <span className="text-vemo-green-600 ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  // ── Selection ──
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(l => l.id)))
  }

  // ── Actions ──
  function handleStatusChange(id: string, status: string) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    if (detailLead?.id === id) setDetailLead(prev => prev ? { ...prev, status } : null)
  }

  function handleBulkStatusChange() {
    if (!bulkStatus) return
    setLeads(prev => prev.map(l => selectedIds.has(l.id) ? { ...l, status: bulkStatus } : l))
    setSelectedIds(new Set())
    setBulkStatus('')
  }

  function handleBulkDelete() {
    setLeads(prev => prev.filter(l => !selectedIds.has(l.id)))
    setSelectedIds(new Set())
  }

  // ── Stats ──
  const totalValue = leads.reduce((s, l) => s + (l.value ?? 0), 0)
  const avgScore = leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0
  const highScoreCount = leads.filter(l => l.score >= 70).length
  const convertedCount = leads.filter(l => l.status === 'converted').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎯</span>
            <h1 className="text-2xl font-bold text-vemo-dark-900">Lead-Dashboard</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-200">🔌 Mock-Daten</span>
          </div>
          <p className="text-vemo-dark-500 text-sm">Lead-Tracking, Scoring & Pipeline-Verwaltung</p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <LeadAnalytics leads={leads} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Leads gesamt', value: leads.length, icon: '👥' },
          { label: 'Ø Score', value: avgScore, icon: '⭐', sub: `${highScoreCount} High-Score (≥70)` },
          { label: 'Konvertiert', value: convertedCount, icon: '✅', sub: `${leads.length ? Math.round((convertedCount / leads.length) * 100) : 0}% Rate` },
          { label: 'Pipeline-Wert', value: `CHF ${totalValue.toLocaleString('de-CH')}`, icon: '💰' },
        ].map(({ label, value, icon, sub }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xl font-bold text-vemo-dark-900">{value}</div>
            <div className="text-xs text-vemo-dark-500">{label}</div>
            {sub && <div className="text-xs text-vemo-dark-400 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-48 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vemo-dark-400 text-sm">🔍</span>
            <input
              className="input w-full pl-8 text-sm"
              placeholder="Name, E-Mail oder Telefon suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Source filter */}
          <select className="input text-sm" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
            <option value="all">Alle Quellen</option>
            {Object.entries(SOURCE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
          {/* Status filter */}
          <select className="input text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">Alle Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        {/* Score range */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-vemo-dark-500 font-medium">Score-Bereich:</span>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={100}
              value={filterScoreMin}
              onChange={e => setFilterScoreMin(Number(e.target.value))}
              className="input text-sm w-16 text-center"
            />
            <span className="text-vemo-dark-400 text-xs">bis</span>
            <input
              type="number" min={0} max={100}
              value={filterScoreMax}
              onChange={e => setFilterScoreMax(Number(e.target.value))}
              className="input text-sm w-16 text-center"
            />
          </div>
          <div className="flex gap-2">
            {[['🔴 Niedrig (<40)', 0, 39], ['🟡 Mittel (40-69)', 40, 69], ['🟢 Hoch (≥70)', 70, 100]].map(([label, min, max]) => (
              <button
                key={String(label)}
                onClick={() => { setFilterScoreMin(Number(min)); setFilterScoreMax(Number(max)) }}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${filterScoreMin === Number(min) && filterScoreMax === Number(max) ? 'bg-vemo-dark-800 text-white border-vemo-dark-800' : 'bg-white text-vemo-dark-600 border-vemo-dark-200 hover:border-vemo-dark-400'}`}
              >
                {String(label)}
              </button>
            ))}
            <button
              onClick={() => { setFilterScoreMin(0); setFilterScoreMax(100) }}
              className="text-xs px-2.5 py-1 rounded-full border font-medium bg-white text-vemo-dark-400 border-vemo-dark-200 hover:border-vemo-dark-400 transition-colors"
            >
              Alle
            </button>
          </div>
          <span className="text-xs text-vemo-dark-400 ml-auto">{filtered.length} von {leads.length} Leads</span>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="card p-3 bg-vemo-dark-800 text-white flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold">{selectedIds.size} ausgewählt</span>
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <select
              className="text-sm px-3 py-1.5 rounded-md bg-vemo-dark-700 text-white border border-vemo-dark-600 focus:outline-none"
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
            >
              <option value="">Status ändern...</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            {bulkStatus && (
              <button onClick={handleBulkStatusChange} className="text-sm px-3 py-1.5 rounded-md bg-vemo-green-500 text-white font-semibold hover:bg-vemo-green-600 transition-colors">
                Übernehmen
              </button>
            )}
            <button
              onClick={() => {
                setLeads(prev => prev.map(l => selectedIds.has(l.id) ? { ...l, status: 'qualified' } : l))
                setSelectedIds(new Set())
              }}
              className="text-sm px-3 py-1.5 rounded-md border border-vemo-dark-500 text-vemo-dark-200 hover:bg-vemo-dark-700 transition-colors"
            >
              → Sales zuweisen
            </button>
            <button onClick={handleBulkDelete} className="text-sm px-3 py-1.5 rounded-md border border-red-400 text-red-300 hover:bg-red-900/30 transition-colors">
              Löschen
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-vemo-dark-400 hover:text-white">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-3xl mb-2">🔍</div>
          <div className="text-sm text-vemo-dark-500">Keine Leads gefunden. Filter anpassen?</div>
          <button
            onClick={() => { setSearch(''); setFilterSource('all'); setFilterStatus('all'); setFilterScoreMin(0); setFilterScoreMax(100) }}
            className="btn-outline text-sm mt-3"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-vemo-dark-50 border-b border-vemo-dark-200">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-vemo-dark-300 accent-vemo-green-500"
                    />
                  </th>
                  {([
                    ['name', 'Lead'],
                    ['score', 'Score'],
                    ['source', 'Quelle'],
                    ['status', 'Status'],
                    ['lastContact', 'Letzter Kontakt'],
                    ['value', 'Wert'],
                  ] as [SortField, string][]).map(([field, label]) => (
                    <th
                      key={field}
                      className="text-left text-xs font-semibold text-vemo-dark-600 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-vemo-dark-900 select-none"
                      onClick={() => handleSort(field)}
                    >
                      {label}<SortIcon field={field} />
                    </th>
                  ))}
                  <th className="text-left text-xs font-semibold text-vemo-dark-600 uppercase tracking-wider px-4 py-3">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vemo-dark-100">
                {filtered.map(lead => {
                  const statusCfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
                  const sourceCfg = SOURCE_CONFIG[lead.source] ?? { label: lead.source, icon: '❓' }
                  const isSelected = selectedIds.has(lead.id)

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-vemo-dark-50 transition-colors ${isSelected ? 'bg-vemo-green-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-vemo-dark-300 accent-vemo-green-500"
                        />
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailLead(lead)}
                          className="text-left hover:text-vemo-green-700 transition-colors"
                        >
                          <div className="font-semibold text-vemo-dark-900 hover:underline">{lead.name}</div>
                          <div className="text-xs text-vemo-dark-400">{lead.email ?? lead.phone ?? '—'}</div>
                        </button>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${scoreColor(lead.score)}`}>
                            {lead.score}
                          </span>
                          <div className="w-16 h-1.5 bg-vemo-dark-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${scoreBarColor(lead.score)}`} style={{ width: `${lead.score}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <span className="text-base">{sourceCfg.icon}</span>
                        <span className="ml-1 text-xs text-vemo-dark-500">{sourceCfg.label}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Last Contact */}
                      <td className="px-4 py-3 text-xs text-vemo-dark-500">
                        {formatDate(lead.lastContact)}
                      </td>

                      {/* Value */}
                      <td className="px-4 py-3 text-right font-semibold text-vemo-dark-900 text-xs">
                        {formatCHF(lead.value)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} title="Anrufen" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-vemo-green-100 text-vemo-dark-500 hover:text-vemo-green-700 transition-colors text-sm">
                              📞
                            </a>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} title="E-Mail" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-blue-100 text-vemo-dark-500 hover:text-blue-700 transition-colors text-sm">
                              ✉️
                            </a>
                          )}
                          <button
                            onClick={() => setDetailLead(lead)}
                            title="Details"
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-vemo-dark-100 text-vemo-dark-400 hover:text-vemo-dark-700 transition-colors text-sm"
                          >
                            👁
                          </button>
                          <button
                            onClick={() => setLeads(prev => prev.filter(l => l.id !== lead.id))}
                            title="Löschen"
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-100 text-vemo-dark-300 hover:text-red-600 transition-colors text-sm"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-4 py-3 border-t border-vemo-dark-100 bg-vemo-dark-50 flex items-center justify-between text-xs text-vemo-dark-500">
            <span>{filtered.length} Lead{filtered.length !== 1 ? 's' : ''} angezeigt</span>
            <span>Gesamt-Wert: <strong className="text-vemo-dark-700">CHF {filtered.reduce((s, l) => s + (l.value ?? 0), 0).toLocaleString('de-CH')}</strong></span>
          </div>
        </div>
      )}

      {/* API Integration Info */}
      <div className="card p-5 bg-blue-50/50 border border-blue-200">
        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2">🔌 API-Integration vorbereitet</h3>
        <div className="text-xs text-blue-700 space-y-1">
          <p>• <strong>HubSpot:</strong> <code className="bg-blue-100 px-1 rounded">HUBSPOT_API_KEY</code> → CRM-Sync inkl. Score-Daten</p>
          <p>• <strong>Pipedrive:</strong> <code className="bg-blue-100 px-1 rounded">PIPEDRIVE_API_KEY</code> → Deals und Kontakte synchronisieren</p>
          <p>• <strong>Lead-Scoring:</strong> Score wird bei echter Integration direkt aus CRM-Daten berechnet</p>
          <p>• <strong>Connector:</strong> <a href="/connectors" className="underline">Connectors einrichten</a></p>
        </div>
      </div>

      {/* Detail Modal */}
      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
