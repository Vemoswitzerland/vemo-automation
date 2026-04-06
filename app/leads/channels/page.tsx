'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRange = '7d' | '30d' | 'all'

interface ChannelMetrics {
  source: string
  label: string
  icon: string
  leadCount: number
  conversionRate: number
  avgDealValue: number
  costPerLead: number
  roi: number
  thisWeek: number
  lastWeek: number
  weeklyTrend: number
  utmExample: string
}

interface ChannelsData {
  channels: ChannelMetrics[]
  top3: ChannelMetrics[]
  totalLeads: number
  isMock: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chf(n: number): string {
  return `CHF ${n.toLocaleString('de-CH', { maximumFractionDigits: 0 })}`
}

function pct(n: number): string {
  return `${n > 0 ? '+' : ''}${n}%`
}

function trendColor(n: number): string {
  if (n > 0) return 'text-green-600'
  if (n < 0) return 'text-red-500'
  return 'text-vemo-dark-400'
}

function roiColor(n: number): string {
  if (n >= 200) return 'text-green-700 font-bold'
  if (n >= 50)  return 'text-vemo-green-600 font-semibold'
  if (n > 0)    return 'text-yellow-600'
  if (n === 0)  return 'text-vemo-dark-400'
  return 'text-red-500 font-semibold'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Top3Widget({ top3, total }: { top3: ChannelMetrics[]; total: number }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-vemo-dark-900">🏆 Top-3 Kanäle nach ROI</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {top3.map((ch, i) => (
          <div
            key={ch.source}
            className={`rounded-xl border p-4 flex flex-col gap-2 ${
              i === 0
                ? 'border-yellow-300 bg-yellow-50'
                : i === 1
                ? 'border-gray-300 bg-gray-50'
                : 'border-orange-200 bg-orange-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{medals[i]}</span>
              <span className="text-lg">{ch.icon}</span>
              <span className="font-semibold text-vemo-dark-800 text-sm">{ch.label}</span>
            </div>
            <div className="flex flex-col gap-1 text-xs text-vemo-dark-600">
              <div className="flex justify-between">
                <span>Leads</span>
                <span className="font-medium text-vemo-dark-900">{ch.leadCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Conversion</span>
                <span className="font-medium text-vemo-green-700">{ch.conversionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span>Ø Deal</span>
                <span className="font-medium text-vemo-dark-900">{chf(ch.avgDealValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>ROI</span>
                <span className={roiColor(ch.roi)}>
                  {ch.roi > 0 ? `+${ch.roi}%` : ch.roi === 0 ? '—' : `${ch.roi}%`}
                </span>
              </div>
            </div>
            {/* Lead share bar */}
            <div className="mt-1">
              <div className="w-full bg-vemo-dark-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'
                  }`}
                  style={{ width: `${Math.round((ch.leadCount / (total || 1)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-vemo-dark-400 mt-0.5">
                {Math.round((ch.leadCount / (total || 1)) * 100)}% aller Leads
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeeklyTrendWidget({ channels }: { channels: ChannelMetrics[] }) {
  const sorted = [...channels].sort((a, b) => Math.abs(b.weeklyTrend) - Math.abs(a.weeklyTrend))
  return (
    <div className="card p-5 flex flex-col gap-4">
      <h2 className="font-bold text-vemo-dark-900">📅 Woche-zu-Woche Trend</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-vemo-dark-100">
              <th className="text-left py-2 pr-4 text-vemo-dark-500 font-medium">Kanal</th>
              <th className="text-right py-2 px-3 text-vemo-dark-500 font-medium">Letzte Woche</th>
              <th className="text-right py-2 px-3 text-vemo-dark-500 font-medium">Diese Woche</th>
              <th className="text-right py-2 pl-3 text-vemo-dark-500 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ch) => (
              <tr key={ch.source} className="border-b border-vemo-dark-50 hover:bg-vemo-dark-50/50 transition-colors">
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span>{ch.icon}</span>
                    <span className="font-medium text-vemo-dark-800">{ch.label}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-vemo-dark-600">{ch.lastWeek}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-vemo-dark-900">{ch.thisWeek}</td>
                <td className="py-2.5 pl-3 text-right">
                  <span className={`font-semibold ${trendColor(ch.weeklyTrend)}`}>
                    {ch.weeklyTrend > 0 ? '▲' : ch.weeklyTrend < 0 ? '▼' : '─'}{' '}
                    {ch.weeklyTrend !== 0 ? Math.abs(ch.weeklyTrend) + '%' : ''}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ChannelCard({ ch, maxLeads }: { ch: ChannelMetrics; maxLeads: number }) {
  const barPct = maxLeads > 0 ? Math.round((ch.leadCount / maxLeads) * 100) : 0
  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{ch.icon}</span>
          <div>
            <div className="font-bold text-vemo-dark-900">{ch.label}</div>
            <div className="text-xs text-vemo-dark-400 font-mono">{ch.utmExample}</div>
          </div>
        </div>
        <div className={`text-sm font-bold px-2 py-1 rounded-md ${
          ch.roi >= 100 ? 'bg-green-100 text-green-700' :
          ch.roi > 0    ? 'bg-yellow-100 text-yellow-700' :
          ch.roi === 0  ? 'bg-vemo-dark-100 text-vemo-dark-500' :
                          'bg-red-100 text-red-600'
        }`}>
          {ch.roi > 0 ? `ROI +${ch.roi}%` : ch.roi === 0 ? 'ROI —' : `ROI ${ch.roi}%`}
        </div>
      </div>

      {/* Lead volume bar */}
      <div>
        <div className="flex justify-between text-xs text-vemo-dark-500 mb-1">
          <span>{ch.leadCount} Leads</span>
          <span>{barPct}% Anteil</span>
        </div>
        <div className="w-full bg-vemo-dark-100 rounded-full h-2">
          <div
            className="bg-vemo-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(barPct, 2)}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-vemo-dark-50 rounded-lg p-3">
          <div className="text-xs text-vemo-dark-500 mb-1">Conversion Rate</div>
          <div className="text-lg font-bold text-vemo-green-700">{ch.conversionRate}%</div>
        </div>
        <div className="bg-vemo-dark-50 rounded-lg p-3">
          <div className="text-xs text-vemo-dark-500 mb-1">Ø Deal-Wert</div>
          <div className="text-lg font-bold text-vemo-dark-900">{chf(ch.avgDealValue)}</div>
        </div>
        <div className="bg-vemo-dark-50 rounded-lg p-3">
          <div className="text-xs text-vemo-dark-500 mb-1">Cost per Lead</div>
          <div className="text-lg font-bold text-vemo-dark-900">
            {ch.costPerLead > 0 ? chf(ch.costPerLead) : '—'}
          </div>
        </div>
        <div className="bg-vemo-dark-50 rounded-lg p-3">
          <div className="text-xs text-vemo-dark-500 mb-1">Trend (W/W)</div>
          <div className={`text-lg font-bold ${trendColor(ch.weeklyTrend)}`}>
            {ch.weeklyTrend > 0 ? '▲' : ch.weeklyTrend < 0 ? '▼' : '─'}{' '}
            {ch.weeklyTrend !== 0 ? Math.abs(ch.weeklyTrend) + '%' : 'Gleich'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChannelAttributionPage() {
  const [data, setData] = useState<ChannelsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  const load = useCallback(async (range: DateRange) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/channels?dateRange=${range}`)
      if (!res.ok) throw new Error('Fetch failed')
      setData(await res.json())
    } catch (err) {
      console.error('[channels] load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(dateRange)
  }, [dateRange, load])

  const dateRangeOptions: Array<{ value: DateRange; label: string }> = [
    { value: '7d',  label: '7 Tage' },
    { value: '30d', label: '30 Tage' },
    { value: 'all', label: 'Alle' },
  ]

  const maxLeads = data ? Math.max(...data.channels.map((c) => c.leadCount), 1) : 1

  // ── Skeleton ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex flex-col gap-6">
        <div className="h-10 bg-vemo-dark-100 rounded-md animate-pulse w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 h-40 animate-pulse bg-vemo-dark-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-52 animate-pulse bg-vemo-dark-100" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-vemo-dark-500">Fehler beim Laden der Channel-Daten.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <a href="/leads/dashboard" className="text-sm text-vemo-dark-400 hover:text-vemo-dark-700 transition-colors">
              ← Lead Dashboard
            </a>
          </div>
          <h1 className="text-2xl font-bold text-vemo-dark-900 mt-1">Channel-Attribution</h1>
          <p className="text-sm text-vemo-dark-500 mt-0.5">
            UTM-Tracking · ROI pro Kanal · {data.totalLeads} Leads total
          </p>
        </div>
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
      </div>

      {/* Mock badge */}
      {data.isMock && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md px-4 py-2 text-sm">
          Demo-Daten — verbinde echte UTM-Quellen & Ad-Kosten für Live-ROI-Berechnung.
        </div>
      )}

      {/* ── UTM Info Banner ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <span className="text-xl mt-0.5">🔗</span>
        <div>
          <p className="text-sm font-semibold text-blue-800">UTM-Parameter-Tracking</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Leads werden automatisch dem richtigen Kanal zugeordnet anhand von UTM-Parametern in der URL
            (z.B. <code className="bg-blue-100 px-1 rounded">utm_source=google&utm_medium=cpc</code>).
            Ohne UTM-Parameter werden Leads als „Direkt" klassifiziert.
          </p>
        </div>
      </div>

      {/* ── Top-3 Widget ── */}
      {data.top3.length > 0 && (
        <Top3Widget top3={data.top3} total={data.totalLeads} />
      )}

      {/* ── Per-Channel Cards ── */}
      <div>
        <h2 className="font-bold text-vemo-dark-900 mb-4">📊 Alle Kanäle — Detail-Metriken</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.channels.map((ch) => (
            <ChannelCard key={ch.source} ch={ch} maxLeads={maxLeads} />
          ))}
        </div>
      </div>

      {/* ── Weekly Trend ── */}
      <WeeklyTrendWidget channels={data.channels} />

      {/* ── ROI Summary Table ── */}
      <div className="card p-5 flex flex-col gap-4">
        <h2 className="font-bold text-vemo-dark-900">💰 ROI-Übersicht pro Kanal</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-vemo-dark-200">
                <th className="text-left py-2.5 pr-4 text-vemo-dark-500 font-medium">Kanal</th>
                <th className="text-right py-2.5 px-3 text-vemo-dark-500 font-medium">Leads</th>
                <th className="text-right py-2.5 px-3 text-vemo-dark-500 font-medium">Conv.</th>
                <th className="text-right py-2.5 px-3 text-vemo-dark-500 font-medium">Ø Deal</th>
                <th className="text-right py-2.5 px-3 text-vemo-dark-500 font-medium">CPL</th>
                <th className="text-right py-2.5 pl-3 text-vemo-dark-500 font-medium">ROI</th>
              </tr>
            </thead>
            <tbody>
              {data.channels.map((ch) => (
                <tr key={ch.source} className="border-b border-vemo-dark-50 hover:bg-vemo-dark-50/50 transition-colors">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span>{ch.icon}</span>
                      <span className="font-medium text-vemo-dark-800">{ch.label}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-vemo-dark-700">{ch.leadCount}</td>
                  <td className="py-2.5 px-3 text-right text-vemo-green-700 font-medium">{ch.conversionRate}%</td>
                  <td className="py-2.5 px-3 text-right text-vemo-dark-700">
                    {ch.avgDealValue > 0 ? chf(ch.avgDealValue) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-vemo-dark-700">
                    {ch.costPerLead > 0 ? chf(ch.costPerLead) : '—'}
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <span className={roiColor(ch.roi)}>
                      {ch.roi > 0 ? `+${ch.roi}%` : ch.roi === 0 ? '—' : `${ch.roi}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-vemo-dark-400">
          CPL = Cost per Lead (geschätzte Werbekosten). ROI = (Umsatz − Kosten) / Kosten × 100.
        </p>
      </div>

    </div>
  )
}
