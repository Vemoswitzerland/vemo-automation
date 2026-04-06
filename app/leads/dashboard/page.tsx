'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

type DateRange = '7d' | '30d' | 'all'

// Funnel types
interface FunnelLead {
  id: string
  name: string
  score: number
  source: string
}

interface FunnelStage {
  key: string
  label: string
  count: number
  conversionFromPrev: number | null
  dropRate: number | null
  avgDaysInStage: number | null
  leads: FunnelLead[]
}

interface FunnelTrend {
  thisMonth: { total: number; converted: number; conversionRate: number }
  lastMonth: { total: number; converted: number; conversionRate: number }
  change: number
}

interface DropoffReason {
  reason: string
  count: number
  percentage: number
}

interface FunnelData {
  stages: FunnelStage[]
  trend: FunnelTrend
  dropoffReasons: DropoffReason[]
  isMock: boolean
}

interface ScoreDistribution {
  green: number
  yellow: number
  red: number
}

interface Channel {
  source: string
  count: number
  percentage: number
}

interface TrendDay {
  day: string
  leads: number
}

interface DashboardData {
  totalLeads: number
  newToday: number
  hotLeads: number
  atRisk: number
  conversionRate: number
  pendingActions: number
  scoreDistribution: ScoreDistribution
  topChannels: Channel[]
  weeklyTrend: TrendDay[]
  isMock: boolean
}

// ── Source labels ─────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  instagram:  'Instagram',
  facebook:   'Facebook',
  google_ads: 'Google Ads',
  referral:   'Empfehlung',
  manual:     'Manuell',
  unknown:    'Unbekannt',
}

function sourceLabel(s: string): string {
  return SOURCE_LABELS[s] ?? s
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(): string {
  return new Date().toLocaleDateString('de-CH', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
  icon?: string
}) {
  return (
    <div className="card p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-vemo-dark-500">{label}</span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold ${accent ?? 'text-vemo-dark-900'}`}>{value}</div>
      {sub && <div className="text-xs text-vemo-dark-400">{sub}</div>}
    </div>
  )
}

function QualityGauge({ dist, total }: { dist: ScoreDistribution; total: number }) {
  const safe = total || 1
  const gPct = Math.round((dist.green / safe) * 100)
  const yPct = Math.round((dist.yellow / safe) * 100)
  const rPct = Math.round((dist.red / safe) * 100)

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-vemo-dark-800">Lead-Qualität</h3>
      </div>
      {/* Bar */}
      <div className="flex rounded-full overflow-hidden h-4 w-full bg-vemo-dark-100">
        {gPct > 0 && (
          <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${gPct}%` }} title={`Heiss: ${gPct}%`} />
        )}
        {yPct > 0 && (
          <div className="bg-yellow-400 h-full transition-all duration-500" style={{ width: `${yPct}%` }} title={`Warm: ${yPct}%`} />
        )}
        {rPct > 0 && (
          <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${rPct}%` }} title={`Kalt: ${rPct}%`} />
        )}
      </div>
      {/* Legend */}
      <div className="flex flex-col gap-1.5">
        <LegendRow color="bg-green-500"  label="Heiss ≥70" count={dist.green}  pct={gPct} />
        <LegendRow color="bg-yellow-400" label="Warm 40–69" count={dist.yellow} pct={yPct} />
        <LegendRow color="bg-red-400"    label="Kalt <40"   count={dist.red}    pct={rPct} />
      </div>
    </div>
  )
}

function LegendRow({ color, label, count, pct }: { color: string; label: string; count: number; pct: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-vemo-dark-600">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-vemo-dark-500">
        <span className="font-medium text-vemo-dark-800">{count}</span>
        <span className="text-xs">({pct}%)</span>
      </div>
    </div>
  )
}

function TopChannels({ channels }: { channels: Channel[] }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-vemo-dark-800">Top Kanäle</h3>
        <a href="/leads/channels" className="text-xs text-vemo-green-600 hover:underline">
          Attribution →
        </a>
      </div>
      {channels.length === 0 ? (
        <p className="text-sm text-vemo-dark-400">Keine Daten</p>
      ) : (
        <div className="flex flex-col gap-3">
          {channels.map((ch) => (
            <div key={ch.source} className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span className="text-vemo-dark-700 font-medium">{sourceLabel(ch.source)}</span>
                <span className="text-vemo-dark-500">{ch.count} ({ch.percentage}%)</span>
              </div>
              <div className="w-full bg-vemo-dark-100 rounded-full h-2">
                <div
                  className="bg-vemo-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${ch.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WeeklyTrend({ trend }: { trend: TrendDay[] }) {
  const max = Math.max(...trend.map((t) => t.leads), 1)
  return (
    <div className="card p-5 flex flex-col gap-4">
      <h3 className="font-semibold text-vemo-dark-800">Wöchentlicher Trend</h3>
      <div className="flex items-end gap-2 h-28">
        {trend.map((d) => {
          const heightPct = Math.round((d.leads / max) * 100)
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-vemo-dark-500 font-medium">{d.leads}</span>
              <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                <div
                  className="w-full bg-vemo-green-500 rounded-t-xs transition-all duration-500"
                  style={{ height: `${Math.max(heightPct, d.leads > 0 ? 8 : 2)}%` }}
                />
              </div>
              <span className="text-xs text-vemo-dark-400">{d.day}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PendingWidget({ count }: { count: number }) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-vemo-dark-800">Offene Follow-ups</h3>
        {count > 0 && (
          <span className="bg-red-100 text-red-700 border border-red-200 text-xs font-semibold px-2 py-0.5 rounded-full">
            {count} ausstehend
          </span>
        )}
      </div>
      {count === 0 ? (
        <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
          <span>✅</span>
          <span>Alle Leads sind aktuell — kein Follow-up nötig.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-vemo-dark-600">
            {count} Lead{count !== 1 ? 's' : ''} mit Status <em>Kontaktiert</em> oder <em>Qualifiziert</em> wurden seit mehr als 3 Tagen nicht mehr kontaktiert.
          </p>
          <a
            href="/leads?filterStatus=contacted"
            className="btn-outline text-sm self-start"
          >
            Leads ansehen →
          </a>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LeadDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  // Funnel state
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [funnelLoading, setFunnelLoading] = useState(true)
  const [drillStage, setDrillStage] = useState<FunnelStage | null>(null)

  const load = useCallback(async (range: DateRange) => {
    try {
      const res = await fetch(`/api/leads/dashboard?dateRange=${range}`)
      if (!res.ok) throw new Error('Fetch failed')
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }))
    } catch (err) {
      console.error('[dashboard] load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFunnel = useCallback(async (range: DateRange) => {
    setFunnelLoading(true)
    try {
      const res = await fetch(`/api/leads/funnel?dateRange=${range}`)
      if (!res.ok) throw new Error('Funnel fetch failed')
      setFunnel(await res.json())
    } catch (err) {
      console.error('[funnel] load error:', err)
    } finally {
      setFunnelLoading(false)
    }
  }, [])

  // Initial load + interval
  useEffect(() => {
    setLoading(true)
    load(dateRange)
    loadFunnel(dateRange)
    const interval = setInterval(() => load(dateRange), 30_000)
    return () => clearInterval(interval)
  }, [dateRange, load, loadFunnel])

  const handleFunnelExport = () => {
    if (!funnel) return
    const rows = [
      ['Stufe', 'Anzahl', 'Conversion (von vorheriger Stufe)', 'Absprungrate', 'Ø Tage in Stufe'],
      ...funnel.stages.map((s) => [
        s.label,
        s.count,
        s.conversionFromPrev != null ? `${s.conversionFromPrev}%` : '–',
        s.dropRate != null ? `${s.dropRate}%` : '–',
        s.avgDaysInStage != null ? `${s.avgDaysInStage}` : '–',
      ]),
    ]
    const csv = rows.map((r) => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'funnel-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = async (type: 'csv' | 'pdf') => {
    setExporting(type)
    try {
      const res = await fetch(`/api/reporting/export?format=${type}&type=leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRange }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `leads-export.${type}`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('[export] error:', err)
    } finally {
      setExporting(null)
    }
  }

  // ── Skeleton ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-6">
        <div className="h-10 bg-vemo-dark-100 rounded-md animate-pulse w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-28 animate-pulse bg-vemo-dark-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 h-44 animate-pulse bg-vemo-dark-100" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-vemo-dark-500">Fehler beim Laden der Dashboard-Daten.</p>
      </div>
    )
  }

  const dateRangeOptions: Array<{ value: DateRange; label: string }> = [
    { value: '7d',  label: '7 Tage' },
    { value: '30d', label: '30 Tage' },
    { value: 'all', label: 'Alle' },
  ]

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-vemo-dark-900">Lead Dashboard</h1>
          <p className="text-sm text-vemo-dark-500 mt-0.5">
            {formatDate()}
            {lastUpdated && <span className="ml-2 text-vemo-dark-400">· Zuletzt aktualisiert {lastUpdated}</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date-Range Picker */}
          <div className="flex items-center border border-vemo-dark-200 rounded-md overflow-hidden text-sm">
            {dateRangeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={`px-3 py-1.5 transition-colors duration-vemo ${
                  dateRange === opt.value
                    ? 'bg-vemo-green-500 text-white font-medium'
                    : 'bg-white text-vemo-dark-600 hover:bg-vemo-dark-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Export buttons */}
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="btn-outline text-sm"
          >
            {exporting === 'csv' ? 'Exportiere…' : '⬇ CSV'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="btn-outline text-sm"
          >
            {exporting === 'pdf' ? 'Exportiere…' : '⬇ PDF'}
          </button>
        </div>
      </div>

      {/* Mock badge */}
      {data.isMock && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md px-4 py-2 text-sm">
          Demo-Daten — verbinde eine echte Datenquelle um Live-Zahlen zu sehen.
        </div>
      )}

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={data.totalLeads}
          sub={`Zeitraum: ${dateRange === '7d' ? 'letzte 7 Tage' : dateRange === '30d' ? 'letzte 30 Tage' : 'alle'}`}
          icon="👥"
        />
        <StatCard
          label="Neu Heute"
          value={data.newToday}
          sub="Heute erfasst"
          icon="✨"
          accent={data.newToday > 0 ? 'text-vemo-green-700' : 'text-vemo-dark-900'}
        />
        <StatCard
          label="Hot Leads"
          value={data.hotLeads}
          sub="Score > 80"
          icon="🔥"
          accent={data.hotLeads > 0 ? 'text-orange-600' : 'text-vemo-dark-900'}
        />
        <StatCard
          label="At Risk"
          value={data.atRisk}
          sub="Score < 40"
          icon="⚠️"
          accent={data.atRisk > 0 ? 'text-red-600' : 'text-vemo-dark-900'}
        />
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Conversion Rate */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-vemo-dark-800">Conversion Rate</h3>
            <span className="text-lg">🎯</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-vemo-green-700">{data.conversionRate}%</span>
            <span className="text-sm text-vemo-dark-400 mb-0.5">der Leads konvertiert</span>
          </div>
          <div className="w-full bg-vemo-dark-100 rounded-full h-2">
            <div
              className="bg-vemo-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(data.conversionRate, 100)}%` }}
            />
          </div>
          <div className="text-xs text-vemo-dark-400">Ziel: 15% · Industrie Ø: 10%</div>
        </div>

        {/* Quality Gauge */}
        <QualityGauge dist={data.scoreDistribution} total={data.totalLeads} />

        {/* Top Channels */}
        <TopChannels channels={data.topChannels} />
      </div>

      {/* ── Pending Actions + Weekly Trend ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PendingWidget count={data.pendingActions} />
        <WeeklyTrend trend={data.weeklyTrend} />
      </div>

      {/* ── Funnel Analysis ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-bold text-vemo-dark-900">🔽 Funnel-Analyse & Conversion</h2>
          <button onClick={handleFunnelExport} disabled={!funnel} className="btn-outline text-xs">
            ⬇ Funnel CSV
          </button>
        </div>

        {funnelLoading ? (
          <div className="card p-6 animate-pulse bg-vemo-dark-100 h-40" />
        ) : funnel ? (
          <>
            {/* ── Funnel Chart ── */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-vemo-dark-800 mb-4">Konversionstrichter</h3>
              <div className="space-y-2">
                {funnel.stages.map((stage, i) => {
                  const maxCount = funnel.stages[0].count || 1
                  const barPct = Math.round((stage.count / maxCount) * 100)
                  const stageColors = [
                    'bg-blue-400',
                    'bg-indigo-400',
                    'bg-vemo-green-400',
                    'bg-yellow-400',
                    'bg-vemo-green-600',
                  ]
                  return (
                    <div key={stage.key}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-medium text-vemo-dark-600 w-28 shrink-0">{stage.label}</span>
                        <button
                          onClick={() => setDrillStage(drillStage?.key === stage.key ? null : stage)}
                          className="flex-1 text-left group"
                          title={`${stage.count} Leads — klicken zum Aufklappen`}
                        >
                          <div className="relative h-8 bg-vemo-dark-100 rounded-lg overflow-hidden">
                            <div
                              className={`${stageColors[i] ?? 'bg-vemo-green-400'} h-full rounded-lg transition-all duration-500 flex items-center`}
                              style={{ width: `${Math.max(barPct, 4)}%` }}
                            />
                            <span className="absolute inset-0 flex items-center px-3 text-xs font-bold text-vemo-dark-800">
                              {stage.count}
                            </span>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 w-36 shrink-0 justify-end text-xs">
                          {stage.conversionFromPrev != null && (
                            <span className="text-vemo-dark-500">
                              ↓ {stage.conversionFromPrev}%
                            </span>
                          )}
                          {stage.dropRate != null && (
                            <span className={`font-semibold ${stage.dropRate > 40 ? 'text-red-500' : 'text-vemo-dark-400'}`}>
                              ✗ {stage.dropRate}%
                            </span>
                          )}
                          {stage.avgDaysInStage != null && (
                            <span className="text-vemo-dark-400">Ø {stage.avgDaysInStage}T</span>
                          )}
                        </div>
                      </div>

                      {/* Drill-down */}
                      {drillStage?.key === stage.key && stage.leads.length > 0 && (
                        <div className="ml-31 ml-[8.5rem] bg-vemo-dark-50 rounded-lg border border-vemo-dark-200 p-3 mb-2">
                          <div className="text-xs font-semibold text-vemo-dark-700 mb-2">
                            {stage.leads.length} Lead{stage.leads.length !== 1 ? 's' : ''} in dieser Stufe
                          </div>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {stage.leads.map((lead) => (
                              <div key={lead.id} className="flex items-center justify-between text-xs text-vemo-dark-700">
                                <span className="font-medium">{lead.name}</span>
                                <div className="flex items-center gap-2 text-vemo-dark-400">
                                  <span>{lead.source}</span>
                                  <span className={`font-bold ${
                                    lead.score >= 70 ? 'text-vemo-green-600' : lead.score >= 40 ? 'text-yellow-600' : 'text-red-500'
                                  }`}>
                                    {lead.score}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <a href="/leads" className="text-xs text-vemo-green-600 hover:underline mt-2 block">
                            Alle Leads dieser Stufe ansehen →
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-vemo-dark-400">
                <span>↓ = Conversion aus vorheriger Stufe</span>
                <span>✗ = Absprungrate</span>
                <span>Ø T = Durchschnittliche Tage in Stufe</span>
              </div>
            </div>

            {/* ── Trend: Dieser Monat vs. Letzter Monat ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-vemo-dark-800 mb-4">
                  📊 Conversion-Trend (Monatsvergleich)
                </h3>
                <div className="flex items-end gap-6">
                  {[
                    { label: 'Letzter Monat', data: funnel.trend.lastMonth, color: 'bg-vemo-dark-300 text-vemo-dark-600' },
                    { label: 'Dieser Monat',  data: funnel.trend.thisMonth, color: 'bg-vemo-green-500 text-white' },
                  ].map(({ label, data, color }) => (
                    <div key={label} className="flex-1 text-center">
                      <div className="text-xs text-vemo-dark-500 mb-2">{label}</div>
                      <div className={`rounded-xl p-4 ${color}`}>
                        <div className="text-2xl font-bold">{data.conversionRate}%</div>
                        <div className="text-xs opacity-80 mt-0.5">
                          {data.converted} / {data.total} Leads
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`mt-4 text-center text-sm font-semibold ${
                  funnel.trend.change >= 0 ? 'text-vemo-green-600' : 'text-red-500'
                }`}>
                  {funnel.trend.change >= 0 ? '▲' : '▼'} {Math.abs(funnel.trend.change)} Pp. gegenüber Vormonat
                </div>
              </div>

              {/* ── Drop-off Reasons ── */}
              {funnel.dropoffReasons.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-vemo-dark-800 mb-4">❌ Absprung-Gründe</h3>
                  <div className="space-y-3">
                    {funnel.dropoffReasons.map((r) => (
                      <div key={r.reason} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-vemo-dark-700 font-medium">{r.reason}</span>
                          <span className="text-vemo-dark-500">{r.count} ({r.percentage}%)</span>
                        </div>
                        <div className="w-full bg-vemo-dark-100 rounded-full h-1.5">
                          <div
                            className="bg-red-400 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${r.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </section>

      {/* ── Export Section ── */}
      <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-vemo-dark-800">Daten exportieren</h3>
          <p className="text-sm text-vemo-dark-500 mt-0.5">Exportiere alle Lead-Daten als CSV oder PDF-Report.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="btn-primary"
          >
            {exporting === 'csv' ? 'Exportiere…' : 'CSV exportieren'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="btn-outline"
          >
            {exporting === 'pdf' ? 'Exportiere…' : 'PDF Report'}
          </button>
        </div>
      </div>

    </div>
  )
}
