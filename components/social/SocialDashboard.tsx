'use client'

import { useState } from 'react'
import SocialPostCreator from './SocialPostCreator'

type Channel = 'instagram' | 'facebook' | 'linkedin'

interface SocialDashboardProps {
  isMockInstagram: boolean
  isMockFacebook: boolean
  isMockLinkedIn: boolean
}

const CHANNELS: { id: Channel; label: string; icon: string; color: string; mockColor: string }[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: '📸',
    color: 'border-pink-400 bg-pink-50 text-pink-700',
    mockColor: 'bg-pink-100',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: '📘',
    color: 'border-blue-500 bg-blue-50 text-blue-700',
    mockColor: 'bg-blue-100',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '💼',
    color: 'border-blue-700 bg-blue-50 text-blue-800',
    mockColor: 'bg-blue-100',
  },
]

export default function SocialDashboard({
  isMockInstagram,
  isMockFacebook,
  isMockLinkedIn,
}: SocialDashboardProps) {
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(['instagram'])

  const mockMap: Record<Channel, boolean> = {
    instagram: isMockInstagram,
    facebook: isMockFacebook,
    linkedin: isMockLinkedIn,
  }

  function toggleChannel(ch: Channel) {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    )
  }

  const anyMock = selectedChannels.some((ch) => mockMap[ch])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-vemo-dark-900">Social Media</h1>
        <p className="text-sm text-vemo-dark-500 mt-1">
          Erstelle und plane Posts für mehrere Plattformen gleichzeitig
        </p>
      </div>

      {/* Mock banner */}
      {anyMock && (
        <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Demo-Modus:</strong>{' '}
          {selectedChannels
            .filter((ch) => mockMap[ch])
            .map((ch) => CHANNELS.find((c) => c.id === ch)?.label)
            .join(', ')}{' '}
          {selectedChannels.filter((ch) => mockMap[ch]).length === 1 ? 'hat' : 'haben'} keine API-Zugangsdaten —
          Posts werden simuliert. Zugangsdaten in <code>.env.local</code> eintragen.
        </div>
      )}

      {/* Channel Selector */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold text-vemo-dark-600 uppercase tracking-wide">
          Kanäle auswählen
        </h2>
        <div className="flex flex-wrap gap-3">
          {CHANNELS.map((ch) => {
            const selected = selectedChannels.includes(ch.id)
            return (
              <button
                key={ch.id}
                onClick={() => toggleChannel(ch.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-sm border-2 text-sm font-medium transition-all ${
                  selected
                    ? ch.color
                    : 'border-vemo-dark-200 text-vemo-dark-500 hover:border-vemo-dark-400 hover:text-vemo-dark-700'
                }`}
              >
                <span>{ch.icon}</span>
                <span>{ch.label}</span>
                {mockMap[ch.id] && (
                  <span className="ml-1 text-xs font-normal opacity-70">(Demo)</span>
                )}
                {selected && <span className="ml-1 text-xs">✓</span>}
              </button>
            )
          })}
        </div>
        {selectedChannels.length === 0 && (
          <p className="text-xs text-vemo-dark-400 italic">Mindestens einen Kanal auswählen</p>
        )}
      </div>

      {/* Post Creator */}
      {selectedChannels.length > 0 && (
        <SocialPostCreator
          selectedChannels={selectedChannels}
          mockMap={mockMap}
        />
      )}
    </div>
  )
}
