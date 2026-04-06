'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface Post {
  id: string
  caption: string
  imageUrl: string | null
  status: string
  scheduledAt: string | null
  postedAt: string | null
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft: { label: 'Entwurf', color: 'bg-vemo-dark-100 text-vemo-dark-600', dot: 'bg-vemo-dark-400' },
  scheduled: { label: 'Geplant', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  posted: { label: 'Veröffentlicht', color: 'bg-vemo-green-50 text-vemo-green-700', dot: 'bg-vemo-green-500' },
  failed: { label: 'Fehlgeschlagen', color: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

async function fetchPosts(month: string): Promise<Post[]> {
  const res = await fetch(`/api/instagram?month=${month}`)
  if (!res.ok) throw new Error('Fehler')
  const data = await res.json()
  return data.posts
}

export default function ContentCalendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const queryClient = useQueryClient()

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['instagram-posts', monthKey],
    queryFn: () => fetchPosts(monthKey),
  })

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function getPostsForDay(day: number): Post[] {
    return posts.filter(p => {
      const date = p.scheduledAt || p.postedAt || p.createdAt
      const d = new Date(date)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/instagram/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    queryClient.invalidateQueries({ queryKey: ['instagram-posts'] })
    setSelectedPost(null)
  }

  async function deletePost(id: string) {
    await fetch(`/api/instagram/${id}`, { method: 'DELETE' })
    queryClient.invalidateQueries({ queryKey: ['instagram-posts'] })
    setSelectedPost(null)
  }

  async function publishPost(id: string) {
    await fetch(`/api/instagram/${id}/publish`, { method: 'POST' })
    queryClient.invalidateQueries({ queryKey: ['instagram-posts'] })
    setSelectedPost(null)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const paddingDays = firstDay === 0 ? 6 : firstDay - 1 // Monday first

  const monthName = new Date(year, month).toLocaleString('de-CH', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-sm hover:bg-vemo-dark-100 text-vemo-dark-600 transition-colors">
          ←
        </button>
        <h3 className="font-semibold text-vemo-dark-900 capitalize">{monthName}</h3>
        <button onClick={nextMonth} className="p-2 rounded-sm hover:bg-vemo-dark-100 text-vemo-dark-600 transition-colors">
          →
        </button>
      </div>

      {/* Calendar grid */}
      <div className="card p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-vemo-dark-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayPosts = getPostsForDay(day)
            const isToday =
              now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
            return (
              <div
                key={day}
                className={`min-h-[60px] rounded-sm border p-1 ${
                  isToday
                    ? 'border-vemo-green-400 bg-vemo-green-50'
                    : 'border-vemo-dark-100 hover:border-vemo-dark-200'
                } transition-colors`}
              >
                <div
                  className={`text-xs font-semibold mb-1 ${
                    isToday ? 'text-vemo-green-600' : 'text-vemo-dark-600'
                  }`}
                >
                  {day}
                </div>
                {dayPosts.map(post => {
                  const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft
                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="w-full text-left mb-0.5"
                    >
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${cfg.color} truncate`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="truncate">{post.caption.slice(0, 20) || '(Kein Text)'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-vemo-dark-500">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Post list below calendar */}
      {isLoading ? (
        <div className="text-center py-8 text-vemo-dark-400 text-sm">Posts laden...</div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-10 text-vemo-dark-400 text-sm">
          Keine Posts für diesen Monat
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-vemo-dark-700">Alle Posts — {monthName}</h4>
          {posts.map(post => {
            const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft
            const date = post.scheduledAt || post.postedAt || post.createdAt
            return (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="card flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow py-3 px-4"
              >
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded bg-vemo-dark-100 flex items-center justify-center text-xl flex-shrink-0">
                    📸
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-vemo-dark-900 truncate">{post.caption || '(Kein Text)'}</p>
                  <p className="text-xs text-vemo-dark-400 mt-0.5">
                    {new Date(date).toLocaleString('de-CH', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Post detail modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-vemo-dark-900">Post Details</h3>
              <button onClick={() => setSelectedPost(null)} className="text-vemo-dark-400 hover:text-vemo-dark-700 text-xl">×</button>
            </div>

            {selectedPost.imageUrl && (
              <img src={selectedPost.imageUrl} alt="" className="w-full rounded-lg aspect-square object-cover" />
            )}

            <div className="space-y-2">
              <p className="text-sm text-vemo-dark-900 leading-relaxed whitespace-pre-wrap">{selectedPost.caption}</p>
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedPost.status]?.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[selectedPost.status]?.dot}`} />
                {STATUS_CONFIG[selectedPost.status]?.label}
              </div>
              {selectedPost.scheduledAt && (
                <p className="text-xs text-vemo-dark-500">
                  Geplant: {new Date(selectedPost.scheduledAt).toLocaleString('de-CH')}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-vemo-dark-100">
              {selectedPost.status === 'draft' && (
                <button
                  onClick={() => updateStatus(selectedPost.id, 'scheduled')}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-sm hover:bg-blue-100 transition-colors"
                >
                  Als geplant markieren
                </button>
              )}
              {(selectedPost.status === 'draft' || selectedPost.status === 'scheduled') && (
                <button
                  onClick={() => publishPost(selectedPost.id)}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  Jetzt posten (Mock)
                </button>
              )}
              <button
                onClick={() => deletePost(selectedPost.id)}
                className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-sm hover:bg-red-100 transition-colors ml-auto"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
