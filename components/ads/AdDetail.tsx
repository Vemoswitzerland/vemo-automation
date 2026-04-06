'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type DayMetric = {
  date: string       // e.g. "2026-04-01"
  impressions: number
  clicks: number
  spend: number
  conversions: number
  roas: number
}

type OptimizationTip = {
  id: string
  title: string
  description: string
  action: 'scale' | 'pause' | 'new_creative' | 'audience' | 'budget'
  confidence: number // 0–1
  impact: 'high' | 'medium' | 'low'
}

type AbTestStatus = {
  id: string
  name: string
  status: 'running' | 'completed' | 'paused'
  winnerVariant: string | null
  variantLabel: string
  confidence: number | null
}

type AdDetailData = {
  id: string
  name: string
  platform: string
  status: string
  dailyBudget: number
  totalSpend: number
  roas: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  // Comparison vs account average
  roasVsAvg: number      // % delta
  ctrVsAvg: number
  cpcVsAvg: number
  // 7/30 day trends
  trend7: DayMetric[]
  trend30: DayMetric[]
  optimizationTips: OptimizationTip[]
  abTest: AbTestStatus | null
}

// ─── Mock data generator ──────────────────────────────────────────────────────

function generateTrend(days: number, baseRoas: number): DayMetric[] {
  const result: DayMetric[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const noise = 0.8 + Math.random() * 0.4
    const impressions = Math.floor(1200 * noise)
    const clicks = Math.floor(impressions * 0.028 * noise)
    const spend = Math.round(clicks * 0.45 * noise * 100) / 100
    const conversions = Math.floor(clicks * 0.05 * noise)
    const roas = spend > 0 ? Math.round((conversions * 35 / spend) * 100) / 100 : 0
    result.push({ date: dateStr, impressions, clicks, spend, conversions, roas: Math.max(0.5, roas * (baseRoas / 4)) })
  }
  return result
}

function getMockAdDetail(id: string): AdDetailData {
  const MOCK: Record<string, Partial<AdDetailData>> = {
    c1: { name: 'Frühjahr Angebote – Facebook', platform: 'facebook', status: 'active', dailyBudget: 80, totalSpend: 487.50, roas: 4.2, impressions: 48000, clicks: 1240, conversions: 67 },
    c2: { name: 'Brand Awareness – Instagram', platform: 'instagram', status: 'budget_exceeded', dailyBudget: 50, totalSpend: 312, roas: 1.8, impressions: 31000, clicks: 890, conversions: 45 },
    c3: { name: 'Google Search – Dienstleistungen', platform: 'google', status: 'active', dailyBudget: 120, totalSpend: 421, roas: 6.1, impressions: 28500, clicks: 870, conversions: 38 },
    c4: { name: 'Retargeting – TikTok', platform: 'tiktok', status: 'auto_paused', dailyBudget: 40, totalSpend: 200, roas: 0.9, impressions: 17000, clicks: 280, conversions: 12 },
  }
  const base = MOCK[id] ?? { name: `Kampagne ${id}`, platform: 'meta', status: 'active', dailyBudget: 60, totalSpend: 180, roas: 3.0, impressions: 12000, clicks: 400, conversions: 20 }
  const clicks = base.clicks ?? 400
  const impressions = base.impressions ?? 12000
  const totalSpend = base.totalSpend ?? 180
  const conversions = base.conversions ?? 20
  const roas = base.roas ?? 3.0

  const tips: OptimizationTip[] = roas >= 4
    ? [
        { id: 't1', title: 'Budget erhöhen', description: 'Dein ROAS liegt deutlich über dem Durchschnitt. Eine Budgeterhöhung um 20% könnte mehr profitable Conversions erzielen.', action: 'scale', confidence: 0.91, impact: 'high' },
        { id: 't2', title: 'A/B Test starten', description: 'Teste eine neue Kreativ-Variante, um zu prüfen ob du die CTR weiter steigern kannst.', action: 'new_creative', confidence: 0.78, impact: 'medium' },
        { id: 't3', title: 'Audience Lookalike ausweiten', description: 'Erstelle eine Lookalike Audience basierend auf deinen Top-Convertern der letzten 30 Tage.', action: 'audience', confidence: 0.72, impact: 'medium' },
      ]
    : roas < 1.5
    ? [
        { id: 't1', title: 'Kampagne pausieren', description: 'ROAS unter Break-Even. Pausieren und Creative überarbeiten, bevor weiteres Budget verbrannt wird.', action: 'pause', confidence: 0.95, impact: 'high' },
        { id: 't2', title: 'Neues Creative testen', description: 'Das aktuelle Bildmaterial zeigt niedrige Engagement-Raten. Ein frisches Creative kann die CTR verdoppeln.', action: 'new_creative', confidence: 0.85, impact: 'high' },
        { id: 't3', title: 'Zielgruppe verfeinern', description: 'Zu breites Targeting führt zu hohen Streuverlusten. Engeres Targeting auf deine Kernzielgruppe reduziert CPC.', action: 'audience', confidence: 0.80, impact: 'medium' },
        { id: 't4', title: 'Budget reduzieren', description: 'Reduziere das Tagesbudget auf 50% bis die ROAS-Optimierungen greifen.', action: 'budget', confidence: 0.88, impact: 'medium' },
      ]
    : [
        { id: 't1', title: 'Creative aktualisieren', description: 'Nach 14+ Tagen verliert das Creative an Wirkung (Ad Fatigue). Ein neues Bild/Video belebt die Performance.', action: 'new_creative', confidence: 0.82, impact: 'medium' },
        { id: 't2', title: 'Budget optimieren', description: 'Analysiere nach Wochentag: Mittwoch & Donnerstag zeigen statistisch 18% bessere ROAS in deiner Branche.', action: 'budget', confidence: 0.70, impact: 'low' },
        { id: 't3', title: 'A/B Test: Headline', description: 'Teste zwei verschiedene Headlines – oft entscheidend für CTR-Unterschiede von 30–50%.', action: 'new_creative', confidence: 0.75, impact: 'medium' },
      ]

  return {
    id,
    name: base.name ?? 'Kampagne',
    platform: base.platform ?? 'meta',
    status: base.status ?? 'active',
    dailyBudget: base.dailyBudget ?? 60,
    totalSpend,
    roas,
    impressions,
    clicks,
    conversions,
    ctr: Math.round((clicks / impressions) * 10000) / 100,
    cpc: Math.round((totalSpend / clicks) * 100) / 100,
    roasVsAvg: Math.round(((roas - 3.0) / 3.0) * 100),
    ctrVsAvg: Math.round(((clicks / impressions - 0.028) / 0.028) * 100),
    cpcVsAvg: Math.round(((totalSpend / clicks - 0.45) / 0.45) * 100),
    trend7: generateTrend(7, roas),
    trend30: generateTrend(30, roas),
    optimizationTips: tips,
    abTest: roas >= 4 && id === 'c1'
      ? { id: 'ab1', name: 'Frühjahr vs. Sommer Creative', status: 'running', winnerVariant: null, variantLabel: 'A', confidence: null }
      : null,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, unit = '', delta, positive }: { label: string; value: string | number; unit?: string; delta?: number; positive?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#282f47]">{value}<span className="text-sm font-normal text-gray-400 ml-1">{unit}</span></p>
      {delta !== undefined && (
        <p className={`text-xs mt-1 font-medium ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}% vs. Ø Konto
        </p>
      )}
    </div>
  )
}

function MiniGraph({ data, field, color }: { data: DayMetric[]; field: keyof DayMetric; color: string }) {
  const values = data.map((d) => d[field] as number)
  const max = Math.max(...values, 0.001)
  const w = 100 / data.length

  return (
    <svg viewBox={`0 0 100 40`} preserveAspectRatio="none" className="w-full h-10">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={values.map((v, i) => `${i * w + w / 2},${40 - (v / max) * 36}`).join(' ')}
      />
    </svg>
  )
}

function ImpactBadge({ impact }: { impact: 'high' | 'medium' | 'low' }) {
  const cfg = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-sky-100 text-sky-700',
  }
  const label = { high: 'Hohe Wirkung', medium: 'Mittlere Wirkung', low: 'Geringe Wirkung' }
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg[impact]}`}>{label[impact]}</span>
}

function ActionIcon({ action }: { action: OptimizationTip['action'] }) {
  const icons: Record<OptimizationTip['action'], string> = {
    scale: '📈', pause: '⏸', new_creative: '🎨', audience: '🎯', budget: '💰',
  }
  return <span>{icons[action]}</span>
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? '#7ed957' : pct >= 70 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdDetail({ id }: { id: string }) {
  const router = useRouter()
  const [data, setData] = useState<AdDetailData | null>(null)
  const [timeframe, setTimeframe] = useState<'7' | '30'>('7')
  const [editBudget, setEditBudget] = useState(false)
  const [newBudget, setNewBudget] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [budgetSaved, setBudgetSaved] = useState(false)

  useEffect(() => {
    // In production: fetch from /api/ads/[id] — currently using mock data
    setData(getMockAdDetail(id))
  }, [id])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="animate-spin h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Lade Kampagnendaten…
      </div>
    )
  }

  const trend = timeframe === '7' ? data.trend7 : data.trend30

  const platformColors: Record<string, string> = {
    facebook: '#1877F2', instagram: '#E1306C', google: '#4285F4', tiktok: '#000000',
  }
  const platformColor = platformColors[data.platform] ?? '#7ed957'

  const statusLabel: Record<string, string> = {
    active: 'Aktiv', paused: 'Pausiert', budget_exceeded: 'Budget überschritten', auto_paused: 'Auto-pausiert',
  }
  const statusColor: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700', paused: 'bg-gray-100 text-gray-600',
    budget_exceeded: 'bg-red-100 text-red-700', auto_paused: 'bg-amber-100 text-amber-700',
  }

  async function handleBudgetSave() {
    const parsed = parseFloat(newBudget)
    if (isNaN(parsed) || parsed < 0) return
    setSavingBudget(true)
    try {
      await fetch(`/api/ads/${id}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newBudget: parsed, reason: 'Manual budget edit from Ad Detail', triggeredBy: 'user' }),
      })
      setData((prev) => prev ? { ...prev, dailyBudget: parsed } : prev)
      setEditBudget(false)
      setBudgetSaved(true)
      setTimeout(() => setBudgetSaved(false), 3000)
    } finally {
      setSavingBudget(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-500 transition-colors"
          title="Zurück"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded" style={{ background: platformColor + '22', color: platformColor }}>
              {data.platform}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[data.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {statusLabel[data.status] ?? data.status}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#282f47] mt-1">{data.name}</h1>
        </div>
        <button
          onClick={() => { setEditBudget(true); setNewBudget(data.dailyBudget.toString()) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7ed957] text-white text-sm font-semibold hover:bg-[#6bc948] transition-colors shadow-sm"
        >
          ✏️ Bearbeiten
        </button>
      </div>

      {budgetSaved && (
        <div className="mb-4 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm font-medium">
          ✅ Budget erfolgreich gespeichert
        </div>
      )}

      {/* Budget Editor */}
      {editBudget && (
        <div className="mb-6 bg-white border border-[#7ed957]/30 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-[#282f47] mb-3">💰 Tagesbudget anpassen</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-[#7ed957]"
              placeholder="CHF"
              min="0"
              step="1"
            />
            <button
              onClick={handleBudgetSave}
              disabled={savingBudget}
              className="px-4 py-2 bg-[#7ed957] text-white rounded-lg text-sm font-semibold hover:bg-[#6bc948] disabled:opacity-60 transition-colors"
            >
              {savingBudget ? 'Speichere…' : 'Speichern'}
            </button>
            <button onClick={() => setEditBudget(false)} className="px-4 py-2 text-gray-500 rounded-lg text-sm hover:bg-gray-100 transition-colors">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <MetricCard label="ROAS" value={data.roas} delta={data.roasVsAvg} />
        <MetricCard label="Spend" value={`CHF ${data.totalSpend.toFixed(0)}`} />
        <MetricCard label="Tagesbudget" value={`CHF ${data.dailyBudget}`} />
        <MetricCard label="CTR" value={data.ctr} unit="%" delta={data.ctrVsAvg} />
        <MetricCard label="CPC" value={`CHF ${data.cpc}`} delta={-data.cpcVsAvg} />
        <MetricCard label="Conversions" value={data.conversions} />
      </div>

      {/* Impression + Click overview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Impressionen</p>
          <p className="text-xl font-bold text-[#282f47]">{data.impressions.toLocaleString('de-CH')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Klicks</p>
          <p className="text-xl font-bold text-[#282f47]">{data.clicks.toLocaleString('de-CH')}</p>
        </div>
      </div>

      {/* Performance Graph */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#282f47]">📊 Performance-Verlauf</h2>
          <div className="flex gap-1">
            {(['7', '30'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  timeframe === tf ? 'bg-[#7ed957] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {tf} Tage
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">ROAS</p>
            <MiniGraph data={trend} field="roas" color="#7ed957" />
            <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
              <span>{trend[0]?.date?.slice(5)}</span>
              <span>{trend[trend.length - 1]?.date?.slice(5)}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Spend (CHF)</p>
            <MiniGraph data={trend} field="spend" color="#282f47" />
            <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
              <span>{trend[0]?.date?.slice(5)}</span>
              <span>{trend[trend.length - 1]?.date?.slice(5)}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Conversions</p>
            <MiniGraph data={trend} field="conversions" color="#6366f1" />
            <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
              <span>{trend[0]?.date?.slice(5)}</span>
              <span>{trend[trend.length - 1]?.date?.slice(5)}</span>
            </div>
          </div>
        </div>

        {/* Daily breakdown table (last 7 days always) */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs text-gray-500">
            <thead>
              <tr className="border-b border-gray-100">
                {['Datum', 'Impressionen', 'Klicks', 'Spend', 'Conv.', 'ROAS'].map((h) => (
                  <th key={h} className="text-left pb-1.5 font-medium pr-4 last:pr-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.trend7.map((row) => (
                <tr key={row.date} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 pr-4 font-medium">{row.date.slice(5)}</td>
                  <td className="py-1.5 pr-4">{row.impressions.toLocaleString('de-CH')}</td>
                  <td className="py-1.5 pr-4">{row.clicks}</td>
                  <td className="py-1.5 pr-4">CHF {row.spend.toFixed(2)}</td>
                  <td className="py-1.5 pr-4">{row.conversions}</td>
                  <td className="py-1.5 font-semibold" style={{ color: row.roas >= 3 ? '#7ed957' : row.roas < 1.5 ? '#ef4444' : '#f59e0b' }}>
                    {row.roas.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* A/B Test Status */}
      {data.abTest && (
        <div className="bg-white rounded-xl border border-[#7ed957]/30 p-5 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-[#282f47] mb-3">🧪 A/B Test Status</h2>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-medium text-[#282f47] text-sm">{data.abTest.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Variante {data.abTest.variantLabel} · Status: <span className="font-medium text-[#282f47]">{data.abTest.status === 'running' ? '🟢 Läuft' : data.abTest.status}</span></p>
            </div>
            {data.abTest.winnerVariant ? (
              <span className="text-xs px-3 py-1 bg-[#7ed957]/20 text-emerald-700 rounded-full font-semibold">
                🏆 Gewinner: Variante {data.abTest.winnerVariant}
              </span>
            ) : (
              <span className="text-xs px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                ⏳ Noch kein Gewinner
              </span>
            )}
          </div>
        </div>
      )}

      {/* AI Optimization Tips */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-[#282f47]">🤖 KI-Optimierungstipps</h2>
          <span className="text-[10px] bg-[#7ed957]/10 text-[#7ed957] px-2 py-0.5 rounded-full font-semibold">AI-generiert</span>
        </div>

        <div className="space-y-4">
          {data.optimizationTips.map((tip, idx) => (
            <div key={tip.id} className="border border-gray-100 rounded-xl p-4 hover:border-[#7ed957]/30 hover:bg-[#f8fdf5] transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5"><ActionIcon action={tip.action} /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs text-gray-400 font-medium">#{idx + 1}</span>
                    <p className="font-semibold text-[#282f47] text-sm">{tip.title}</p>
                    <ImpactBadge impact={tip.impact} />
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-2">{tip.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">Konfidenz:</span>
                    <div className="flex-1 max-w-[140px]">
                      <ConfidenceBar value={tip.confidence} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-gray-300 mt-4">
          * KI-Empfehlungen basieren auf Kampagnen-Metriken und Branchenbenchmarks. Kein API-Key für Echtzeit-Daten konfiguriert — Analyse auf Mock-Basis.
        </p>
      </div>
    </div>
  )
}
