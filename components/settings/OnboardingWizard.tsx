'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface WizardStep {
  connectorId: string
  icon: string
  name: string
  description: string
  fields: { key: string; label: string; type: 'text' | 'password'; placeholder: string; required: boolean; helpText?: string }[]
  docsUrl?: string
}

const WIZARD_STEPS: WizardStep[] = [
  {
    connectorId: 'anthropic',
    icon: '🤖',
    name: 'Anthropic Claude',
    description: 'KI-Kern für alle Automatisierungen — E-Mail-Drafts, Content-Generierung, Analysen',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-...', required: true, helpText: 'console.anthropic.com → API Keys' },
    ],
    docsUrl: 'https://console.anthropic.com',
  },
  {
    connectorId: 'openai',
    icon: '🧠',
    name: 'OpenAI',
    description: 'GPT-4 und DALL-E für Bildgenerierung und erweiterte Textverarbeitung',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true, helpText: 'platform.openai.com → API Keys' },
    ],
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    connectorId: 'instagram',
    icon: '📸',
    name: 'Instagram',
    description: 'Posts, Stories und Reels automatisch veröffentlichen',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'IGQV...', required: true, helpText: 'Meta Business Manager → Graph API Explorer' },
      { key: 'business_account_id', label: 'Business Account ID', type: 'text', placeholder: '12345678', required: true },
    ],
    docsUrl: 'https://developers.facebook.com/tools/explorer/',
  },
  {
    connectorId: 'gmail',
    icon: '📧',
    name: 'Gmail',
    description: 'E-Mails automatisch abrufen und KI-Antworten generieren',
    fields: [
      { key: 'email', label: 'E-Mail Adresse', type: 'text', placeholder: 'du@gmail.com', required: true },
      { key: 'password', label: 'App-Passwort', type: 'password', placeholder: 'xxxx xxxx xxxx xxxx', required: true, helpText: 'Google → Konto → Sicherheit → App-Passwörter' },
    ],
    docsUrl: 'https://myaccount.google.com/apppasswords',
  },
  {
    connectorId: 'telegram',
    icon: '✈️',
    name: 'Telegram',
    description: 'Benachrichtigungen und Nachrichten über Telegram-Bot senden/empfangen',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: '123456789:AAEjL...', required: true, helpText: '@BotFather → /newbot' },
      { key: 'chat_id', label: 'Chat ID', type: 'text', placeholder: '-100123456789', required: false, helpText: '@userinfobot → deine Chat-ID' },
    ],
    docsUrl: 'https://t.me/BotFather',
  },
]

export default function OnboardingWizard({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [values, setValues] = useState<Record<string, string>>({})
  const [showPass, setShowPass] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [finished, setFinished] = useState(false)

  const step = WIZARD_STEPS[currentStep]
  const progress = completedSteps.size

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      // Validate required fields
      for (const field of step.fields) {
        if (field.required && !values[field.key]?.trim()) {
          setMessage({ type: 'error', text: `"${field.label}" ist ein Pflichtfeld.` })
          setSaving(false)
          return
        }
      }

      const res = await fetch(`/api/connectors/${step.connectorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: values }),
      })
      if (!res.ok) throw new Error()

      setCompletedSteps((prev) => { const s = new Set(prev); s.add(currentStep); return s })
      setMessage({ type: 'success', text: `✅ ${step.name} verbunden!` })
      router.refresh()

      // Auto-advance after short delay
      setTimeout(() => {
        setValues({})
        setMessage(null)
        if (currentStep < WIZARD_STEPS.length - 1) {
          setCurrentStep((s) => s + 1)
        } else {
          setFinished(true)
          onComplete?.()
        }
      }, 1200)
    } catch {
      setMessage({ type: 'error', text: '❌ Fehler beim Speichern' })
    } finally {
      setSaving(false)
    }
  }

  function skipStep() {
    setValues({})
    setMessage(null)
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      setFinished(true)
      onComplete?.()
    }
  }

  if (finished) {
    return (
      <div className="card border-vemo-green-200 bg-vemo-green-50 text-center py-10">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-vemo-green-800 mb-2">Setup abgeschlossen!</h3>
        <p className="text-vemo-green-700 text-sm mb-1">
          {completedSteps.size} von {WIZARD_STEPS.length} Connectors konfiguriert
        </p>
        <p className="text-vemo-dark-500 text-xs">
          Du kannst weitere Connectors jederzeit unten in der Liste konfigurieren.
        </p>
      </div>
    )
  }

  return (
    <div className="card border-2 border-vemo-green-200 bg-gradient-to-br from-vemo-green-50/50 to-white">
      {/* Wizard header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-vemo-green-500 flex items-center justify-center text-white font-bold text-lg">
          ⚡
        </div>
        <div>
          <h3 className="font-bold text-vemo-dark-900">Erste Schritte — Setup Wizard</h3>
          <p className="text-xs text-vemo-dark-500">Richte die wichtigsten Connectors ein</p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {WIZARD_STEPS.map((s, i) => (
          <button
            key={s.connectorId}
            onClick={() => { setValues({}); setMessage(null); setCurrentStep(i) }}
            className="flex flex-col items-center gap-1 min-w-[3.5rem] group"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
              completedSteps.has(i)
                ? 'bg-vemo-green-500 border-vemo-green-500 text-white'
                : i === currentStep
                ? 'bg-white border-vemo-green-500 text-vemo-dark-900 shadow-sm'
                : 'bg-vemo-dark-100 border-vemo-dark-200 text-vemo-dark-500 opacity-60'
            }`}>
              {completedSteps.has(i) ? '✓' : s.icon}
            </div>
            <span className={`text-xs font-medium whitespace-nowrap ${
              i === currentStep ? 'text-vemo-green-700' : 'text-vemo-dark-400'
            }`}>
              {s.name.split(' ')[0]}
            </span>
          </button>
        ))}
        {/* Progress connector lines */}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-vemo-dark-500 mb-1">
          <span>{progress} von {WIZARD_STEPS.length} konfiguriert</span>
          <span>{Math.round((progress / WIZARD_STEPS.length) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-vemo-dark-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-vemo-green-500 rounded-full transition-all duration-500"
            style={{ width: `${(progress / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current step */}
      <div className="bg-white rounded-lg border border-vemo-dark-200 p-5">
        <div className="flex items-start gap-4 mb-4">
          <span className="text-4xl">{step.icon}</span>
          <div>
            <h4 className="font-semibold text-vemo-dark-900">{step.name}</h4>
            <p className="text-sm text-vemo-dark-500 mt-0.5">{step.description}</p>
            {step.docsUrl && (
              <a
                href={step.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-vemo-green-600 hover:underline mt-1 inline-block"
              >
                📖 Docs / API Key holen →
              </a>
            )}
          </div>
        </div>

        {message && (
          <div className={`mb-4 text-sm p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-vemo-green-50 text-vemo-green-700 border border-vemo-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-3">
          {step.fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-vemo-dark-600 mb-1 block">
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <div className="relative">
                <input
                  type={field.type === 'password' && !showPass[field.key] ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={values[field.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  className="input w-full pr-10"
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => ({ ...v, [field.key]: !v[field.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-vemo-dark-400 hover:text-vemo-dark-700 text-xs"
                  >
                    {showPass[field.key] ? '🙈' : '👁️'}
                  </button>
                )}
              </div>
              {field.helpText && (
                <p className="text-xs text-vemo-dark-400 mt-1">{field.helpText}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Speichere...' : `🔗 ${step.name} verbinden`}
          </button>
          <button
            onClick={skipStep}
            className="text-sm text-vemo-dark-400 hover:text-vemo-dark-600 transition-colors"
          >
            Überspringen →
          </button>
        </div>
      </div>
    </div>
  )
}
