'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type AdCampaign = {
  id: string
  name: string
  platform: 'facebook' | 'instagram' | 'google' | 'tiktok'
  status: 'active' | 'paused' | 'budget_exceeded' | 'auto_paused'
  dailyBudget: number
  currentSpend: number
  roas: number
  impressions: number
  clicks: number
  conversions: number
}

type AutoScalingRule = {
  id: string
  type: 'scale_up' | 'scale_down' | 'pause'
  condition: string
  threshold: number
  action: string
  enabled: boolean
}

type BudgetHistoryEntry = {
  id: string
  campaignId: string
  campaignName: string
  timestamp: string
  changeType: 'manual' | 'auto_scale' | 'auto_pause' | 'alert'
  oldBudget: number | null
  newBudget: number | null
  reason: string
}

type Alert = {
  id: string
  campaignId: string
  campaignName: string
  type: 'over_budget' | 'low_roas' | 'low_performance' | 'auto_scaled' | 'auto_paused'
  message: string
  timestamp: string
  dismissed: boolean
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CAMPAIGNS: AdCampaign[] = [
  {
    id: 'c1',
    name: 'Frühjahr Angebote – Facebook',
    platform: 'facebook',
    status: 'active',
    dailyBudget: 80,
    currentSpend: 61.5,
    roas: 4.2,
    impressions: 12400,
    clicks: 340,
    conversions: 18,
  },
  {
    id: 'c2',
    name: 'Brand Awareness – Instagram',
    platform: 'instagram',
    status: 'budget_exceeded',
    dailyBudget: 50,
    currentSpend: 52.3,
    roas: 1.8,
    impressions: 9800,
    clicks: 210,
    conversions: 4,
  },
  {
    id: 'c3',
    name: 'Google Search – Dienstleistungen',
    platform: 'google',
    status: 'active',
    dailyBudget: 120,
    currentSpend: 44.0,
    roas: 6.1,
    impressions: 4200,
    clicks: 490,
    conversions: 31,
  },
  {
    id: 'c4',
    name: 'Retargeting – TikTok',
    platform: 'tiktok',
    status: 'auto_paused',
    dailyBudget: 40,
    currentSpend: 38.0,
    roas: 0.9,
    impressions: 22000,
    clicks: 180,
    conversions: 2,
  },
]

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘',
  instagram: '📸',
  google: '🔍',
  tiktok: '🎵',
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-700 border-blue-200',
  instagram: 'bg-pink-100 text-pink-700 border-pink-200',
  google: 'bg-red-100 text-red-700 border-red-200',
  tiktok: 'bg-purple-100 text-purple-700 border-purple-200',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:          { label: 'Aktiv',           color: 'bg-vemo-green-100 text-vemo-green-700 border-vemo-green-200' },
  paused:          { label: 'Pausiert',        color: 'bg-gray-100 text-gray-600 border-gray-200' },
  budget_exceeded: { label: 'Budget überschritten', color: 'bg-red-100 text-red-700 border-red-200' },
  auto_paused:     { label: 'Auto-Pausiert',   color: 'bg-orange-100 text-orange-700 border-orange-200' },
}

const INITIAL_RULES: AutoScalingRule[] = [
  {
    id: 'r1',
    type: 'scale_up',
    condition: 'ROAS > Schwellenwert',
    threshold: 3.5,
    action: 'Budget +20%',
    enabled: true,
  },
  {
    id: 'r2',
    type: 'scale_down',
    condition: 'ROAS < Schwellenwert',
    threshold: 1.5,
    action: 'Budget -15%',
    enabled: true,
  },
  {
    id: 'r3',
    type: 'pause',
    condition: 'ROAS < Schwellenwert',
    threshold: 1.0,
    action: 'Kampagne pausieren',
    enabled: true,
  },
]

const MOCK_HISTORY: BudgetHistoryEntry[] = [
  { id: 'h1', campaignId: 'c3', campaignName: 'Google Search – Dienstleistungen', timestamp: '2026-04-06T09:15:00Z', changeType: 'auto_scale', oldBudget: 100, newBudget: 120, reason: 'ROAS > 3.5 → Budget +20%' },
  { id: 'h2', campaignId: 'c4', campaignName: 'Retargeting – TikTok', timestamp: '2026-04-06T08:45:00Z', changeType: 'auto_pause', oldBudget: 40, newBudget: null, reason: 'ROAS < 1.0 → Kampagne auto-pausiert' },
  { id: 'h3', campaignId: 'c1', campaignName: 'Frühjahr Angebote – Facebook', timestamp: '2026-04-05T17:30:00Z', changeType: 'manual', oldBudget: 60, newBudget: 80, reason: 'Manuelle Erhöhung durch Cyrill' },
  { id: 'h4', campaignId: 'c2', campaignName: 'Brand Awareness – Instagram', timestamp: '2026-04-05T14:00:00Z', changeType: 'alert', oldBudget: 50, newBudget: null, reason: 'Budget-Überschreitung erkannt' },
]

const MOCK_ALERTS: Alert[] = [
  { id: 'a1', campaignId: 'c2', campaignName: 'Brand Awareness – Instagram', type: 'over_budget', message: 'Tagesbudget von CHF 50 überschritten (CHF 52.30)', timestamp: '2026-04-06T11:20:00Z', dismissed: false },
  { id: 'a2', campaignId: 'c4', campaignName: 'Retargeting – TikTok', type: 'auto_paused', message: 'Kampagne automatisch pausiert wegen ROAS < 1.0', timestamp: '2026-04-06T08:45:00Z', dismissed: false },
  { id: 'a3', campaignId: 'c3', campaignName: 'Google Search – Dienstleistungen', type: 'auto_scaled', message: 'Budget automatisch auf CHF 120 erhöht (ROAS > 3.5)', timestamp: '2026-04-06T09:15:00Z', dismissed: false },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCHF(n: number) {
  return `CHF ${n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function spendPct(campaign: AdCampaign) {
  return Math.min((campaign.currentSpend / campaign.dailyBudget) * 100, 100)
}

function roasColor(roas: number) {
  if (roas >= 3.5) return 'text-vemo-green-700'
  if (roas >= 1.5) return 'text-yellow-600'
  return 'text-red-600'
}

function alertIcon(type: Alert['type']) {
  switch (type) {
    case 'over_budget': return '💸'
    case 'low_roas': return '📉'
    case 'low_performance': return '⚠️'
    case 'auto_scaled': return '📈'
    case 'auto_paused': return '⏸️'
    default: return '🔔'
  }
}

function historyIcon(type: BudgetHistoryEntry['changeType']) {
  switch (type) {
    case 'manual': return '✏️'
    case 'auto_scale': return '🤖'
    case 'auto_pause': return '⏸️'
    case 'alert': return '🚨'
  }
}

function formatRelativeTime(isoString: string) {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffH = Math.floor(diffMs / 3600000)
  const diffM = Math.floor(diffMs / 60000)
  if (diffH > 24) return `vor ${Math.floor(diffH / 24)}T`
  if (diffH > 0) return `vor ${diffH}h`
  return `vor ${diffM}m`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdsDashboard() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(MOCK_CAMPAIGNS)
  const [rules, setRules] = useState<AutoScalingRule[]>(INITIAL_RULES)
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS)
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'history' | 'forecast'>('overview')
  const [overrideCampaignId, setOverrideCampaignId] = useState<string | null>(null)
  const [overrideBudget, setOverrideBudget] = useState('')
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

  // ── Aggregates ──
  const totalDailyBudget = campaigns.reduce((s, c) => s + c.dailyBudget, 0)
  const totalSpend = campaigns.reduce((s, c) => s + c.currentSpend, 0)
  const avgROAS = campaigns.filter(c => c.status === 'active').reduce((s, c) => s + c.roas, 0) / campaigns.filter(c => c.status === 'active').length
  const activeCount = campaigns.filter(c => c.status === 'active').length
  const alertCount = alerts.filter(a => !a.dismissed).length

  // ── Actions ──
  function dismissAlert(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a))
  }

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  function updateRuleThreshold(id: string, value: number) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, threshold: value } : r))
  }

  function applyBudgetOverride(campaignId: string) {
    const newBudget = parseFloat(overrideBudget)
    if (isNaN(newBudget) || newBudget <= 0) return
    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, dailyBudget: newBudget } : c))
    setOverrideCampaignId(null)
    setOverrideBudget('')
  }

  function toggleCampaignPause(campaignId: string) {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== campaignId) return c
      return { ...c, status: c.status === 'active' ? 'paused' : 'active' }
    }))
  }

  // ── Forecast ──
  const daysInMonth = 30
  const dayOfMonth = 6
  const dailyAvgSpend = totalSpend / dayOfMonth
  const forecastMonthEnd = dailyAvgSpend * daysInMonth
  const forecastBudgetMonthly = totalDailyBudget * daysInMonth
  const forecastPct = (forecastMonthEnd / forecastBudgetMonthly) * 100

  const undismissedAlerts = alerts.filter(a => !a.dismissed)

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📊</span>
            <h1 className="text-2xl font-bold text-vemo-dark-900">Ads-Modul</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-200">🔌 Mock-Daten</span>
          </div>
          <p className="text-vemo-dark-500 text-sm">Budget-Verwaltung, Alerts & Auto-Scaling für alle Werbekampagnen</p>
          <p className="text-xs text-blue-500 mt-1">
            Sobald <code className="bg-blue-50 px-1 rounded">ADS_API_KEY</code> (Meta / Google Ads) gesetzt ist, werden echte Kampagnendaten geladen.
          </p>
        </div>
      </div>

      {/* Active Alerts Banner */}
      {undismissedAlerts.length > 0 && (
        <div className="space-y-2">
          {undismissedAlerts.map(alert => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-md border text-sm ${
                alert.type === 'over_budget' || alert.type === 'auto_paused'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-vemo-green-100 border-vemo-green-200'
              }`}
            >
              <span className="text-base flex-shrink-0">{alertIcon(alert.type)}</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-vemo-dark-800">{alert.campaignName}:</span>{' '}
                <span className="text-vemo-dark-600">{alert.message}</span>
                <span className="text-xs text-vemo-dark-400 ml-2">{formatRelativeTime(alert.timestamp)}</span>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-vemo-dark-400 hover:text-vemo-dark-700 text-xs flex-shrink-0 px-2 py-1 rounded border border-transparent hover:border-vemo-dark-200"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tages-Budget gesamt', value: formatCHF(totalDailyBudget), icon: '💰' },
          { label: 'Ausgaben heute', value: formatCHF(totalSpend), icon: '📤', sub: `${Math.round((totalSpend / totalDailyBudget) * 100)}% genutzt` },
          { label: 'Ø ROAS (aktiv)', value: avgROAS.toFixed(2) + 'x', icon: '📈' },
          { label: 'Aktive Kampagnen', value: `${activeCount} / ${campaigns.length}`, icon: '🚀', sub: alertCount > 0 ? `${alertCount} Alert${alertCount > 1 ? 's' : ''}` : undefined },
        ].map(({ label, value, icon, sub }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xl font-bold text-vemo-dark-900">{value}</div>
            <div className="text-xs text-vemo-dark-500">{label}</div>
            {sub && <div className="text-xs text-orange-500 font-medium mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-vemo-dark-200">
        {(['overview', 'rules', 'history', 'forecast'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? 'border-vemo-green-500 text-vemo-green-700'
                : 'border-transparent text-vemo-dark-500 hover:text-vemo-dark-700'
            }`}
          >
            {tab === 'overview' && '📋 Kampagnen'}
            {tab === 'rules' && '⚙️ Auto-Regeln'}
            {tab === 'history' && '📜 Budget-Verlauf'}
            {tab === 'forecast' && '🔮 Prognose'}
          </button>
        ))}
      </div>

      {/* ─── TAB: Overview ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {campaigns.map(campaign => {
            const pct = spendPct(campaign)
            const isOverBudget = campaign.currentSpend > campaign.dailyBudget
            const isOverriding = overrideCampaignId === campaign.id

            return (
              <div key={campaign.id} className="card p-5">
                {/* Campaign Header */}
                <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{PLATFORM_ICONS[campaign.platform]}</span>
                      <h3 className="font-bold text-vemo-dark-900 text-sm">{campaign.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PLATFORM_COLORS[campaign.platform]}`}>
                        {campaign.platform.charAt(0).toUpperCase() + campaign.platform.slice(1)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_CONFIG[campaign.status].color}`}>
                        {STATUS_CONFIG[campaign.status].label}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => router.push(`/ads/${campaign.id}`)}
                      className="text-xs px-3 py-1.5 rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors font-medium"
                    >
                      📊 Details & Tipps
                    </button>
                    <button
                      onClick={() => {
                        setOverrideCampaignId(isOverriding ? null : campaign.id)
                        setOverrideBudget(campaign.dailyBudget.toString())
                      }}
                      className="text-xs px-3 py-1.5 rounded-md border border-vemo-dark-200 hover:bg-vemo-dark-100 text-vemo-dark-600 transition-colors"
                    >
                      ✏️ Budget anpassen
                    </button>
                    <button
                      onClick={() => toggleCampaignPause(campaign.id)}
                      className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                        campaign.status === 'active'
                          ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                          : 'border-vemo-green-200 text-vemo-green-700 hover:bg-vemo-green-100'
                      }`}
                    >
                      {campaign.status === 'active' ? '⏸ Pausieren' : '▶ Aktivieren'}
                    </button>
                  </div>
                </div>

                {/* Budget Override Form */}
                {isOverriding && (
                  <div className="mb-4 p-3 bg-vemo-dark-50 rounded-md border border-vemo-dark-200 flex items-center gap-3 flex-wrap">
                    <label className="text-xs font-semibold text-vemo-dark-700">Neues Tagesbudget (CHF):</label>
                    <input
                      type="number"
                      value={overrideBudget}
                      onChange={e => setOverrideBudget(e.target.value)}
                      className="input text-sm w-32"
                      min={1}
                    />
                    <button
                      onClick={() => applyBudgetOverride(campaign.id)}
                      className="text-xs px-3 py-1.5 rounded-md bg-vemo-green-500 text-white font-semibold hover:bg-vemo-green-600 transition-colors"
                    >
                      Übernehmen
                    </button>
                    <button
                      onClick={() => setOverrideCampaignId(null)}
                      className="text-xs px-3 py-1.5 rounded-md border border-vemo-dark-200 text-vemo-dark-600 hover:bg-vemo-dark-100 transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                )}

                {/* Budget Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-vemo-dark-500">Budget heute</span>
                    <span className={`text-xs font-semibold ${isOverBudget ? 'text-red-600' : 'text-vemo-dark-700'}`}>
                      {formatCHF(campaign.currentSpend)} / {formatCHF(campaign.dailyBudget)}
                      {isOverBudget && <span className="ml-1 text-red-500">⚠️</span>}
                    </span>
                  </div>
                  <div className="h-2 bg-vemo-dark-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : pct > 80 ? 'bg-yellow-400' : 'bg-vemo-green-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-vemo-dark-400 mt-1">{Math.round(pct)}% verbraucht</div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'ROAS', value: `${campaign.roas.toFixed(2)}x`, color: roasColor(campaign.roas) },
                    { label: 'Impressionen', value: campaign.impressions.toLocaleString('de-CH'), color: 'text-vemo-dark-700' },
                    { label: 'Klicks', value: campaign.clicks.toLocaleString('de-CH'), color: 'text-vemo-dark-700' },
                    { label: 'Conversions', value: campaign.conversions.toString(), color: 'text-vemo-dark-700' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-vemo-dark-50 rounded-md p-3 text-center">
                      <div className={`text-base font-bold ${color}`}>{value}</div>
                      <div className="text-xs text-vemo-dark-400">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── TAB: Auto-Scaling Rules ────────────────────────────────────────── */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="card p-5 bg-blue-50/50 border border-blue-200">
            <h3 className="text-sm font-bold text-blue-800 mb-1">ℹ️ Wie funktionieren Auto-Regeln?</h3>
            <p className="text-xs text-blue-700">
              Die Regeln werden stündlich geprüft. Sind mehrere Regeln zutreffend, hat die restriktivere Regel Vorrang.
              Auto-Pause hat immer den höchsten Vorrang.
            </p>
          </div>

          {rules.map(rule => {
            const isEditing = editingRuleId === rule.id
            const ruleColors = {
              scale_up: 'border-vemo-green-200 bg-vemo-green-50/30',
              scale_down: 'border-yellow-200 bg-yellow-50/30',
              pause: 'border-red-200 bg-red-50/30',
            }
            const ruleIcons = { scale_up: '📈', scale_down: '📉', pause: '⏸️' }

            return (
              <div key={rule.id} className={`card p-5 border-l-4 ${ruleColors[rule.type]}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{ruleIcons[rule.type]}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-vemo-dark-900">
                          {rule.type === 'scale_up' && 'Budget erhöhen'}
                          {rule.type === 'scale_down' && 'Budget reduzieren'}
                          {rule.type === 'pause' && 'Kampagne pausieren'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.enabled ? 'bg-vemo-green-100 text-vemo-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {rule.enabled ? 'Aktiv' : 'Deaktiviert'}
                        </span>
                      </div>
                      {!isEditing ? (
                        <p className="text-xs text-vemo-dark-500 mt-0.5">
                          Wenn ROAS {rule.type === 'scale_up' ? '>' : '<'} <strong>{rule.threshold}x</strong> → {rule.action}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs text-vemo-dark-600">Schwellenwert:</span>
                          <input
                            type="number"
                            value={rule.threshold}
                            onChange={e => updateRuleThreshold(rule.id, parseFloat(e.target.value))}
                            className="input text-sm w-24"
                            step={0.1}
                            min={0.1}
                          />
                          <span className="text-xs text-vemo-dark-500">× ROAS</span>
                          <button
                            onClick={() => setEditingRuleId(null)}
                            className="text-xs px-3 py-1 rounded-md bg-vemo-green-500 text-white font-semibold hover:bg-vemo-green-600 transition-colors"
                          >
                            Speichern
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing && (
                      <button
                        onClick={() => setEditingRuleId(rule.id)}
                        className="text-xs px-3 py-1.5 rounded-md border border-vemo-dark-200 hover:bg-vemo-dark-100 text-vemo-dark-600 transition-colors"
                      >
                        ✏️ Bearbeiten
                      </button>
                    )}
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                        rule.enabled
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-vemo-green-200 text-vemo-green-700 hover:bg-vemo-green-100'
                      }`}
                    >
                      {rule.enabled ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add custom rule hint */}
          <div className="card p-4 border-dashed border-2 border-vemo-dark-200 text-center text-sm text-vemo-dark-400">
            + Weitere Regeln (z.B. nach CTR, CPA) via API-Integration konfigurierbar
          </div>
        </div>
      )}

      {/* ─── TAB: Budget History ────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-vemo-dark-100 bg-vemo-dark-50">
            <h3 className="text-xs font-bold text-vemo-dark-600 uppercase tracking-wider">Alle Budget-Änderungen</h3>
          </div>
          <div className="divide-y divide-vemo-dark-100">
            {MOCK_HISTORY.map(entry => (
              <div key={entry.id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-vemo-dark-100 flex items-center justify-center text-base">
                  {historyIcon(entry.changeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-vemo-dark-800">{entry.campaignName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      entry.changeType === 'auto_scale' ? 'bg-vemo-green-100 text-vemo-green-700' :
                      entry.changeType === 'auto_pause' ? 'bg-orange-100 text-orange-700' :
                      entry.changeType === 'manual' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {entry.changeType === 'manual' ? 'Manuell' :
                       entry.changeType === 'auto_scale' ? 'Auto-Skalierung' :
                       entry.changeType === 'auto_pause' ? 'Auto-Pause' : 'Alert'}
                    </span>
                  </div>
                  <p className="text-xs text-vemo-dark-500">{entry.reason}</p>
                  {entry.oldBudget !== null && entry.newBudget !== null && (
                    <p className="text-xs text-vemo-dark-400 mt-0.5">
                      {formatCHF(entry.oldBudget)} → {formatCHF(entry.newBudget)}
                    </p>
                  )}
                </div>
                <div className="text-xs text-vemo-dark-400 flex-shrink-0">{formatRelativeTime(entry.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB: Forecast ──────────────────────────────────────────────────── */}
      {activeTab === 'forecast' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Monatliches Budget', value: formatCHF(forecastBudgetMonthly), icon: '📅', sub: 'bei aktuellem Tagesbudget' },
              { label: 'Prognostizierte Ausgaben', value: formatCHF(forecastMonthEnd), icon: '🔮', sub: `${Math.round(forecastPct)}% des Monatsbudgets` },
              { label: 'Noch verfügbar', value: formatCHF(forecastBudgetMonthly - forecastMonthEnd), icon: '💡', sub: `bis Monatsende (${daysInMonth - dayOfMonth} Tage)` },
            ].map(({ label, value, icon, sub }) => (
              <div key={label} className="card p-5 text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-xl font-bold text-vemo-dark-900">{value}</div>
                <div className="text-sm text-vemo-dark-600 font-medium mt-0.5">{label}</div>
                <div className="text-xs text-vemo-dark-400 mt-1">{sub}</div>
              </div>
            ))}
          </div>

          {/* Monthly forecast bar */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-vemo-dark-700 mb-3">Monats-Prognose (April 2026)</h3>
            <div className="space-y-3">
              {campaigns.map(campaign => {
                const monthlyBudget = campaign.dailyBudget * daysInMonth
                const projectedSpend = (campaign.currentSpend / dayOfMonth) * daysInMonth
                const projPct = Math.min((projectedSpend / monthlyBudget) * 100, 110)
                const isOver = projectedSpend > monthlyBudget

                return (
                  <div key={campaign.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span>{PLATFORM_ICONS[campaign.platform]}</span>
                        <span className="text-xs text-vemo-dark-700 font-medium">{campaign.name}</span>
                      </div>
                      <span className={`text-xs font-semibold ${isOver ? 'text-red-600' : 'text-vemo-dark-600'}`}>
                        {formatCHF(projectedSpend)} / {formatCHF(monthlyBudget)}
                        {isOver && ' ⚠️'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-vemo-dark-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isOver ? 'bg-red-400' : projPct > 80 ? 'bg-yellow-400' : 'bg-vemo-green-500'}`}
                        style={{ width: `${Math.min(projPct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-vemo-dark-400 mt-4">
              Prognose basiert auf Durchschnitt der letzten {dayOfMonth} Tage. Wird täglich aktualisiert.
            </p>
          </div>

          {/* Integration info */}
          <div className="card p-5 bg-blue-50/50 border border-blue-200">
            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2">🔌 API-Integration vorbereitet</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• <strong>Meta Ads:</strong> <code className="bg-blue-100 px-1 rounded">META_ADS_ACCESS_TOKEN</code> → echte Facebook/Instagram-Kampagnen</p>
              <p>• <strong>Google Ads:</strong> <code className="bg-blue-100 px-1 rounded">GOOGLE_ADS_API_KEY</code> → Search & Display Kampagnen</p>
              <p>• <strong>TikTok Ads:</strong> <code className="bg-blue-100 px-1 rounded">TIKTOK_ADS_ACCESS_TOKEN</code> → TikTok For Business</p>
              <p>• <strong>Connector einrichten:</strong> <a href="/connectors" className="underline">Connectors</a></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
