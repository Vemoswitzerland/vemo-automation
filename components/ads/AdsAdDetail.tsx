'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type DayMetric = {
  date: string   // e.g. "06.04"
  spend: number
  clicks: number
  conversions: number
  roas: number
}

type OptimizationTip = {
  id: string
  category: 'budget' | 'audience' | 'creative' | 'timing' | 'bidding'
  title: string
  description: string
  confidence: number   // 0–100
  action: 'scale' | 'pause' | 'test_creative' | 'adjust_audience' | 'adjust_budget' | 'info'
  impact: 'high' | 'medium' | 'low'
}

type AbTestStatus = {
  id: string
  name: string
  status: 'running' | 'completed' | 'paused'
  winner: string | null
  confidenceLevel: number | null
  variants: { label: string; roas: number; status: string }[]
}

type AdDetailData = {
  id: string
  name: string
  platform: 'facebook' | 'instagram' | 'google' | 'tiktok'
  status: 'active' | 'paused' | 'budget_exceeded' | 'auto_paused'
  dailyBudget: number
  totalBudget: number
  spend: number
  revenue: number
  roas: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  cpa: number
  accountAvgRoas: number
  accountAvgCtr: number
  startDate: string
  endDate: string | null
  history: DayMetric[]
  tips: OptimizationTip[]
  abTest: AbTestStatus | null
}

// ─── Mock Data Factory ────────────────────────────────────────────────────────

function buildMockDetail(id: string): AdDetailData {
  const campaigns: Record<string, Partial<AdDetailData>> = {
    c1: {
      name: 'Frühjahr Angebote – Facebook',
      platform: 'facebook',
      status: 'active',
      dailyBudget: 80,
      spend: 61.5,
      revenue: 258.3,
      roas: 4.2,
      impressions: 12400,
      clicks: 340,
      ctr: 2.74,
      cpc: 0.18,
      conversions: 18,
      cpa: 3.42,
    },
    c2: {
      name: 'Brand Awareness – Instagram',
      platform: 'instagram',
      status: 'budget_exceeded',
      dailyBudget: 50,
      spend: 52.3,
      revenue: 94.14,
      roas: 1.8,
      impressions: 9800,
      clicks: 210,
      ctr: 2.14,
      cpc: 0.25,
      conversions: 4,
      cpa: 13.08,
    },
    c3: {
      name: 'Google Search – Dienstleistungen',
      platform: 'google',
      status: 'active',
      dailyBudget: 120,
      spend: 44.0,
      revenue: 268.4,
      roas: 6.1,
      impressions: 4200,
      clicks: 490,
      ctr: 11.67,
      cpc: 0.09,
      conversions: 31,
      cpa: 1.42,
    },
    c4: {
      name: 'Retargeting – TikTok',
      platform: 'tiktok',
      status: 'auto_paused',
      dailyBudget: 40,
      spend: 38.0,
      revenue: 34.2,
      roas: 0.9,
      impressions: 22000,
      clicks: 180,
      ctr: 0.82,
      cpc: 0.21,
      conversions: 2,
      cpa: 19.0,
    },
  }

  const base = campaigns[id] ?? campaigns['c1']
  const today = new Date()
  const history: DayMetric[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    const variance = 0.7 + Math.random() * 0.6
    const spend = Math.round((base.spend ?? 50) * 0.8 * variance * 100) / 100
    const roas = Math.round((base.roas ?? 2) * variance * 100) / 100
    return {
      date: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`,
      spend,
      clicks: Math.round((base.clicks ?? 200) * variance),
      conversions: Math.max(0, Math.round((base.conversions ?? 10) * variance)),
      roas,
    }
  })

  const tips = buildTips(base.roas ?? 2, base.ctr ?? 2, base.platform ?? 'facebook')
  const abTest =
    id === 'c1'
      ? {
          id: 'abt-c1',
          name: 'Headline Test — Frühjahr',
          status: 'running' as const,
          winner: null,
          confidenceLevel: 72,
          variants: [
            { label: 'A', roas: 3.8, status: 'active' },
            { label: 'B', roas: 4.6, status: 'active' },
          ],
        }
      : id === 'c3'
      ? {
          id: 'abt-c3',
          name: 'CTA Varianten',
          status: 'completed' as const,
          winner: 'B',
          confidenceLevel: 96,
          variants: [
            { label: 'A', roas: 4.2, status: 'loser' },
            { label: 'B', roas: 6.1, status: 'winner' },
          ],
        }
      : null

  return {
    id,
    name: base.name ?? 'Unbekannte Kampagne',
    platform: base.platform ?? 'facebook',
    status: base.status ?? 'active',
    dailyBudget: base.dailyBudget ?? 50,
    totalBudget: (base.dailyBudget ?? 50) * 30,
    spend: base.spend ?? 0,
    revenue: base.revenue ?? 0,
    roas: base.roas ?? 0,
    impressions: base.impressions ?? 0,
    clicks: base.clicks ?? 0,
    ctr: base.ctr ?? 0,
    cpc: base.cpc ?? 0,
    conversions: base.conversions ?? 0,
    cpa: base.cpa ?? 0,
    accountAvgRoas: 3.1,
    accountAvgCtr: 2.8,
    startDate: '2026-03-01',
    endDate: null,
    history,
    tips,
    abTest,
  }
}

function buildTips(
  roas: number,
  ctr: number,
  platform: string
): OptimizationTip[] {
  const tips: OptimizationTip[] = []

  if (roas >= 4) {
    tips.push({
      id: 't1',
      category: 'budget',
      title: 'Budget erhöhen — starker ROAS',
      description: `Dein ROAS von ${roas.toFixed(1)}x liegt deutlich über dem Zielwert. Erhöhe das Tagesbudget um 20–30 %, um mehr profitable Conversions zu erzielen.`,
      confidence: 88,
      action: 'scale',
      impact: 'high',
    })
  } else if (roas < 1.5) {
    tips.push({
      id: 't1',
      category: 'budget',
      title: 'Kampagne pausieren oder Budget reduzieren',
      description: `ROAS von ${roas.toFixed(1)}x ist unter dem Break-even-Punkt (1.0). Pausiere die Kampagne oder reduziere das Budget, bis das Creative überarbeitet wurde.`,
      confidence: 92,
      action: 'pause',
      impact: 'high',
    })
  }

  if (ctr < 1.5) {
    tips.push({
      id: 't2',
      category: 'creative',
      title: 'Creative testen — niedrige CTR',
      description: `Die Click-Through-Rate von ${ctr.toFixed(2)} % liegt unter dem Benchmark (${platform === 'google' ? '5' : '1.5'} %). Teste neue Bilder, Videos oder Texte.`,
      confidence: 81,
      action: 'test_creative',
      impact: 'medium',
    })
  }

  if (platform === 'facebook' || platform === 'instagram') {
    tips.push({
      id: 't3',
      category: 'audience',
      title: 'Lookalike-Audience aufbauen',
      description: 'Basierend auf deinen bisherigen Conversions: Erstelle eine Lookalike-Audience (1–3 %) für Meta, um ähnliche Nutzer zu erreichen.',
      confidence: 74,
      action: 'adjust_audience',
      impact: 'medium',
    })
  }

  if (platform === 'google') {
    tips.push({
      id: 't4',
      category: 'bidding',
      title: 'Auf Ziel-CPA umstellen',
      description: 'Mit genügend Conversion-Daten (> 30) empfiehlt Google Smart Bidding mit Ziel-CPA. Das kann die Effizienz um 10–15 % steigern.',
      confidence: 68,
      action: 'info',
      impact: 'medium',
    })
  }

  tips.push({
    id: 't5',
    category: 'timing',
    title: 'Optimale Schaltzeiten prüfen',
    description: 'Die meisten Conversions in diesem Account entstehen zwischen 18:00–22:00 Uhr. Aktiviere Ad-Scheduling für diese Zeitfenster.',
    confidence: 62,
    action: 'adjust_budget',
    impact: 'low',
  })

  return tips.slice(0, 5)
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-700',
  instagram: 'bg-pink-100 text-pink-700',
  google: 'bg-red-100 text-red-700',
  tiktok: 'bg-purple-100 text-purple-700',
}
const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘', instagram: '📸', google: '🔍', tiktok: '🎵',
}
const ACTION_ICONS: Record<string, string> = {
  scale: '📈', pause: '⏸️', test_creative: '🎨', adjust_audience: '👥', adjust_budget: '💰', info: '💡',
}
const IMPACT_COLOR: Record<string, string> = {
  high: 'text-vemo-green-700 bg-vemo-green-100',
  medium: 'text-yellow-700 bg-yellow-100',
  low: 'text-gray-600 bg-gray-100',
}

function MetricCard({ label, value, sub, compare }: { label: string; value: string; sub?: string; compare?: { label: string; better: boolean } }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-vemo-dark-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {compare && (
        <p className={`text-xs mt-1 font-medium ${compare.better ? 'text-vemo-green-700' : 'text-red-600'}`}>
          {compare.better ? '▲' : '▼'} {compare.label}
        </p>
      )}
    </div>
  )
}

function MiniGraph({ history, field, color }: { history: DayMetric[]; field: keyof DayMetric; color: string }) {
  const values = history.map((h) => Number(h[field]))
  const max = Math.max(...values, 0.01)
  const min = Math.min(...values)
  const H = 64
  const W = 100

  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / (max - min + 0.01)) * H}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function FullGraph({ history, range }: { history: DayMetric[]; range: 7 | 30 }) {
  const data = range === 7 ? history.slice(-7) : history
  const maxSpend = Math.max(...data.map((d) => d.spend), 1)
  const barW = 100 / data.length

  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-end gap-1 h-32">
        {data.map((d, i) => {
          const pct = (d.spend / maxSpend) * 100
          const roasColor = d.roas >= 3.5 ? '#7ed957' : d.roas >= 1.5 ? '#eab308' : '#ef4444'
          return (
            <div key={i} className="flex flex-col items-center flex-1 gap-0.5 group relative">
              <div
                className="w-full rounded-t transition-all"
                style={{ height: `${pct}%`, minHeight: 4, backgroundColor: roasColor }}
              />
              <p className="text-[9px] text-gray-400 rotate-90 mt-1 whitespace-nowrap">{d.date}</p>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10">
                CHF {d.spend} | ROAS {d.roas}x | {d.conversions} Conv.
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400">
        <span>Ausgaben ({range} Tage)</span>
        <span className="flex gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#7ed957] inline-block" /> ROAS ≥ 3.5</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-400 inline-block" /> 1.5–3.5</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> &lt; 1.5</span>
        </span>
      </div>
    </div>
  )
}

function ConfidenceBadge({ value }: { value: number }) {
  const color = value >= 80 ? 'text-vemo-green-700 bg-vemo-green-100' : value >= 60 ? 'text-yellow-700 bg-yellow-100' : 'text-gray-600 bg-gray-100'
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {value}% Konfidenz
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdsAdDetail({
  campaignId,
  onBack,
}: {
  campaignId: string
  onBack?: () => void
}) {
  const [graphRange, setGraphRange] = useState<7 | 30>(7)
  const [editMode, setEditMode] = useState(false)
  const [budget, setBudget] = useState<number | null>(null)

  const ad = buildMockDetail(campaignId)
  const displayBudget = budget ?? ad.dailyBudget

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: 'Aktiv', color: 'bg-vemo-green-100 text-vemo-green-700' },
    paused: { label: 'Pausiert', color: 'bg-gray-100 text-gray-600' },
    budget_exceeded: { label: 'Budget überschritten', color: 'bg-red-100 text-red-700' },
    auto_paused: { label: 'Auto-Pausiert', color: 'bg-orange-100 text-orange-700' },
  }

  const roasVsAvg = ad.roas - ad.accountAvgRoas
  const ctrVsAvg = ad.ctr - ad.accountAvgCtr

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="mt-1 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Zurück"
          >
            ← Zurück
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${PLATFORM_COLORS[ad.platform]}`}>
              {PLATFORM_ICONS[ad.platform]} {ad.platform.charAt(0).toUpperCase() + ad.platform.slice(1)}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[ad.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
              {STATUS_CONFIG[ad.status]?.label ?? ad.status}
            </span>
            {ad.abTest && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                A/B Test {ad.abTest.status === 'running' ? '🔴 live' : '✅ abgeschlossen'}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-vemo-dark-900 truncate">{ad.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestartet: {ad.startDate} {ad.endDate ? `· Endet: ${ad.endDate}` : '· Läuft unbegrenzt'}
          </p>
        </div>
        {/* Edit / Save */}
        <div className="flex gap-2 shrink-0">
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={() => { setEditMode(false) }}
                className="px-3 py-1.5 text-sm bg-vemo-green-500 text-white rounded-lg hover:bg-vemo-green-600 font-medium"
              >
                Speichern
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
            >
              ✏️ Bearbeiten
            </button>
          )}
        </div>
      </div>

      {/* Edit Panel */}
      {editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">Kampagne bearbeiten</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tagesbudget (CHF)</label>
              <input
                type="number"
                min={1}
                value={displayBudget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Status</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="active">Aktiv</option>
                <option value="paused">Pausieren</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Budget-Änderungen werden über <code className="bg-white px-1 rounded">PATCH /api/ads/{'{id}'}/budget</code> gespeichert und im Audit-Log protokolliert.
          </p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="ROAS"
          value={`${ad.roas.toFixed(1)}x`}
          compare={{
            label: `${roasVsAvg >= 0 ? '+' : ''}${roasVsAvg.toFixed(1)}x vs. Ø Account`,
            better: roasVsAvg >= 0,
          }}
        />
        <MetricCard
          label="Ausgaben"
          value={`CHF ${ad.spend.toLocaleString('de-CH', { minimumFractionDigits: 2 })}`}
          sub={`von CHF ${displayBudget}/Tag`}
        />
        <MetricCard
          label="Conversions"
          value={String(ad.conversions)}
          sub={`CPA: CHF ${ad.cpa.toFixed(2)}`}
        />
        <MetricCard
          label="Impressionen"
          value={ad.impressions.toLocaleString('de-CH')}
          sub={`CTR: ${ad.ctr.toFixed(2)} %`}
          compare={{
            label: `${ctrVsAvg >= 0 ? '+' : ''}${ctrVsAvg.toFixed(2)} % vs. Ø`,
            better: ctrVsAvg >= 0,
          }}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Klicks" value={ad.clicks.toLocaleString('de-CH')} sub={`CPC: CHF ${ad.cpc.toFixed(2)}`} />
        <MetricCard label="Umsatz (geschätzt)" value={`CHF ${ad.revenue.toLocaleString('de-CH', { minimumFractionDigits: 2 })}`} />
        <MetricCard label="Account-Ø ROAS" value={`${ad.accountAvgRoas.toFixed(1)}x`} sub="Alle aktiven Kampagnen" />
      </div>

      {/* Performance Graph */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-vemo-dark-900">Performance-Verlauf</h3>
          <div className="flex gap-1">
            {([7, 30] as const).map((r) => (
              <button
                key={r}
                onClick={() => setGraphRange(r)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  graphRange === r
                    ? 'bg-vemo-dark-900 text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {r} Tage
              </button>
            ))}
          </div>
        </div>
        <FullGraph history={ad.history} range={graphRange} />

        {/* Mini Trend Lines */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
          {[
            { label: 'ROAS', field: 'roas' as const, color: '#7ed957' },
            { label: 'Klicks', field: 'clicks' as const, color: '#60a5fa' },
            { label: 'Conversions', field: 'conversions' as const, color: '#f59e0b' },
          ].map(({ label, field, color }) => (
            <div key={field}>
              <p className="text-xs text-gray-500 mb-1">{label} Trend</p>
              <MiniGraph history={ad.history.slice(-14)} field={field} color={color} />
            </div>
          ))}
        </div>
      </div>

      {/* A/B Test Status */}
      {ad.abTest && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-vemo-dark-900">A/B Test</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              ad.abTest.status === 'running' ? 'bg-blue-100 text-blue-700' :
              ad.abTest.status === 'completed' ? 'bg-vemo-green-100 text-vemo-green-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {ad.abTest.status === 'running' ? '🔴 Läuft' : ad.abTest.status === 'completed' ? '✅ Abgeschlossen' : '⏸ Pausiert'}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-3">{ad.abTest.name}</p>
          {ad.abTest.confidenceLevel !== null && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Statistische Konfidenz</span>
                <span className="font-medium">{ad.abTest.confidenceLevel}% / 95% Ziel</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${ad.abTest.confidenceLevel >= 95 ? 'bg-vemo-green-500' : 'bg-yellow-400'}`}
                  style={{ width: `${Math.min(ad.abTest.confidenceLevel, 100)}%` }}
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {ad.abTest.variants.map((v) => (
              <div
                key={v.label}
                className={`rounded-lg border p-3 ${
                  v.status === 'winner' ? 'border-vemo-green-300 bg-vemo-green-50' :
                  v.status === 'loser' ? 'border-red-200 bg-red-50' :
                  'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm">Variante {v.label}</span>
                  {v.status === 'winner' && <span className="text-xs text-vemo-green-700 font-medium">🏆 Gewinner</span>}
                  {v.status === 'loser' && <span className="text-xs text-red-600 font-medium">❌ Verlierer</span>}
                </div>
                <p className="text-lg font-bold text-vemo-dark-900">{v.roas.toFixed(1)}x ROAS</p>
              </div>
            ))}
          </div>
          {ad.abTest.winner && (
            <div className="mt-3 p-3 bg-vemo-green-50 border border-vemo-green-200 rounded-lg text-sm text-vemo-green-800">
              ✅ Gewinner: Variante <strong>{ad.abTest.winner}</strong> — Budget wurde automatisch um 20 % erhöht.
            </div>
          )}
        </div>
      )}

      {/* Optimization Tips */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold text-vemo-dark-900">KI-Optimierungstipps</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {ad.tips.length} Empfehlungen
          </span>
        </div>
        <div className="space-y-3">
          {ad.tips.map((tip) => (
            <div key={tip.id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{ACTION_ICONS[tip.action]}</span>
                  <span className="font-medium text-sm text-vemo-dark-900">{tip.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${IMPACT_COLOR[tip.impact]}`}>
                    {tip.impact === 'high' ? 'Hoher Impact' : tip.impact === 'medium' ? 'Mittlerer Impact' : 'Niedriger Impact'}
                  </span>
                  <ConfidenceBadge value={tip.confidence} />
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{tip.description}</p>
              {tip.action !== 'info' && (
                <button className="mt-3 text-xs font-medium text-vemo-green-700 hover:text-vemo-green-800 transition-colors">
                  Aktion durchführen →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
