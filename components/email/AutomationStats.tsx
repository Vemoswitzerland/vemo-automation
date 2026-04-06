'use client'

import { useQuery } from '@tanstack/react-query'

interface Stats {
  totalProcessed: number
  autoReplied: number
  queued: number
  labelled: number
  autoReplyQuote: number
  avgResponseTimeMs: number
  topRules: { name: string; count: number }[]
  last7Days: { date: string; total: number; autoReplied: number }[]
}

interface AutomationLog {
  id: string
  emailFrom: string
  emailSubject: string
  action: string
  wasAutoReplied: boolean
  matchedRule: string | null
  replyPreview: string | null
  createdAt: string
  responseTimeMs: number | null
}

async function fetchStats(isMock: boolean): Promise<Stats> {
  const res = await fetch(`/api/emails/automation-stats${isMock ? '?mock=true' : ''}`)
  if (!res.ok) throw new Error('Fehler')
  return res.json()
}

async function fetchLogs(isMock: boolean): Promise<AutomationLog[]> {
  const res = await fetch(`/api/emails/automation-logs${isMock ? '?mock=true' : ''}`)
  if (!res.ok) throw new Error('Fehler')
  return res.json()
}

interface Props { isMock?: boolean }

const actionLabel: Record<string, string> = {
  auto_replied: '✅ Auto-Antwort',
  queued: '⏳ Queue',
  labelled: '🏷️ Label',
  fallback: '↩️ Fallback',
}

const actionColor: Record<string, string> = {
  auto_replied: 'text-green-700 bg-green-50',
  queued: 'text-yellow-700 bg-yellow-50',
  labelled: 'text-blue-700 bg-blue-50',
  fallback: 'text-gray-600 bg-gray-50',
}

export default function AutomationStats({ isMock = false }: Props) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['automation-stats', isMock],
    queryFn: () => fetchStats(isMock),
  })

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['automation-logs', isMock],
    queryFn: () => fetchLogs(isMock),
  })

  if (statsLoading || logsLoading) {
    return <div className="card py-12 text-center text-vemo-dark-500">Dashboard laden...</div>
  }

  if (!stats) return null

  const formatMs = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // Simple bar chart for last 7 days
  const maxDay = Math.max(...stats.last7Days.map(d => d.total), 1)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-vemo-dark-900">{stats.totalProcessed}</div>
          <div className="text-sm text-vemo-dark-500 mt-1">Verarbeitete E-Mails</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600">{stats.autoReplyQuote}%</div>
          <div className="text-sm text-vemo-dark-500 mt-1">Auto-Reply-Quote</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-vemo-dark-900">
            {stats.avgResponseTimeMs > 0 ? formatMs(stats.avgResponseTimeMs) : '—'}
          </div>
          <div className="text-sm text-vemo-dark-500 mt-1">Ø Antwortzeit</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-600">{stats.queued}</div>
          <div className="text-sm text-vemo-dark-500 mt-1">Fallback-Queue</div>
        </div>
      </div>

      {/* Chart + Top Rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 7-Day Chart */}
        <div className="card md:col-span-2">
          <h3 className="font-semibold text-vemo-dark-800 mb-4">Letzte 7 Tage</h3>
          {stats.last7Days.length === 0 ? (
            <div className="py-8 text-center text-vemo-dark-400 text-sm">Noch keine Daten</div>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {stats.last7Days.map(day => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '100px' }}>
                    <div
                      className="w-full bg-vemo-green-500 rounded-t"
                      style={{ height: `${(day.autoReplied / maxDay) * 100}%`, minHeight: day.autoReplied > 0 ? '4px' : '0' }}
                      title={`Auto-Antwort: ${day.autoReplied}`}
                    />
                    <div
                      className="w-full bg-gray-200 rounded-t"
                      style={{ height: `${((day.total - day.autoReplied) / maxDay) * 100}%`, minHeight: (day.total - day.autoReplied) > 0 ? '4px' : '0' }}
                      title={`Queue/Other: ${day.total - day.autoReplied}`}
                    />
                  </div>
                  <span className="text-xs text-vemo-dark-400">
                    {new Date(day.date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 mt-3 text-xs text-vemo-dark-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-vemo-green-500 rounded inline-block" /> Auto-Antwort
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-200 rounded inline-block" /> Queue/Fallback
            </span>
          </div>
        </div>

        {/* Top Rules */}
        <div className="card">
          <h3 className="font-semibold text-vemo-dark-800 mb-4">Top Regeln</h3>
          {stats.topRules.length === 0 ? (
            <div className="py-4 text-center text-vemo-dark-400 text-sm">Noch keine Daten</div>
          ) : (
            <div className="space-y-3">
              {stats.topRules.map((rule, i) => (
                <div key={rule.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-vemo-dark-400 w-4">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-vemo-dark-800 truncate">{rule.name}</div>
                    <div className="text-xs text-vemo-dark-400">{rule.count}× ausgelöst</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit Log */}
      <div className="card">
        <h3 className="font-semibold text-vemo-dark-800 mb-4">Audit-Trail</h3>
        {logs.length === 0 ? (
          <div className="py-8 text-center text-vemo-dark-400 text-sm">Noch keine Aktivitäten</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-vemo-dark-500 text-xs">
                  <th className="pb-2 pr-4 font-medium">Zeitpunkt</th>
                  <th className="pb-2 pr-4 font-medium">Absender</th>
                  <th className="pb-2 pr-4 font-medium">Betreff</th>
                  <th className="pb-2 pr-4 font-medium">Aktion</th>
                  <th className="pb-2 pr-4 font-medium">Regel</th>
                  <th className="pb-2 font-medium">Zeit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 text-vemo-dark-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('de-CH', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-2 pr-4 text-vemo-dark-700 truncate max-w-[140px]">
                      {log.emailFrom}
                    </td>
                    <td className="py-2 pr-4 text-vemo-dark-700 truncate max-w-[200px]">
                      {log.emailSubject}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor[log.action] ?? 'bg-gray-100 text-gray-500'}`}>
                        {actionLabel[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-vemo-dark-500 text-xs">
                      {log.matchedRule ?? '—'}
                    </td>
                    <td className="py-2 text-vemo-dark-400 text-xs">
                      {log.responseTimeMs ? formatMs(log.responseTimeMs) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
