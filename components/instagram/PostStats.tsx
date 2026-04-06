'use client'

import { useQuery } from '@tanstack/react-query'

interface Stats {
  total: number
  draft: number
  scheduled: number
  posted: number
  thisMonth: number
}

async function fetchStats(): Promise<Stats> {
  const res = await fetch('/api/instagram/stats')
  if (!res.ok) throw new Error('Stats laden fehlgeschlagen')
  return res.json()
}

const STAT_ITEMS: {
  key: keyof Stats
  label: string
  emoji: string
  color: string
  bg: string
}[] = [
  { key: 'total', label: 'Gesamt', emoji: '📊', color: 'text-vemo-dark-700', bg: 'bg-vemo-dark-50' },
  { key: 'draft', label: 'Entwürfe', emoji: '✏️', color: 'text-vemo-dark-600', bg: 'bg-vemo-dark-50' },
  { key: 'scheduled', label: 'Geplant', emoji: '📅', color: 'text-blue-700', bg: 'bg-blue-50' },
  { key: 'posted', label: 'Veröffentlicht', emoji: '✅', color: 'text-vemo-green-700', bg: 'bg-vemo-green-50' },
  { key: 'thisMonth', label: 'Diesen Monat', emoji: '📆', color: 'text-purple-700', bg: 'bg-purple-50' },
]

export default function PostStats() {
  const { data: stats, isLoading, isError } = useQuery<Stats>({
    queryKey: ['instagram-stats'],
    queryFn: fetchStats,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STAT_ITEMS.map((item) => (
          <div
            key={item.key}
            className="card p-4 animate-pulse space-y-2"
          >
            <div className="h-4 w-16 bg-vemo-dark-200 rounded" />
            <div className="h-6 w-8 bg-vemo-dark-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (isError || !stats) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {STAT_ITEMS.map((item) => (
        <div key={item.key} className={`card p-4 ${item.bg}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{item.emoji}</span>
            <span className={`text-xs font-medium ${item.color}`}>{item.label}</span>
          </div>
          <div className={`text-2xl font-bold ${item.color}`}>{stats[item.key]}</div>
        </div>
      ))}
    </div>
  )
}
