'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

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
    'Hey! Schaut mal, was wir heute mit {thema} gemacht haben 🙌 Was denkt ihr? #Fun #Community',
    'Das mussten wir einfach teilen 😄 {thema} – und ihr? #GoodVibes #Community',
  ],
  motivational: [
    'Jeden Tag eine neue Chance mit {thema}. Bleibt dran, der Weg ist das Ziel! 💪 #Motivation #NeverGiveUp',
    'Grosse Träume beginnen mit kleinen Schritten. {thema} zeigt uns: Es ist möglich! 🚀 #Inspiration',
  ],
}

const HASHTAG_SUGGESTIONS: Record<string, string[]> = {
  professional: ['#Business', '#Innovation', '#Qualität', '#Erfolg', '#Unternehmen', '#Leadership'],
  casual: ['#Community', '#GoodVibes', '#Lifestyle', '#Fun', '#Alltag', '#Zusammen'],
  motivational: ['#Motivation', '#Inspiration', '#NeverGiveUp', '#Erfolg', '#Ziele', '#Wachstum'],
}

const MOCK_IMAGES = [
  'https://picsum.photos/seed/ig1/800/800',
  'https://picsum.photos/seed/ig2/800/800',
  'https://picsum.photos/seed/ig3/800/800',
]

interface PostCreatorProps {
  isMock: boolean
  onSaved?: () => void
}

export default function PostCreator({ isMock, onSaved }: PostCreatorProps) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'create' | 'preview'>('create')
  const [tone, setTone] = useState<'professional' | 'casual' | 'motivational'>('casual')
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)

  const hasApiKey = false // In real app: check OPENAI_API_KEY env

  function generateCaption() {
    setGeneratingCaption(true)
    setTimeout(() => {
      const templates = CAPTION_TEMPLATES[tone]
      const tpl = templates[Math.floor(Math.random() * templates.length)]
      const text = tpl.replace('{thema}', 'unserem neuesten Projekt')
      setCaption(text)
      setGeneratingCaption(false)
    }, 800)
  }

  function addHashtag(tag: string) {
    setCaption(prev => (prev.endsWith(' ') || prev === '' ? prev + tag : prev + ' ' + tag))
  }

  function useMockImage() {
    const img = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)]
    setImageUrl(img)
  }

  function generateImage() {
    if (!hasApiKey) {
      useMockImage()
      return
    }
    setGeneratingImage(true)
    setTimeout(() => {
      useMockImage()
      setGeneratingImage(false)
    }, 1200)
  }

  async function savePost(status: 'draft' | 'scheduled') {
    if (!caption.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          imageUrl: imageUrl || null,
          imagePrompt: imagePrompt || null,
          scheduledAt: scheduledAt || null,
          status: status === 'scheduled' && scheduledAt ? 'scheduled' : 'draft',
        }),
      })
      if (res.ok) {
        setSaved(true)
        queryClient.invalidateQueries({ queryKey: ['instagram-posts'] })
        setTimeout(() => {
          setSaved(false)
          setCaption('')
          setImageUrl('')
          setImagePrompt('')
          setScheduledAt('')
          setTab('create')
          onSaved?.()
        }, 1500)
      }
    } finally {
      setSaving(false)
    }
  }

  const charCount = caption.length
  const charLimit = 2200
  const charOver = charCount > charLimit

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-vemo-dark-900">Neuen Post erstellen</h3>
        <div className="flex gap-1 bg-vemo-dark-100 rounded-sm p-1">
          {['create', 'preview'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
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
          {/* Tone Selection */}
          <div>
            <label className="text-xs font-semibold text-vemo-dark-600 uppercase tracking-wide mb-2 block">
              Ton
            </label>
            <div className="flex gap-2">
              {TONES.map(t => (
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
              onChange={e => setCaption(e.target.value)}
              rows={4}
              placeholder="Schreibe deine Caption oder lass sie von KI generieren..."
              className={`w-full px-3 py-2.5 text-sm border rounded-sm bg-white text-vemo-dark-900 placeholder:text-vemo-dark-400 focus:outline-none focus:ring-2 focus:ring-vemo-green-400 resize-none ${
                charOver ? 'border-red-400' : 'border-vemo-dark-200'
              }`}
            />
            <div className={`text-right text-xs mt-1 ${charOver ? 'text-red-500' : 'text-vemo-dark-400'}`}>
              {charCount} / {charLimit}
            </div>
          </div>

          {/* Hashtag Suggestions */}
          <div>
            <label className="text-xs font-semibold text-vemo-dark-600 uppercase tracking-wide mb-2 block">
              Hashtag-Vorschläge
            </label>
            <div className="flex flex-wrap gap-1.5">
              {HASHTAG_SUGGESTIONS[tone].map(tag => (
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
                Bild
              </label>
              <div className="flex gap-2">
                <button
                  onClick={generateImage}
                  disabled={generatingImage}
                  className="text-xs text-vemo-green-600 hover:text-vemo-green-700 font-medium disabled:opacity-50"
                >
                  {generatingImage
                    ? '⏳ Generiert...'
                    : hasApiKey
                    ? '🎨 DALL-E generieren'
                    : '🎲 Zufallsbild (Demo)'}
                </button>
              </div>
            </div>
            {!hasApiKey && (
              <p className="text-xs text-amber-600 mb-2">
                💡 Kein OPENAI_API_KEY — DALL-E-Generierung nicht verfügbar. Demo-Modus aktiv.
              </p>
            )}
            <input
              type="text"
              value={imagePrompt}
              onChange={e => setImagePrompt(e.target.value)}
              placeholder="Bildbeschreibung für KI (z.B. 'Sunrise over mountains, professional photo')"
              className="w-full px-3 py-2 text-sm border border-vemo-dark-200 rounded-sm bg-white text-vemo-dark-900 placeholder:text-vemo-dark-400 focus:outline-none focus:ring-2 focus:ring-vemo-green-400 mb-2"
            />
            {imageUrl && (
              <div className="relative w-32 h-32 rounded-sm overflow-hidden border border-vemo-dark-200">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            )}
            {!imageUrl && (
              <div className="border-2 border-dashed border-vemo-dark-200 rounded-sm h-20 flex items-center justify-center text-vemo-dark-400 text-sm">
                Kein Bild ausgewählt
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
              onChange={e => setScheduledAt(e.target.value)}
              className="px-3 py-2 text-sm border border-vemo-dark-200 rounded-sm bg-white text-vemo-dark-900 focus:outline-none focus:ring-2 focus:ring-vemo-green-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => savePost('draft')}
              disabled={saving || !caption.trim() || charOver}
              className="px-4 py-2 border border-vemo-dark-300 rounded-sm text-sm font-medium text-vemo-dark-700 hover:bg-vemo-dark-50 disabled:opacity-50 transition-all"
            >
              Als Entwurf speichern
            </button>
            <button
              onClick={() => savePost('scheduled')}
              disabled={saving || !caption.trim() || !scheduledAt || charOver}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '⏳ Speichern...' : saved ? '✅ Gespeichert!' : scheduledAt ? '📅 Planen' : '📅 Planen (Datum wählen)'}
            </button>
          </div>
        </div>
      )}

      {tab === 'preview' && (
        <div className="flex justify-center">
          <div className="w-80 bg-white border border-vemo-dark-200 rounded-lg overflow-hidden shadow-sm">
            {/* Instagram post mock UI */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-vemo-dark-100">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
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
                  Geplant:{' '}
                  {new Date(scheduledAt).toLocaleString('de-CH', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
