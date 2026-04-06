'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConnectorWithState, CATEGORY_LABELS, ConnectorCategory } from '@/lib/connectors/types'

interface Props {
  connectors: ConnectorWithState[]
}

const STATUS_CONFIG = {
  connected: { label: 'Verbunden', dot: 'bg-green-400', text: 'text-green-400', badge: 'bg-green-900/40 text-green-300 border-green-800' },
  disconnected: { label: 'Nicht konfiguriert', dot: 'bg-gray-500', text: 'text-gray-400', badge: 'bg-gray-800 text-gray-400 border-gray-700' },
  error: { label: 'Fehler', dot: 'bg-red-500', text: 'text-red-400', badge: 'bg-red-900/40 text-red-300 border-red-800' },
  pending: { label: 'Ausstehend', dot: 'bg-yellow-500', text: 'text-yellow-400', badge: 'bg-yellow-900/40 text-yellow-300 border-yellow-800' },
}

function ConnectorRow({ connector }: { connector: ConnectorWithState }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [showPass, setShowPass] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [localStatus, setLocalStatus] = useState(connector.state?.status ?? 'disconnected')

  const cfg = STATUS_CONFIG[localStatus] ?? STATUS_CONFIG.disconnected

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/connectors/${connector.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: values }),
      })
      if (!res.ok) throw new Error()
      setLocalStatus('connected')
      setMessage({ type: 'success', text: '✅ Gespeichert und verbunden' })
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: '❌ Fehler beim Speichern' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/connectors/${connector.id}/test`, { method: 'POST' })
      const data = await res.json()
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message ?? (data.success ? '✅ Verbindung erfolgreich' : '❌ Test fehlgeschlagen'),
      })
    } catch {
      setMessage({ type: 'error', text: '❌ Test fehlgeschlagen' })
    } finally {
      setTesting(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm(`${connector.name} wirklich trennen?`)) return
    await fetch(`/api/connectors/${connector.id}`, { method: 'DELETE' })
    setLocalStatus('disconnected')
    setValues({})
    setMessage({ type: 'success', text: '⚫ Getrennt' })
    router.refresh()
  }

  return (
    <div className={`border rounded-lg transition-all ${
      expanded ? 'border-vemo-dark-600 bg-vemo-dark-900' : 'border-vemo-dark-700 bg-vemo-dark-800/50'
    }`}>
      {/* Row header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-vemo-dark-800/80 transition-colors rounded-lg"
      >
        <span className="text-2xl w-8 text-center">{connector.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-vemo-dark-100 text-sm">{connector.name}</span>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${localStatus === 'connected' ? 'animate-pulse' : ''}`} />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-vemo-dark-500 truncate mt-0.5">{connector.description}</p>
        </div>
        <span className="text-vemo-dark-500 text-xs ml-2">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded form */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-vemo-dark-700">
          {message && (
            <div className={`mt-4 text-sm p-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-900/30 text-green-300 border border-green-800'
                : 'bg-red-900/30 text-red-300 border border-red-800'
            }`}>
              {message.text}
            </div>
          )}

          {connector.fields.length === 0 ? (
            <div className="mt-4">
              <p className="text-sm text-vemo-dark-400 mb-3">
                Dieser Connector benötigt keine API-Credentials.
              </p>
              {localStatus !== 'connected' ? (
                <button
                  onClick={() => fetch(`/api/connectors/${connector.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{"credentials":{}}',
                  }).then(() => { setLocalStatus('connected'); router.refresh() })}
                  className="btn-primary text-sm"
                >
                  Aktivieren
                </button>
              ) : (
                <button onClick={handleDisconnect} className="text-sm text-red-400 hover:text-red-300">
                  Deaktivieren
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {connector.fields.map((field) => (
                  <div key={field.key}>
                    <label className="text-xs text-vemo-dark-400 mb-1 block">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={field.type === 'password' && !showPass[field.key] ? 'password' : 'text'}
                        placeholder={localStatus === 'connected' && field.type === 'password' ? '••••••••' : field.placeholder}
                        value={values[field.key] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                        required={field.required && localStatus !== 'connected'}
                        className="w-full bg-vemo-dark-900 border border-vemo-dark-600 rounded-lg px-3 py-2 text-sm text-vemo-dark-100 placeholder-vemo-dark-500 focus:outline-none focus:border-vemo-green-500 transition-colors pr-8"
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => setShowPass((v) => ({ ...v, [field.key]: !v[field.key] }))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-vemo-dark-500 hover:text-vemo-dark-300 text-xs"
                        >
                          {showPass[field.key] ? '🙈' : '👁️'}
                        </button>
                      )}
                    </div>
                    {field.helpText && (
                      <p className="text-xs text-vemo-dark-500 mt-1">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
                  {saving ? 'Speichere...' : localStatus === 'connected' ? '🔄 Aktualisieren' : '🔗 Verbinden'}
                </button>
                {localStatus === 'connected' && (
                  <>
                    <button
                      type="button"
                      onClick={handleTest}
                      disabled={testing}
                      className="btn-secondary text-sm disabled:opacity-50"
                    >
                      {testing ? 'Teste...' : '🧪 Verbindung testen'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      ⚫ Trennen
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

export default function CredentialManager({ connectors }: Props) {
  const [activeCategory, setActiveCategory] = useState<ConnectorCategory | 'all'>('all')

  const categories = Object.keys(CATEGORY_LABELS) as ConnectorCategory[]
  const connected = connectors.filter((c) => c.state?.status === 'connected').length
  const total = connectors.length

  const filtered = activeCategory === 'all'
    ? connectors
    : connectors.filter((c) => c.category === activeCategory)

  const grouped = activeCategory === 'all'
    ? categories
        .map((cat) => ({ key: cat, label: CATEGORY_LABELS[cat], items: connectors.filter((c) => c.category === cat) }))
        .filter((g) => g.items.length > 0)
    : [{ key: activeCategory, label: CATEGORY_LABELS[activeCategory], items: filtered }]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-400">{connected}</div>
          <div className="text-xs text-vemo-dark-500 mt-1">Verbunden</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-red-400">{total - connected}</div>
          <div className="text-xs text-vemo-dark-500 mt-1">Nicht konfiguriert</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-vemo-dark-200">{total}</div>
          <div className="text-xs text-vemo-dark-500 mt-1">Gesamt</div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-vemo-dark-500 font-medium">
          <span>Setup-Fortschritt</span>
          <span>{Math.round((connected / total) * 100)}%</span>
        </div>
        <div className="h-2 bg-vemo-dark-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-vemo-green-500 to-vemo-green-400 rounded-full transition-all duration-500"
            style={{ width: `${(connected / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Onboarding hint */}
      {connected === 0 && (
        <div className="card border-yellow-800 bg-yellow-900/20">
          <div className="flex gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-semibold text-yellow-300 text-sm">Erste Schritte</p>
              <p className="text-xs text-yellow-400/80 mt-1">
                Konfiguriere mindestens einen Connector, um mit der Automatisierungszentrale zu starten.
                Empfohlen: <strong>OpenAI</strong> oder <strong>Anthropic Claude</strong> für KI-Features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            activeCategory === 'all'
              ? 'bg-vemo-green-600 text-white border-vemo-green-600'
              : 'text-vemo-dark-400 border-vemo-dark-600 hover:border-vemo-dark-400'
          }`}
        >
          Alle ({total})
        </button>
        {categories.map((cat) => {
          const items = connectors.filter((c) => c.category === cat)
          if (!items.length) return null
          const connectedCount = items.filter((c) => c.state?.status === 'connected').length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                activeCategory === cat
                  ? 'bg-vemo-green-600 text-white border-vemo-green-600'
                  : 'text-vemo-dark-400 border-vemo-dark-600 hover:border-vemo-dark-400'
              }`}
            >
              {CATEGORY_LABELS[cat]} ({connectedCount}/{items.length})
            </button>
          )
        })}
      </div>

      {/* Connector list */}
      <div className="space-y-8">
        {grouped.map((group) => (
          <section key={group.key}>
            {activeCategory === 'all' && (
              <h3 className="text-xs font-semibold uppercase tracking-wider text-vemo-dark-500 mb-3">
                {group.label}
              </h3>
            )}
            <div className="space-y-2">
              {group.items.map((connector) => (
                <ConnectorRow key={connector.id} connector={connector} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
