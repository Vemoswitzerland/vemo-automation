'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

interface AutomationStats {
  totalProcessed: number
  autoReplied: number
  queued: number
  labelled: number
  autoReplyQuote: number
  avgResponseTimeMs: number
  topRules: { name: string; count: number }[]
  last7Days: { date: string; total: number; autoReplied: number }[]
}

type CategoryFilter = 'all' | 'auto_replied' | 'queued' | 'labelled'
type DaysFilter = 7 | 14 | 30

async function fetchStats(isMock: boolean, days: DaysFilter, category: CategoryFilter): Promise<AutomationStats> {
  const params = new URLSearchParams()
  if (isMock) params.set('mock', 'true')
  params.set('days', String(days))
  if (category !== 'all') params.set('category', category)
  const res = await fetch(`/api/emails/automation-stats?${params.toString()}`)
  if (!res.ok) throw new Error('Fehler beim Laden der Statistiken')
  return res.json()
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card py-4">
      <div className={`text-2xl font-bold ${color || 'text-vemo-dark-900'}`}>{value}</div>
      <div className="text-xs font-medium text-vemo-dark-700 mt-1">{label}</div>
      {sub && <div className="text-xs text-vemo-dark-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="h-1.5 bg-vemo-dark-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Alle Kategorien' },
  { value: 'auto_replied', label: 'Auto-Beantwortet' },
  { value: 'queued', label: 'In Warteschlange' },
  { value: 'labelled', label: 'Gelabelt' },
]

const DAYS_OPTIONS: { value: DaysFilter; label: string }[] = [
  { value: 7, label: '7 Tage' },
  { value: 14, label: '14 Tage' },
  { value: 30, label: '30 Tage' },
]

interface Props {
  isMock?: boolean
}

export default function EmailAnalytics({ isMock = false }: Props) {
  const [days, setDays] = useState<DaysFilter>(7)
  const [category, setCategory] = useState<CategoryFilter>('all')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['email-analytics', isMock, days, category],
    queryFn: () => fetchStats(isMock, days, category),
    staleTime: 60_000,
  })

  if (isLoading || !stats) {
    return (
      <div className="card py-10 text-center">
        <div className="text-3xl mb-2">📊</div>
        <p className="text-vemo-dark-600 text-sm">Statistiken laden...</p>
      </div>
    )
  }

  const maxDay = Math.max(...stats.last7Days.map(d => d.total), 1)

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-vemo-dark-500 font-medium">Filter:</span>
        {/* Category filter */}
        <div className="flex rounded-lg border border-vemo-dark-200 overflow-hidden text-xs">
          {CATEGORY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setCategory(opt.value)}
              className={`px-3 py-1.5 transition-colors ${
                category === opt.value
                  ? 'bg-vemo-green-500 text-white font-medium'
                  : 'bg-white text-vemo-dark-600 hover:bg-vemo-dark-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* Days filter */}
        <div className="flex rounded-lg border border-vemo-dark-200 overflow-hidden text-xs ml-auto">
          {DAYS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 transition-colors ${
                days === opt.value
                  ? 'bg-vemo-dark-800 text-white font-medium'
                  : 'bg-white text-vemo-dark-600 hover:bg-vemo-dark-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Verarbeitete E-Mails"
          value={stats.totalProcessed}
          sub={category === 'all' ? 'Gesamt' : CATEGORY_OPTIONS.find(o => o.value === category)?.label}
          color="text-vemo-dark-900"
        />
        <StatCard
          label="Auto-Beantwortet"
          value={stats.autoReplied}
          sub={`${stats.autoReplyQuote.toFixed(1)}% Quote`}
          color="text-vemo-green-600"
        />
        <StatCard
          label="In Warteschlange"
          value={stats.queued}
          sub="Warten auf Review"
          color="text-amber-600"
        />
        <StatCard
          label="Ø Antwortzeit"
          value={stats.avgResponseTimeMs < 60_000
            ? `${(stats.avgResponseTimeMs / 1000).toFixed(1)}s`
            : `${(stats.avgResponseTimeMs / 60_000).toFixed(1)}min`}
          sub="Automatisch"
          color="text-vemo-dark-800"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trend chart */}
        <div className="card">
          <div className="text-xs font-semibold text-vemo-dark-600 uppercase tracking-wide mb-4">
            Letzte {days} Tage
          </div>
          {stats.last7Days.length === 0 ? (
            <div className="text-center py-8 text-vemo-dark-400 text-sm">Keine Daten für diesen Zeitraum</div>
          ) : (
            <div className="space-y-2.5">
              {stats.last7Days.map(day => (
                <div key={day.date}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-vemo-dark-600">
                      {new Date(day.date).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-vemo-green-600 font-medium">{day.autoReplied} auto</span>
                      <span className="text-vemo-dark-500">{day.total} total</span>
                    </div>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    <div
                      className="h-full bg-vemo-green-500 rounded-l-full"
                      style={{ width: `${maxDay > 0 ? (day.autoReplied / maxDay) * 100 : 0}%` }}
                    />
                    <div
                      className="h-full bg-vemo-dark-200 rounded-r-full"
                      style={{ width: `${maxDay > 0 ? ((day.total - day.autoReplied) / maxDay) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 mt-4 text-xs text-vemo-dark-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-1.5 bg-vemo-green-500 rounded-full" />
              Auto-beantwortet
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-1.5 bg-vemo-dark-200 rounded-full" />
              Manuell/Queue
            </span>
          </div>
        </div>

        {/* Top rules */}
        <div className="card">
          <div className="text-xs font-semibold text-vemo-dark-600 uppercase tracking-wide mb-4">
            Top Automations-Regeln
          </div>
          {stats.topRules.length === 0 ? (
            <div className="text-center py-8 text-vemo-dark-500 text-sm">
              <div className="text-2xl mb-2">🤖</div>
              Noch keine Regeln ausgelöst
            </div>
          ) : (
            <div className="space-y-3">
              {stats.topRules.map((rule, i) => {
                const maxCount = stats.topRules[0]?.count || 1
                return (
                  <div key={rule.name}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-vemo-dark-500 w-4 text-right">{i + 1}.</span>
                        <span className="text-sm text-vemo-dark-800 truncate max-w-[180px]">{rule.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-vemo-green-600">{rule.count}×</span>
                    </div>
                    <MiniBar value={rule.count} max={maxCount} color="bg-vemo-green-400" />
                  </div>
                )
              })}
            </div>
          )}

          {/* Auto-reply rate visual */}
          <div className="mt-5 pt-4 border-t border-vemo-dark-200">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-vemo-dark-600 font-medium">Auto-Antwort-Rate</span>
              <span className="text-vemo-green-600 font-bold">{stats.autoReplyQuote.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-vemo-dark-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-vemo-green-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.autoReplyQuote, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-vemo-dark-400 mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
