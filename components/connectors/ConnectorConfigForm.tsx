'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConnectorWithState } from '@/lib/connectors/types'

interface Props {
  connector: ConnectorWithState
}

export default function ConnectorConfigForm({ connector }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isConnected = connector.state?.status === 'connected'

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

      if (!res.ok) throw new Error('Speichern fehlgeschlagen')
      setMessage({ type: 'success', text: '✅ Connector erfolgreich verbunden!' })
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: '❌ Fehler beim Speichern. Bitte Eingaben prüfen.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Verbindung wirklich trennen und Credentials löschen?')) return
    setDisconnecting(true)
    setMessage(null)

    try {
      await fetch(`/api/connectors/${connector.id}`, { method: 'DELETE' })
      setMessage({ type: 'success', text: '⚫ Connector getrennt.' })
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: '❌ Fehler beim Trennen.' })
    } finally {
      setDisconnecting(false)
    }
  }

  if (connector.fields.length === 0) {
    return (
      <div className="card">
        <p className="text-vemo-dark-400 text-sm">
          Dieser Connector benötigt keine Konfiguration — er ist über Webhooks zugänglich.
        </p>
        {!isConnected && (
          <button
            onClick={() => fetch(`/api/connectors/${connector.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"credentials":{}}' }).then(() => router.refresh())}
            className="mt-4 btn-primary text-sm"
          >
            Aktivieren
          </button>
        )}
        {isConnected && (
          <button onClick={handleDisconnect} className="mt-4 btn-secondary text-sm text-red-400 hover:text-red-300">
            Deaktivieren
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-vemo-dark-900 mb-4">Konfiguration</h2>

      {message && (
        <div className={`text-sm mb-4 p-3 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-900/30 text-green-300 border border-green-800'
            : 'bg-red-900/30 text-red-300 border border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {connector.fields.map((field) => (
          <div key={field.key}>
            <label className="text-xs text-vemo-dark-400 mb-1.5 block">
              {field.label}
              {field.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              required={field.required}
              className="w-full bg-vemo-dark-800 border border-vemo-dark-700 rounded-lg px-3 py-2.5 text-sm text-vemo-dark-100 placeholder-vemo-dark-500 focus:outline-none focus:border-vemo-green-500 transition-colors"
            />
            {field.helpText && (
              <p className="text-xs text-vemo-dark-500 mt-1">{field.helpText}</p>
            )}
          </div>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saving ? 'Speichere...' : isConnected ? '🔄 Credentials aktualisieren' : '🔗 Verbinden'}
          </button>

          {isConnected && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              {disconnecting ? 'Trenne...' : '⚫ Trennen'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
