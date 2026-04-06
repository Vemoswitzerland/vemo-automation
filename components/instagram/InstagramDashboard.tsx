'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import MockBanner from './MockBanner'
import PostCreator from './PostCreator'
import ContentCalendar from './ContentCalendar'
import PostStats from './PostStats'

interface Props {
  isMock: boolean
}

type Tab = 'creator' | 'calendar' | 'posts'

const TABS: { key: Tab; label: string }[] = [
  { key: 'creator', label: '✏️ Post erstellen' },
  { key: 'calendar', label: '📅 Kalender' },
  { key: 'posts', label: '📋 Alle Posts' },
]

export default function InstagramDashboard({ isMock }: Props) {
  const [tab, setTab] = useState<Tab>('creator')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-vemo-dark-900">Instagram Content Pipeline</h1>
          <p className="text-vemo-dark-600 text-sm">
            Bild, Caption, Hashtags, Kalender — alles an einem Ort
          </p>
        </div>
        <a
          href="/content-pipeline"
          className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 flex-shrink-0"
        >
          🚀 KI-Content generieren
        </a>
      </div>

      {/* Stats */}
      <PostStats />

      {/* Mock Banner */}
      {isMock && <MockBanner />}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-vemo-dark-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === t.key
                ? 'border-vemo-green-500 text-vemo-green-700'
                : 'border-transparent text-vemo-dark-500 hover:text-vemo-dark-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'creator' && (
        <PostCreator isMock={isMock} onSaved={() => setTab('calendar')} />
      )}
      {tab === 'calendar' && <ContentCalendar />}
      {tab === 'posts' && <PostsList />}
    </div>
  )
}

/* ── Posts List Tab ─────────────────────────────────────────────────── */

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

type StatusFilter = 'all' | 'draft' | 'scheduled' | 'posted' | 'failed'

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'draft', label: 'Entwürfe' },
  { value: 'scheduled', label: 'Geplant' },
  { value: 'posted', label: 'Veröffentlicht' },
  { value: 'failed', label: 'Fehlgeschlagen' },
]

async function fetchPosts(status: StatusFilter): Promise<Post[]> {
  const qs = status !== 'all' ? `?status=${status}` : ''
  const res = await fetch(`/api/instagram${qs}`)
  if (!res.ok) throw new Error('Fehler')
  const data = await res.json()
  return data.posts
}

function PostsList() {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const queryClient = useQueryClient()

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['instagram-posts-list', filter],
    queryFn: () => fetchPosts(filter),
  })

  async function deletePost(id: string) {
    await fetch(`/api/instagram/${id}`, { method: 'DELETE' })
    queryClient.invalidateQueries({ queryKey: ['instagram-posts-list'] })
    queryClient.invalidateQueries({ queryKey: ['instagram-stats'] })
  }

  async function publishPost(id: string) {
    await fetch(`/api/instagram/${id}/publish`, { method: 'POST' })
    queryClient.invalidateQueries({ queryKey: ['instagram-posts-list'] })
    queryClient.invalidateQueries({ queryKey: ['instagram-stats'] })
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-vemo-dark-500 uppercase tracking-wide">Filter:</span>
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              filter === opt.value
                ? 'bg-vemo-green-500 border-vemo-green-500 text-white'
                : 'border-vemo-dark-200 text-vemo-dark-600 hover:border-vemo-dark-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {isLoading ? (
        <div className="text-center py-10 text-vemo-dark-400 text-sm">Posts laden…</div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-12 text-vemo-dark-400 text-sm space-y-2">
          <div className="text-3xl">📭</div>
          <p>Keine Posts gefunden</p>
          <a
            href="/content-pipeline"
            className="btn-primary text-xs px-4 py-1.5 inline-block mt-2"
          >
            Content erstellen →
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft
            const date = post.scheduledAt || post.postedAt || post.createdAt
            return (
              <div
                key={post.id}
                className="card flex items-start gap-3 py-3 px-4 hover:shadow-md transition-shadow"
              >
                {post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt=""
                    className="w-14 h-14 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded bg-vemo-dark-100 flex items-center justify-center text-2xl flex-shrink-0">
                    📸
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm text-vemo-dark-900 line-clamp-2 leading-snug">
                    {post.caption || (
                      <span className="italic text-vemo-dark-400">(Kein Text)</span>
                    )}
                  </p>
                  <p className="text-xs text-vemo-dark-400">
                    {new Date(date).toLocaleString('de-CH', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                  <div className="flex gap-1">
                    {(post.status === 'draft' || post.status === 'scheduled') && (
                      <button
                        onClick={() => publishPost(post.id)}
                        className="px-2 py-1 text-xs font-medium bg-vemo-green-50 text-vemo-green-700 border border-vemo-green-200 rounded hover:bg-vemo-green-100 transition-colors"
                      >
                        Posten
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Post wirklich löschen?')) deletePost(post.id)
                      }}
                      className="px-2 py-1 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
