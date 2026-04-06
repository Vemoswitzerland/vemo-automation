'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

type Channel = 'instagram' | 'facebook' | 'linkedin'

const TONES = [
  { value: 'professional', label: 'Professionell', emoji: '💼' },
  { value: 'casual', label: 'Locker', emoji: '😊' },
  { value: 'motivational', label: 'Motivierend', emoji: '🔥' },
]

const CAPTION_TEMPLATES: Record<string, string[]> = {
  professional: [
    'Wir freuen uns, heute {thema} zu teilen. Qualität und Innovation stehen bei uns an erster Stelle. #Business #Innovation',
    'Neue Perspektiven auf {thema}. Entdecken Sie, wie wir den Unterschied machen. #Expertise #Qualität',
  ],
  casual: [
    'Hey! Schaut mal, was wir heute mit {thema} gemacht haben 🙌 Was denkt ihr? #Community',
    'Das mussten wir einfach teilen 😄 {thema} – und ihr? #GoodVibes',
  ],
  motivational: [
    'Jeden Tag eine neue Chance mit {thema}. Bleibt dran, der Weg ist das Ziel! 💪 #Motivation',
    'Grosse Träume beginnen mit kleinen Schritten. {thema} zeigt uns: Es ist möglich! 🚀 #Inspiration',
  ],
}

const HASHTAG_SUGGESTIONS: Record<string, string[]> = {
  professional: ['#Business', '#Innovation', '#Qualität', '#Erfolg', '#Leadership'],
  casual: ['#Community', '#GoodVibes', '#Lifestyle', '#Zusammen', '#Fun'],
  motivational: ['#Motivation', '#Inspiration', '#NeverGiveUp', '#Ziele', '#Wachstum'],
}

const MOCK_IMAGES = [
  'https://picsum.photos/seed/social1/800/800',
  'https://picsum.photos/seed/social2/800/800',
  'https://picsum.photos/seed/social3/800/800',
]

// Per-channel char limits
const CHAR_LIMITS: Record<Channel, number> = {
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
}

// Channel display config
const CHANNEL_CONFIG: Record<Channel, { label: string; icon: string; previewBg: string; previewAccent: string }> = {
  instagram: {
    label: 'Instagram',
    icon: '📸',
    previewBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
    previewAccent: 'text-pink-600',
  },
  facebook: {
    label: 'Facebook',
    icon: '📘',
    previewBg: 'bg-blue-600',
    previewAccent: 'text-blue-600',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: '💼',
    previewBg: 'bg-blue-700',
    previewAccent: 'text-blue-700',
  },
}

type SaveResult = { channel: Channel; ok: boolean; error?: string }

interface SocialPostCreatorProps {
  selectedChannels: Channel[]
  mockMap: Record<Channel, boolean>
}

export default function SocialPostCreator({ selectedChannels, mockMap }: SocialPostCreatorProps) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'create' | 'preview'>('create')
  const [previewChannel, setPreviewChannel] = useState<Channel>(selectedChannels[0])
  const [tone, setTone] = useState<'professional' | 'casual' | 'motivational'>('casual')
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState<SaveResult[]>([])
  const [generatingCaption, setGeneratingCaption] = useState(false)

  // Sync previewChannel if selectedChannels changes and current preview is deselected
  const activePreviewChannel = selectedChannels.includes(previewChannel)
    ? previewChannel
    : selectedChannels[0]

  function generateCaption() {
    setGeneratingCaption(true)
    setTimeout(() => {
      const templates = CAPTION_TEMPLATES[tone]
      const tpl = templates[Math.floor(Math.random() * templates.length)]
      setCaption(tpl.replace('{thema}', 'unserem neuesten Projekt'))
      setGeneratingCaption(false)
    }, 800)
  }

  function addHashtag(tag: string) {
    setCaption((prev) => (prev.endsWith(' ') || prev === '' ? prev + tag : prev + ' ' + tag))
  }

  function useMockImage() {
    setImageUrl(MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)])
  }

  async function savePost(status: 'draft' | 'scheduled') {
    if (!caption.trim()) return
    setSaving(true)
    setResults([])

    const apiMap: Record<Channel, string> = {
      instagram: '/api/instagram',
      facebook: '/api/facebook',
      linkedin: '/api/linkedin',
    }

    const finalStatus = status === 'scheduled' && scheduledAt ? 'scheduled' : 'draft'

    const promises = selectedChannels.map(async (ch): Promise<SaveResult> => {
      try {
        const res = await fetch(apiMap[ch], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caption,
            imageUrl: imageUrl || null,
            scheduledAt: scheduledAt || null,
            status: finalStatus,
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { channel: ch, ok: true }
      } catch (err: any) {
        return { channel: ch, ok: false, error: err.message }
      }
    })

    const allResults = await Promise.all(promises)
    setResults(allResults)

    // Invalidate queries for all channels
    queryClient.invalidateQueries({ queryKey: ['instagram-posts'] })
    queryClient.invalidateQueries({ queryKey: ['facebook-posts'] })
    queryClient.invalidateQueries({ queryKey: ['linkedin-posts'] })

    const allOk = allResults.every((r) => r.ok)
    if (allOk) {
      setTimeout(() => {
        setResults([])
        setCaption('')
        setImageUrl('')
        setScheduledAt('')
        setTab('create')
      }, 2500)
    }

    setSaving(false)
  }

  const charLimit = CHAR_LIMITS[activePreviewChannel]
  const charCount = caption.length
  const charOver = charCount > charLimit

  return (
    <div className="card space-y-5">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-vemo-dark-900">Post erstellen</h3>
        <div className="flex gap-1 bg-vemo-dark-100 rounded-sm p-1">
          {(['create', 'preview'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
                tab === t
                  ? 'bg-white text-vemo-dark-900 shadow-sm'
                  : 'text-vemo-dark-500 hover:text-vemo-dark-700'
              }`}
            >
              {t === 'create' ? 'Erstellen' : 'Vorschau'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'create' && (
        <div className="space-y-4">
          {/* Tone */}
          <div>
            <label className="text-xs font-semibold text-vemo-dark-600 uppercase tracking-wide mb-2 block">
              Ton
            </label>
            <div className="flex gap-2 flex-wrap">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium border transition-all ${
                    tone === t.value
                      ? 'bg-vemo-green-50 border-vemo-green-400 text-vemo-green-700'
                      : 'border-vemo-dark-200 text-vemo-dark-600 hover:border-vemo-dark-400'
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-vemo-dark-600 uppercase tracking-wide">
                Caption
              </label>
              <button
                onClick={generateCaption}
                disabled={generatingCaption}
                className="text-xs text-vemo-green-600 hover:text-vemo-green-700 font-medium flex items-center gap-1 disabled:opacity-50"
              >
                {generatingCaption ? '⏳ Generiert...' : '✨ KI-Caption generieren'}
              </button>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="Caption schreiben oder KI nutzen..."
              className={`w-full px-3 py-2.5 text-sm border rounded-sm bg-white text-vemo-dark-900 placeholder:text-vemo-dark-400 focus:outline-none focus:ring-2 focus:ring-vemo-green-400 resize-none ${
                charOver ? 'border-red-400' : 'border-vemo-dark-200'
              }`}
            />
            <div className={`text-right text-xs mt-1 ${charOver ? 'text-red-500' : 'text-vemo-dark-400'}`}>
              {charCount} / {charLimit} ({CHANNEL_CONFIG[activePreviewChannel].label})
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <label className="text-xs font-semibold text-vemo-dark-600 uppercase tracking-wide mb-2 block">
              Hashtag-Vorschläge
            </label>
            <div className="flex flex-wrap gap-1.5">
              {HASHTAG_SUGGESTIONS[tone].map((tag) => (
                <button
                  key={tag}
                  onClick={() => addHashtag(tag)}
                  className="px-2.5 py-1 bg-vemo-dark-100 hover:bg-vemo-green-50 hover:text-vemo-green-700 rounded-full text-xs font-medium text-vemo-dark-600 border border-transparent hover:border-vemo-green-300 transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Image */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-vemo-dark-600 uppercase tracking-wide">
                Bild (optional)
              </label>
              <button
                onClick={useMockImage}
                className="text-xs text-vemo-green-600 hover:text-vemo-green-700 font-medium"
              >
                🎲 Demo-Bild
              </button>
            </div>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/bild.jpg"
              className="w-full px-3 py-2 text-sm border border-vemo-dark-200 rounded-sm bg-white text-vemo-dark-900 placeholder:text-vemo-dark-400 focus:outline-none focus:ring-2 focus:ring-vemo-green-400 mb-2"
            />
            {imageUrl ? (
              <div className="relative w-32 h-32 rounded-sm overflow-hidden border border-vemo-dark-200">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-vemo-dark-200 rounded-sm h-16 flex items-center justify-center text-vemo-dark-400 text-sm">
                Kein Bild
              </div>
            )}
          </div>

          {/* Schedule */}
          <div>
            <label className="text-xs font-semibold text-vemo-dark-600 uppercase tracking-wide mb-2 block">
              Zeitplan (optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="px-3 py-2 text-sm border border-vemo-dark-200 rounded-sm bg-white text-vemo-dark-900 focus:outline-none focus:ring-2 focus:ring-vemo-green-400"
            />
          </div>

          {/* Save results */}
          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((r) => (
                <div
                  key={r.channel}
                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded-sm ${
                    r.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  <span>{r.ok ? '✅' : '❌'}</span>
                  <span>
                    {CHANNEL_CONFIG[r.channel].label}:{' '}
                    {r.ok ? 'Gespeichert' : r.error}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 flex-wrap">
            <button
              onClick={() => savePost('draft')}
              disabled={saving || !caption.trim() || charOver}
              className="px-4 py-2 border border-vemo-dark-300 rounded-sm text-sm font-medium text-vemo-dark-700 hover:bg-vemo-dark-50 disabled:opacity-50 transition-all"
            >
              {saving ? '⏳ Speichern...' : 'Als Entwurf speichern'}
            </button>
            <button
              onClick={() => savePost('scheduled')}
              disabled={saving || !caption.trim() || !scheduledAt || charOver}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '⏳ Speichern...' : scheduledAt ? '📅 Planen' : '📅 Planen (Datum wählen)'}
            </button>
          </div>

          {/* Channel summary */}
          <p className="text-xs text-vemo-dark-400">
            Wird gespeichert auf:{' '}
            {selectedChannels.map((ch) => CHANNEL_CONFIG[ch].label).join(', ')}
          </p>
        </div>
      )}

      {tab === 'preview' && (
        <div className="space-y-4">
          {/* Channel switcher for preview */}
          {selectedChannels.length > 1 && (
            <div className="flex gap-2">
              {selectedChannels.map((ch) => (
                <button
                  key={ch}
                  onClick={() => setPreviewChannel(ch)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium border transition-all ${
                    activePreviewChannel === ch
                      ? 'border-vemo-dark-400 bg-vemo-dark-100 text-vemo-dark-900'
                      : 'border-vemo-dark-200 text-vemo-dark-500 hover:border-vemo-dark-400'
                  }`}
                >
                  {CHANNEL_CONFIG[ch].icon} {CHANNEL_CONFIG[ch].label}
                </button>
              ))}
            </div>
          )}

          {/* Preview card */}
          <div className="flex justify-center">
            <ChannelPreview
              channel={activePreviewChannel}
              caption={caption}
              imageUrl={imageUrl}
              scheduledAt={scheduledAt}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ChannelPreview({
  channel,
  caption,
  imageUrl,
  scheduledAt,
}: {
  channel: Channel
  caption: string
  imageUrl: string
  scheduledAt: string
}) {
  const cfg = CHANNEL_CONFIG[channel]

  if (channel === 'instagram') {
    return (
      <div className="w-80 bg-white border border-vemo-dark-200 rounded-lg overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-vemo-dark-100">
          <div className={`w-7 h-7 rounded-full ${cfg.previewBg} flex items-center justify-center text-white text-xs font-bold`}>
            V
          </div>
          <span className="text-sm font-semibold text-vemo-dark-900">vemo.ch</span>
          <span className="ml-auto text-vemo-dark-400">···</span>
        </div>
        {imageUrl ? (
          <img src={imageUrl} alt="Post" className="w-full aspect-square object-cover" />
        ) : (
          <div className="w-full aspect-square bg-vemo-dark-100 flex items-center justify-center text-vemo-dark-400 text-sm">
            📸 Kein Bild
          </div>
        )}
        <div className="px-3 py-3 space-y-1.5">
          <div className="flex gap-3 text-lg">❤️ 💬 ➡️</div>
          <p className="text-sm text-vemo-dark-900 leading-relaxed whitespace-pre-wrap">
            {caption ? (
              <>
                <span className="font-semibold">vemo.ch</span> {caption}
              </>
            ) : (
              <span className="text-vemo-dark-400 italic">Caption erscheint hier...</span>
            )}
          </p>
          {scheduledAt && (
            <p className="text-xs text-vemo-dark-400">
              Geplant: {new Date(scheduledAt).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (channel === 'facebook') {
    return (
      <div className="w-80 bg-white border border-vemo-dark-200 rounded-lg overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-3 py-3 border-b border-vemo-dark-100">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            V
          </div>
          <div>
            <p className="text-sm font-semibold text-vemo-dark-900">Vemo CH</p>
            <p className="text-xs text-vemo-dark-400">Öffentlich · {scheduledAt ? new Date(scheduledAt).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Jetzt'}</p>
          </div>
          <span className="ml-auto text-vemo-dark-400">···</span>
        </div>
        <div className="px-3 py-3">
          {caption ? (
            <p className="text-sm text-vemo-dark-900 leading-relaxed whitespace-pre-wrap">{caption}</p>
          ) : (
            <p className="text-sm text-vemo-dark-400 italic">Text erscheint hier...</p>
          )}
        </div>
        {imageUrl ? (
          <img src={imageUrl} alt="Post" className="w-full object-cover max-h-60" />
        ) : (
          <div className="mx-3 mb-3 border-2 border-dashed border-vemo-dark-200 rounded h-16 flex items-center justify-center text-vemo-dark-400 text-sm">
            📷 Kein Bild
          </div>
        )}
        <div className="px-3 py-2 border-t border-vemo-dark-100">
          <div className="flex gap-4 text-xs text-vemo-dark-500 font-medium">
            <span>👍 Gefällt mir</span>
            <span>💬 Kommentieren</span>
            <span>↗️ Teilen</span>
          </div>
        </div>
      </div>
    )
  }

  // LinkedIn
  return (
    <div className="w-80 bg-white border border-vemo-dark-200 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-vemo-dark-100">
        <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white text-sm font-bold">
          V
        </div>
        <div>
          <p className="text-sm font-semibold text-vemo-dark-900">Vemo CH</p>
          <p className="text-xs text-vemo-dark-400">Finanzbildung · {scheduledAt ? new Date(scheduledAt).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Jetzt'}</p>
        </div>
        <button className="ml-auto text-blue-700 text-xs font-semibold border border-blue-700 rounded-full px-3 py-1">+ Folgen</button>
      </div>
      <div className="px-3 py-3">
        {caption ? (
          <p className="text-sm text-vemo-dark-900 leading-relaxed whitespace-pre-wrap">{caption}</p>
        ) : (
          <p className="text-sm text-vemo-dark-400 italic">Text erscheint hier...</p>
        )}
      </div>
      {imageUrl && (
        <img src={imageUrl} alt="Post" className="w-full object-cover max-h-60" />
      )}
      <div className="px-3 py-2 border-t border-vemo-dark-100">
        <div className="flex gap-4 text-xs text-vemo-dark-500 font-medium">
          <span>👍 Gefällt mir</span>
          <span>💬 Kommentieren</span>
          <span>🔁 Teilen</span>
        </div>
      </div>
    </div>
  )
}
