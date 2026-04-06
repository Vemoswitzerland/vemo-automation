'use client'

import { useState } from 'react'
import MockBanner from './MockBanner'
import PostCreator from './PostCreator'
import ContentCalendar from './ContentCalendar'

interface Props {
  isMock: boolean
}

export default function InstagramDashboard({ isMock }: Props) {
  const [tab, setTab] = useState<'creator' | 'calendar'>('creator')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-vemo-dark-900">Instagram-Content-Pipeline</h1>
        <p className="text-vemo-dark-600 text-sm">Bild, Caption, Hashtags, Kalender — alles an einem Ort</p>
      </div>

      {/* Mock Banner */}
      {isMock && <MockBanner />}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-vemo-dark-200">
        {[
          { key: 'creator', label: '✏️ Post erstellen', },
          { key: 'calendar', label: '📅 Content-Kalender' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
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
      {tab === 'calendar' && (
        <ContentCalendar />
      )}
    </div>
  )
}
