'use client'

import { useState } from 'react'

type Tone = 'professional' | 'casual' | 'motivational'
type Step = 'topic' | 'generating' | 'script' | 'image' | 'video' | 'review'

interface GeneratedContent {
  script: string
  imagePrompt: string
  videoConcept: string
  isMock: boolean
}

interface ContentPipelineProps {
  isMock: boolean
}

const TONES: { value: Tone; label: string; emoji: string; desc: string }[] = [
  { value: 'casual', label: 'Locker', emoji: '😊', desc: 'Freundlich & authentisch' },
  { value: 'professional', label: 'Professionell', emoji: '💼', desc: 'Seriös & kompetent' },
  { value: 'motivational', label: 'Motivierend', emoji: '🔥', desc: 'Energetisch & inspirierend' },
]

const STEPS: { id: Step; label: string; emoji: string }[] = [
  { id: 'topic', label: 'Thema', emoji: '💡' },
  { id: 'script', label: 'Skript', emoji: '📝' },
  { id: 'image', label: 'Bild', emoji: '🎨' },
  { id: 'video', label: 'Video', emoji: '🎬' },
  { id: 'review', label: 'Review', emoji: '✅' },
]

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const visibleSteps = STEPS.filter((s) => s.id !== 'generating')
  const currentIdx = visibleSteps.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex items-center gap-0 mb-8">
      {visibleSteps.map((step, idx) => {
        const isDone = idx < currentIdx
        const isActive = idx === currentIdx
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-vemo-green-500 text-white shadow-sm'
                  : isDone
                  ? 'bg-vemo-green-100 text-vemo-green-700'
                  : 'bg-vemo-dark-100 text-vemo-dark-400'
              }`}
            >
              <span>{isDone ? '✓' : step.emoji}</span>
              <span>{step.label}</span>
            </div>
            {idx < visibleSteps.length - 1 && (
              <div
                className={`h-0.5 w-8 mx-1 rounded ${
                  isDone ? 'bg-vemo-green-300' : 'bg-vemo-dark-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function MockBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium mb-4">
      <span>⚠️</span>
      <span>Mock-Modus — kein ANTHROPIC_API_KEY gesetzt. Inhalte sind Beispiel-Daten.</span>
    </div>
  )
}

export default function ContentPipeline({ isMock }: ContentPipelineProps) {
  const [step, setStep] = useState<Step>('topic')
  const [thema, setThema] = useState('')
  const [tone, setTone] = useState<Tone>('casual')
  const [content, setContent] = useState<GeneratedContent | null>(null)
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedPost, setSavedPost] = useState<{ id: string } | null>(null)
  const [error, setError] = useState('')

  async function handleGenerate() {
    if (!thema.trim()) return
    setStep('generating')
    setError('')

    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thema: thema.trim(), tone }),
      })

      if (!res.ok) throw new Error('Generierung fehlgeschlagen')
      const data: GeneratedContent = await res.json()
      setContent(data)
      setCaption(data.script.split('\n')[0].replace(/^[#*🎬]*\s*/, '').slice(0, 100))
      setStep('script')
    } catch (err) {
      setError('Fehler bei der Generierung. Bitte nochmals versuchen.')
      setStep('topic')
    }
  }

  async function handleSave(status: 'draft' | 'scheduled') {
    if (!content) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          imagePrompt: content.imagePrompt,
          script: content.script,
          videoConcept: content.videoConcept,
          status,
        }),
      })

      if (!res.ok) throw new Error('Speichern fehlgeschlagen')
      const { post } = await res.json()
      setSavedPost(post)
    } catch {
      setError('Fehler beim Speichern.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setStep('topic')
    setThema('')
    setContent(null)
    setCaption('')
    setSavedPost(null)
    setError('')
  }

  if (savedPost) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-10 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-bold text-vemo-dark-900">Content gespeichert!</h2>
          <p className="text-vemo-dark-500">
            Dein Content wurde erfolgreich als Entwurf gespeichert und ist bereit für Review.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <a href="/instagram" className="btn-primary px-6 py-2">
              Instagram-Dashboard
            </a>
            <button onClick={handleReset} className="btn-outline px-6 py-2">
              Neuen Content erstellen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {(isMock || content?.isMock) && <MockBanner />}
      {step !== 'generating' && <StepIndicator currentStep={step} />}

      {error && (
        <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ── STEP 1: TOPIC ── */}
      {step === 'topic' && (
        <div className="card p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-vemo-dark-900 mb-1">Thema eingeben</h2>
            <p className="text-vemo-dark-500 text-sm">
              Gib ein Thema ein und die KI erstellt automatisch Skript, Bild-Prompt und Video-Konzept.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-vemo-dark-700">Thema / Idee</label>
            <input
              type="text"
              value={thema}
              onChange={(e) => setThema(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && thema.trim() && handleGenerate()}
              placeholder="z.B. «Produktivitäts-Tipps für Unternehmer» oder «Neue Kollektion»"
              className="w-full px-4 py-3 rounded-lg border border-vemo-dark-200 bg-white text-vemo-dark-900 placeholder-vemo-dark-400 focus:outline-none focus:ring-2 focus:ring-vemo-green-500 focus:border-transparent text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-vemo-dark-700">Tonalität</label>
            <div className="grid grid-cols-3 gap-3">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`flex flex-col items-center gap-1 p-4 rounded-lg border-2 transition-all text-sm font-medium ${
                    tone === t.value
                      ? 'border-vemo-green-500 bg-vemo-green-50 text-vemo-green-700'
                      : 'border-vemo-dark-200 bg-white text-vemo-dark-600 hover:border-vemo-green-300'
                  }`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span>{t.label}</span>
                  <span className="text-xs opacity-70">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!thema.trim()}
            className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 Content generieren
          </button>
        </div>
      )}

      {/* ── GENERATING LOADING ── */}
      {step === 'generating' && (
        <div className="card p-12 text-center space-y-4">
          <div className="text-4xl animate-pulse">⚡</div>
          <h2 className="text-lg font-bold text-vemo-dark-900">Content wird generiert…</h2>
          <p className="text-vemo-dark-500 text-sm">KI erstellt Skript, Bild-Prompt und Video-Konzept für «{thema}»</p>
          <div className="flex justify-center gap-1 pt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-vemo-green-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2: SCRIPT ── */}
      {step === 'script' && content && (
        <div className="space-y-4">
          <div className="card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-vemo-dark-900">📝 Generiertes Skript</h2>
              <span className="text-xs text-vemo-dark-400 bg-vemo-dark-100 px-2 py-0.5 rounded-full">
                Thema: {thema}
              </span>
            </div>
            <textarea
              value={content.script}
              onChange={(e) => setContent({ ...content, script: e.target.value })}
              rows={12}
              className="w-full px-4 py-3 rounded-lg border border-vemo-dark-200 bg-vemo-dark-50 text-vemo-dark-900 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-vemo-green-500"
            />
            <p className="text-xs text-vemo-dark-400">Du kannst das Skript direkt bearbeiten.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('topic')} className="btn-outline px-5 py-2 text-sm">
              ← Zurück
            </button>
            <button onClick={() => setStep('image')} className="btn-primary px-6 py-2 text-sm ml-auto">
              Weiter: Bild-Prompt →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: IMAGE PROMPT ── */}
      {step === 'image' && content && (
        <div className="space-y-4">
          <div className="card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-vemo-dark-900">🎨 Bild-Prompt</h2>
              <span className="text-xs text-vemo-dark-400">Für DALL-E / Midjourney / Stable Diffusion</span>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wider">So verwendest du diesen Prompt:</p>
              <ol className="text-xs text-purple-600 space-y-1 list-decimal list-inside">
                <li>Kopiere den Prompt unten</li>
                <li>Öffne DALL-E, Midjourney oder Stable Diffusion</li>
                <li>Füge den Prompt ein und generiere das Bild</li>
                <li>Lade das fertige Bild hoch</li>
              </ol>
            </div>
            <textarea
              value={content.imagePrompt}
              onChange={(e) => setContent({ ...content, imagePrompt: e.target.value })}
              rows={8}
              className="w-full px-4 py-3 rounded-lg border border-vemo-dark-200 bg-vemo-dark-50 text-vemo-dark-900 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-vemo-green-500"
            />
            <button
              onClick={() => navigator.clipboard.writeText(content.imagePrompt)}
              className="btn-outline text-xs px-3 py-1.5"
            >
              📋 Prompt kopieren
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('script')} className="btn-outline px-5 py-2 text-sm">
              ← Zurück
            </button>
            <button onClick={() => setStep('video')} className="btn-primary px-6 py-2 text-sm ml-auto">
              Weiter: Video-Konzept →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: VIDEO CONCEPT ── */}
      {step === 'video' && content && (
        <div className="space-y-4">
          <div className="card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-vemo-dark-900">🎬 Video-Konzept</h2>
              <span className="text-xs text-vemo-dark-400">Für Instagram Reels / TikTok</span>
            </div>
            <textarea
              value={content.videoConcept}
              onChange={(e) => setContent({ ...content, videoConcept: e.target.value })}
              rows={14}
              className="w-full px-4 py-3 rounded-lg border border-vemo-dark-200 bg-vemo-dark-50 text-vemo-dark-900 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-vemo-green-500"
            />
            <p className="text-xs text-vemo-dark-400">Szenenaufteilung, Stil und Musik für deinen Reel.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('image')} className="btn-outline px-5 py-2 text-sm">
              ← Zurück
            </button>
            <button onClick={() => setStep('review')} className="btn-primary px-6 py-2 text-sm ml-auto">
              Weiter: Review & Speichern →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: REVIEW ── */}
      {step === 'review' && content && (
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-bold text-vemo-dark-900">✅ Review & Speichern</h2>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-vemo-dark-700">Caption / Post-Text</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="Schreibe hier den finalen Post-Text für Instagram…"
                className="w-full px-4 py-3 rounded-lg border border-vemo-dark-200 bg-white text-vemo-dark-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-vemo-green-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-vemo-dark-50 border border-vemo-dark-100">
                <div className="text-xs font-bold text-vemo-dark-700 mb-1">📝 Skript</div>
                <div className="text-xs text-vemo-dark-500 line-clamp-3">{content.script.slice(0, 120)}…</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                <div className="text-xs font-bold text-purple-700 mb-1">🎨 Bild-Prompt</div>
                <div className="text-xs text-purple-600 line-clamp-3">{content.imagePrompt.slice(0, 120)}…</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div className="text-xs font-bold text-blue-700 mb-1">🎬 Video-Konzept</div>
                <div className="text-xs text-blue-600 line-clamp-3">{content.videoConcept.slice(0, 120)}…</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('video')} className="btn-outline px-5 py-2 text-sm">
              ← Zurück
            </button>
            <div className="flex gap-3 ml-auto">
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="btn-outline px-5 py-2 text-sm disabled:opacity-50"
              >
                {saving ? '⏳ Speichern…' : '💾 Als Entwurf speichern'}
              </button>
              <button
                onClick={() => handleSave('scheduled')}
                disabled={saving}
                className="btn-primary px-6 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? '⏳ Speichern…' : '🚀 Für Review einreichen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
