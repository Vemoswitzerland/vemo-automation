'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Mock Data ─────────────────────────────────────────────────────────────
const leadsData = {
  total: 347,
  new: 28,
  qualified: 89,
  converted: 34,
  conversionRate: 9.8,
  trend: +12,
  sources: [
    { name: 'Instagram', count: 142, percentage: 41, color: 'bg-pink-500' },
    { name: 'Facebook', count: 98, percentage: 28, color: 'bg-blue-500' },
    { name: 'Google Ads', count: 67, percentage: 19, color: 'bg-yellow-500' },
    { name: 'Empfehlung', count: 40, percentage: 12, color: 'bg-vemo-green-500' },
  ],
  monthly: [
    { month: 'Jan', leads: 38 },
    { month: 'Feb', leads: 42 },
    { month: 'Mrz', leads: 35 },
    { month: 'Apr', leads: 51 },
    { month: 'Mai', leads: 48 },
    { month: 'Jun', leads: 60 },
    { month: 'Jul', leads: 73 },
  ],
}

const adsData = {
  totalSpend: 1840,
  totalReach: 124500,
  totalClicks: 3280,
  avgCTR: 2.63,
  avgCPC: 0.56,
  roas: 3.2,
  trend: +8,
  campaigns: [
    { name: 'Instagram Frühjahr 2026', platform: '📸', status: 'active', spend: 640, reach: 48000, clicks: 1240, ctr: 2.58, leads: 67, cpl: 9.55 },
    { name: 'Facebook Retargeting', platform: '📘', status: 'active', spend: 420, reach: 31000, clicks: 890, ctr: 2.87, leads: 45, cpl: 9.33 },
    { name: 'Google Search Vemo', platform: '🔍', status: 'active', spend: 580, reach: 28500, clicks: 870, ctr: 3.05, leads: 38, cpl: 15.26 },
    { name: 'Facebook Brand Awareness', platform: '📘', status: 'paused', spend: 200, reach: 17000, clicks: 280, ctr: 1.65, leads: 12, cpl: 16.67 },
  ],
}

const aiTips = [
  { priority: 'high', icon: '🎯', title: 'Instagram Ads skalieren', body: 'Deine Instagram-Kampagne liefert den besten CPL (CHF 9.55). Erhöhe das Budget um 30% für maximalen ROI.', action: 'Budget anpassen', metric: 'CPL: CHF 9.55', color: 'border-l-vemo-green-500 bg-vemo-green-50/50' },
  { priority: 'high', icon: '⚡', title: 'Facebook Brand Awareness pausiert', body: 'Diese Kampagne hat eine CTR von nur 1.65% und CPL von CHF 16.67. Entweder creative refresh oder Budget umschichten.', action: 'Kampagne optimieren', metric: 'CTR: 1.65%', color: 'border-l-orange-500 bg-orange-50/50' },
  { priority: 'medium', icon: '📈', title: 'Lead-Qualität verbessern', body: 'Nur 9.8% der Leads konvertieren. Ein Qualifizierungsformular auf der Landingpage könnte die Rate auf 15%+ steigern.', action: 'Landingpage optimieren', metric: 'Conversion: 9.8%', color: 'border-l-blue-500 bg-blue-50/50' },
  { priority: 'medium', icon: '🗓️', title: 'Bester Posting-Zeitpunkt', body: 'Deine Instagram-Leads kommen hauptsächlich Dienstag–Donnerstag, 11–13 Uhr. Ads zu diesen Zeiten erhöhen könnten Ergebnisse verbessern.', action: 'Ad-Schedule anpassen', metric: 'Peak: Di–Do, 11–13h', color: 'border-l-purple-500 bg-purple-50/50' },
]

// ── Schedule type ────────────────────────────────────────────────────────
interface Schedule {
  id: string
  email: string
  frequency: 'weekly' | 'monthly'
  reportType: string
  createdAt: string
  active: boolean
}

// ── Small Components ───────────────────────────────────────────────────
function TrendBadge({ value }: { value: number }) {
  const isPositive = value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? 'bg-vemo-green-100 text-vemo-green-700' : 'bg-red-100 text-red-700'}`}>
      {isPositive ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active')
    return <span className="text-xs px-2 py-0.5 rounded-full bg-vemo-green-100 text-vemo-green-700 font-semibold border border-vemo-green-200">● Aktiv</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold border border-yellow-200">⏸ Pausiert</span>
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 bg-vemo-dark-100 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${(value / max) * 100}%` }} />
    </div>
  )
}

function SparkBar({ data }: { data: { month: string; leads: number }[] }) {
  const max = Math.max(...data.map((d) => d.leads))
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-vemo-green-400 rounded-sm transition-all duration-500 hover:bg-vemo-green-500" style={{ height: `${(d.leads / max) * 52}px` }} title={`${d.month}: ${d.leads} Leads`} />
          <span className="text-[9px] text-vemo-dark-400">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

// ── Export Section ─────────────────────────────────────────────────────
function ExportSection() {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv')
  const [reportType, setReportType] = useState<'leads' | 'funnel' | 'channels'>('leads')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('30d')
  const [loading, setLoading] = useState(false)
  const [pdfMsg, setPdfMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setLoading(true)
    setError(null)
    setPdfMsg(null)

    try {
      const res = await fetch('/api/reporting/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, reportType, dateRange }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Unbekannter Fehler')
        return
      }

      if (format === 'pdf') {
        const data = await res.json()
        setPdfMsg(data.message)
        return
      }

      // CSV download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}-export-${dateRange}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError('Netzwerkfehler beim Export')
    } finally {
      setLoading(false)
    }
  }

  const reportTypeLabels: Record<string, string> = {
    leads: 'Leads',
    funnel: 'Funnel',
    channels: 'Kanäle',
  }

  const dateRangeLabels: Record<string, string> = {
    '7d': 'Letzte 7 Tage',
    '30d': 'Letzte 30 Tage',
    all: 'Alle Daten',
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-xl">📥</span>
        <h2 className="text-base font-bold text-vemo-dark-900">Report exportieren</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Format */}
        <div>
          <label className="block text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider mb-2">Format</label>
          <div className="flex gap-2">
            {(['csv', 'pdf'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFormat(f); setPdfMsg(null); setError(null) }}
                className={`flex-1 py-2 px-3 rounded text-sm font-semibold border transition-all ${format === f ? 'bg-vemo-dark-900 text-white border-vemo-dark-900' : 'bg-white text-vemo-dark-600 border-vemo-dark-200 hover:border-vemo-dark-400'}`}
              >
                {f === 'csv' ? '📄 CSV' : '📑 PDF'}
              </button>
            ))}
          </div>
        </div>

        {/* Report Type */}
        <div>
          <label className="block text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider mb-2">Typ</label>
          <select
            className="input w-full"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as 'leads' | 'funnel' | 'channels')}
          >
            {Object.entries(reportTypeLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider mb-2">Zeitraum</label>
          <select
            className="input w-full"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | 'all')}
          >
            {Object.entries(dateRangeLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleExport}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <><span className="animate-spin">⏳</span> Wird exportiert…</>
          ) : (
            <><span>⬇️</span> {format.toUpperCase()} herunterladen</>
          )}
        </button>

        {pdfMsg && (
          <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 px-3 py-2 rounded-md">
            <span>ℹ️</span>
            <span>{pdfMsg}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
            <span>❌</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Schedule Section ───────────────────────────────────────────────────
function ScheduleSection() {
  const [email, setEmail] = useState('')
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly')
  const [reportType, setReportType] = useState('leads')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isMock, setIsMock] = useState(false)
  const [schedulesLoading, setSchedulesLoading] = useState(true)

  const loadSchedules = useCallback(async () => {
    setSchedulesLoading(true)
    try {
      const res = await fetch('/api/reporting/schedule')
      const data = await res.json()
      setSchedules(data.schedules ?? [])
      setIsMock(data.isMock ?? false)
    } catch {
      setSchedules([])
    } finally {
      setSchedulesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/reporting/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, frequency, reportType }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Fehler beim Speichern')
        return
      }

      setSuccess(true)
      setEmail('')
      loadSchedules()
    } catch {
      setError('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/reporting/schedule?id=${id}`, { method: 'DELETE' })
      loadSchedules()
    } catch {
      // ignore
    }
  }

  const frequencyLabel: Record<string, string> = { weekly: 'Wöchentlich', monthly: 'Monatlich' }
  const reportTypeLabel: Record<string, string> = { leads: 'Leads', funnel: 'Funnel', channels: 'Kanäle' }

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-xl">📅</span>
        <h2 className="text-base font-bold text-vemo-dark-900">Automatische Reports</h2>
      </div>

      {/* Mock hint */}
      <div className="flex items-start gap-2 text-xs text-vemo-dark-500 bg-vemo-dark-50 border border-vemo-dark-200 rounded-md px-3 py-2">
        <span>ℹ️</span>
        <span>E-Mail-Versand wird aktiv, sobald SMTP/SendGrid in den Einstellungen konfiguriert ist. Reports werden trotzdem gespeichert.</span>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Email */}
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider mb-2">E-Mail</label>
          <input
            type="email"
            className="input w-full"
            placeholder="mail@beispiel.ch"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider mb-2">Frequenz</label>
          <select
            className="input w-full"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly')}
          >
            <option value="weekly">Wöchentlich</option>
            <option value="monthly">Monatlich</option>
          </select>
        </div>

        {/* Report Type */}
        <div>
          <label className="block text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider mb-2">Typ</label>
          <select
            className="input w-full"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="leads">Leads</option>
            <option value="funnel">Funnel</option>
            <option value="channels">Kanäle</option>
          </select>
        </div>

        <div className="sm:col-span-3 flex items-center gap-3 flex-wrap">
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <><span className="animate-spin">⏳</span> Speichern…</> : <><span>➕</span> Schedule erstellen</>}
          </button>
          {success && (
            <span className="text-sm text-vemo-green-700 bg-vemo-green-50 border border-vemo-green-200 px-3 py-1.5 rounded-md font-medium">
              ✅ Schedule gespeichert!
            </span>
          )}
          {error && (
            <span className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-md">
              ❌ {error}
            </span>
          )}
        </div>
      </form>

      {/* Existing Schedules */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-vemo-dark-700">Aktive Schedules</h3>
          {isMock && (
            <span className="text-xs text-vemo-dark-400 bg-vemo-dark-100 px-2 py-0.5 rounded-full">Mock</span>
          )}
        </div>

        {schedulesLoading ? (
          <div className="text-sm text-vemo-dark-400 py-3">Lade Schedules…</div>
        ) : schedules.length === 0 ? (
          <div className="text-sm text-vemo-dark-400 bg-vemo-dark-50 rounded-md px-4 py-3">
            Noch keine Schedules konfiguriert.
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 bg-vemo-dark-50 border border-vemo-dark-200 rounded-md px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base shrink-0">{s.frequency === 'weekly' ? '📅' : '🗓️'}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-vemo-dark-800 truncate">{s.email}</div>
                    <div className="text-xs text-vemo-dark-500">
                      {frequencyLabel[s.frequency] ?? s.frequency} · {reportTypeLabel[s.reportType] ?? s.reportType}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-vemo-dark-400">
                    seit {new Date(s.createdAt).toLocaleDateString('de-CH')}
                  </span>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    title="Schedule löschen"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
type Tab = 'overview' | 'leads' | 'ads' | 'tips' | 'export'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Übersicht', icon: '📊' },
    { key: 'leads', label: 'Leads', icon: '🎯' },
    { key: 'ads', label: 'Werbeanzeigen', icon: '📢' },
    { key: 'tips', label: 'AI-Tipps', icon: '🧠' },
    { key: 'export', label: 'Export & Schedule', icon: '📥' },
  ]

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📊</span>
            <span className="text-xs font-semibold text-vemo-dark-500 uppercase tracking-widest">Business Reports</span>
          </div>
          <h1 className="text-3xl font-bold text-vemo-dark-900">Auswertungen</h1>
          <p className="text-vemo-dark-500 mt-1">Lead-Analyse, Werbeanzeigen-Performance, AI-Empfehlungen und Export</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-vemo-dark-500 bg-vemo-dark-100 px-3 py-2 rounded-md">
          <span>🗓️</span>
          <span>Letzte 30 Tage · Mock-Daten</span>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────── */}
      <div className="flex gap-1 bg-vemo-dark-100 p-1 rounded-md w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-white text-vemo-dark-900 shadow-sm'
                : 'text-vemo-dark-500 hover:text-vemo-dark-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Overview Tab ────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card border-t-4 border-t-vemo-green-500">
              <div className="text-xs text-vemo-dark-500 font-semibold uppercase tracking-wider mb-2">Leads gesamt</div>
              <div className="text-3xl font-bold text-vemo-dark-900">{leadsData.total}</div>
              <div className="flex items-center gap-2 mt-2">
                <TrendBadge value={leadsData.trend} />
                <span className="text-xs text-vemo-dark-400">vs. Vormonat</span>
              </div>
            </div>
            <div className="card border-t-4 border-t-blue-500">
              <div className="text-xs text-vemo-dark-500 font-semibold uppercase tracking-wider mb-2">Neue Leads</div>
              <div className="text-3xl font-bold text-vemo-dark-900">{leadsData.new}</div>
              <div className="text-xs text-vemo-dark-400 mt-2">Diese Woche</div>
            </div>
            <div className="card border-t-4 border-t-orange-500">
              <div className="text-xs text-vemo-dark-500 font-semibold uppercase tracking-wider mb-2">Ad-Ausgaben</div>
              <div className="text-3xl font-bold text-vemo-dark-900">CHF {adsData.totalSpend}</div>
              <div className="flex items-center gap-2 mt-2">
                <TrendBadge value={adsData.trend} />
                <span className="text-xs text-vemo-dark-400">vs. Vormonat</span>
              </div>
            </div>
            <div className="card border-t-4 border-t-purple-500">
              <div className="text-xs text-vemo-dark-500 font-semibold uppercase tracking-wider mb-2">ROAS</div>
              <div className="text-3xl font-bold text-vemo-dark-900">{adsData.roas}x</div>
              <div className="text-xs text-vemo-dark-400 mt-2">Return on Ad Spend</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider mb-4">Lead-Quellen</h2>
              <div className="space-y-3">
                {leadsData.sources.map((src) => (
                  <div key={src.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-vemo-dark-700">{src.name}</span>
                      <span className="text-sm font-bold text-vemo-dark-900">{src.count} <span className="text-xs font-normal text-vemo-dark-400">({src.percentage}%)</span></span>
                    </div>
                    <MiniBar value={src.percentage} max={100} color={src.color} />
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider mb-4">Leads pro Monat</h2>
              <SparkBar data={leadsData.monthly} />
              <div className="mt-4 pt-4 border-t border-vemo-dark-100 flex items-center justify-between text-xs text-vemo-dark-500">
                <span>Ø {Math.round(leadsData.monthly.reduce((a, b) => a + b.leads, 0) / leadsData.monthly.length)} Leads/Monat</span>
                <span className="text-vemo-green-600 font-semibold">Trend: steigend ↑</span>
              </div>
            </div>
          </div>

          <div className={`card border-l-4 ${aiTips[0].color}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{aiTips[0].icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-vemo-green-700 uppercase tracking-wider">Top AI-Empfehlung</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-vemo-green-100 text-vemo-green-700 border border-vemo-green-200 font-semibold">{aiTips[0].metric}</span>
                </div>
                <h3 className="font-bold text-vemo-dark-900 mb-1">{aiTips[0].title}</h3>
                <p className="text-sm text-vemo-dark-600">{aiTips[0].body}</p>
              </div>
              <button onClick={() => setActiveTab('tips')} className="btn-primary text-xs py-2 px-3 shrink-0">
                Alle Tipps
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Leads Tab ───────────────────────────────────────────────── */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Leads gesamt', value: leadsData.total, sub: `+${leadsData.new} diese Woche`, color: 'border-t-vemo-green-500' },
              { label: 'Qualifiziert', value: leadsData.qualified, sub: `${Math.round((leadsData.qualified / leadsData.total) * 100)}% aller Leads`, color: 'border-t-blue-500' },
              { label: 'Konvertiert', value: leadsData.converted, sub: 'Zahlende Kunden', color: 'border-t-purple-500' },
              { label: 'Conversion Rate', value: `${leadsData.conversionRate}%`, sub: 'Lead → Kunde', color: 'border-t-orange-500' },
            ].map((kpi) => (
              <div key={kpi.label} className={`card border-t-4 ${kpi.color}`}>
                <div className="text-xs text-vemo-dark-500 font-semibold uppercase tracking-wider mb-2">{kpi.label}</div>
                <div className="text-3xl font-bold text-vemo-dark-900">{kpi.value}</div>
                <div className="text-xs text-vemo-dark-400 mt-2">{kpi.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider mb-4">Lead-Quellen Detail</h2>
              <div className="space-y-4">
                {leadsData.sources.map((src) => (
                  <div key={src.name} className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${src.color} shrink-0`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-vemo-dark-800">{src.name}</span>
                        <span className="text-sm font-bold text-vemo-dark-900">{src.count}</span>
                      </div>
                      <MiniBar value={src.percentage} max={100} color={src.color} />
                      <div className="text-xs text-vemo-dark-400 mt-0.5">{src.percentage}% aller Leads</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider mb-4">Monatliche Entwicklung</h2>
              <SparkBar data={leadsData.monthly} />
              <div className="mt-4 space-y-2">
                {leadsData.monthly.slice(-3).reverse().map((m) => (
                  <div key={m.month} className="flex items-center justify-between text-sm">
                    <span className="text-vemo-dark-600">{m.month} 2026</span>
                    <span className="font-bold text-vemo-dark-900">{m.leads} Leads</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Ads Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Gesamtausgaben', value: `CHF ${adsData.totalSpend}`, sub: 'Diesen Monat', color: 'border-t-orange-500' },
              { label: 'Reichweite', value: adsData.totalReach.toLocaleString('de-CH'), sub: 'Unique Impressions', color: 'border-t-blue-500' },
              { label: 'Klicks', value: adsData.totalClicks.toLocaleString('de-CH'), sub: `CTR: ${adsData.avgCTR}%`, color: 'border-t-purple-500' },
              { label: 'Ø CPC', value: `CHF ${adsData.avgCPC}`, sub: 'Cost per Click', color: 'border-t-vemo-green-500' },
            ].map((kpi) => (
              <div key={kpi.label} className={`card border-t-4 ${kpi.color}`}>
                <div className="text-xs text-vemo-dark-500 font-semibold uppercase tracking-wider mb-2">{kpi.label}</div>
                <div className="text-3xl font-bold text-vemo-dark-900">{kpi.value}</div>
                <div className="text-xs text-vemo-dark-400 mt-2">{kpi.sub}</div>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider mb-4">Kampagnen-Übersicht</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-vemo-dark-200">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider">Kampagne</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider">Ausgaben</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider">Reichweite</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider">CTR</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider">Leads</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider">CPL</th>
                    <th className="text-center py-2 pl-3 text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vemo-dark-100">
                  {adsData.campaigns.map((c) => (
                    <tr key={c.name} className="hover:bg-vemo-dark-50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{c.platform}</span>
                          <span className="font-semibold text-vemo-dark-800">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-vemo-dark-900">CHF {c.spend}</td>
                      <td className="py-3 px-3 text-right text-vemo-dark-600">{c.reach.toLocaleString('de-CH')}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`font-semibold ${c.ctr >= 2.5 ? 'text-vemo-green-600' : 'text-orange-600'}`}>{c.ctr}%</span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-vemo-dark-900">{c.leads}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`font-semibold ${c.cpl <= 10 ? 'text-vemo-green-600' : c.cpl <= 15 ? 'text-orange-500' : 'text-red-500'}`}>
                          CHF {c.cpl.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-center">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Tips Tab ─────────────────────────────────────────────── */}
      {activeTab === 'tips' && (
        <div className="space-y-6">
          <div className="card bg-gradient-to-r from-vemo-dark-900 to-vemo-dark-800 text-white border-0">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧠</span>
              <div>
                <h2 className="font-bold text-white text-lg">AI-Analyse</h2>
                <p className="text-vemo-dark-300 text-sm">Basierend auf deinen Ads- und Lead-Daten der letzten 30 Tage</p>
              </div>
              <div className="ml-auto text-xs bg-vemo-green-500/20 text-vemo-green-400 border border-vemo-green-500/30 px-3 py-1.5 rounded-full font-semibold">
                {aiTips.filter((t) => t.priority === 'high').length} dringende Empfehlungen
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {aiTips.map((tip, i) => (
              <div key={i} className={`card border-l-4 ${tip.color}`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl shrink-0 mt-0.5">{tip.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${tip.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {tip.priority === 'high' ? '🔴 Hoch' : '🔵 Mittel'}
                      </span>
                      <span className="text-xs text-vemo-dark-400 bg-vemo-dark-100 px-2 py-0.5 rounded-full">{tip.metric}</span>
                    </div>
                    <h3 className="font-bold text-vemo-dark-900 text-base mb-1">{tip.title}</h3>
                    <p className="text-sm text-vemo-dark-600 leading-relaxed">{tip.body}</p>
                    <button className="mt-3 btn-outline text-xs py-1.5 px-4">{tip.action} →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card border border-vemo-dark-200 bg-vemo-dark-50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">ℹ️</span>
              <span className="text-xs font-semibold text-vemo-dark-500 uppercase tracking-wider">Hinweis</span>
            </div>
            <p className="text-sm text-vemo-dark-500">
              Diese Empfehlungen basieren auf <strong>Mock-Daten</strong> zur Demonstration.
              Mit echten Ads-API-Verbindungen (Meta, Google) werden hier automatisch echte Analyse-Tipps generiert.
            </p>
          </div>
        </div>
      )}

      {/* ── Export & Schedule Tab ────────────────────────────────────── */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <ExportSection />
          <ScheduleSection />
        </div>
      )}
    </div>
  )
}
