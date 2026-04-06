'use client'

import { useState, useEffect } from 'react'
import { ConnectorDefinition, ConnectorState } from '@/lib/connectors/types'
import { connectConnector, disconnectConnector, getConnectorState } from '@/lib/connectors/store'

interface Props {
  connector: ConnectorDefinition
  onClose: () => void
  onSaved: (state: ConnectorState) => void
}

export default function ConnectorModal({ connector, onClose, onSaved }: Props) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const isConnected = getConnectorState(connector.id)?.status === 'connected'

  // Pre-fill existing credentials (masked)
  useEffect(() => {
    const existing = getConnectorState(connector.id)
    if (existing?.credentials) {
      setValues(existing.credentials)
    }
  }, [connector.id])

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function toggleShowPassword(key: string) {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setSaving(true)
    // Validate required fields
    for (const field of connector.fields) {
      if (field.required && !values[field.key]?.trim()) {
        alert(`Feld "${field.label}" ist erforderlich.`)
        setSaving(false)
        return
      }
    }
    const state = connectConnector(connector.id, values)
    setSaving(false)
    onSaved(state)
    onClose()
  }

  async function handleDisconnect() {
    if (!confirm(`${connector.name} wirklich trennen? Credentials werden gelöscht.`)) return
    const state = disconnectConnector(connector.id)
    onSaved(state)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg border border-vemo-dark-200 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-vemo-dark-100">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{connector.icon}</span>
            <div>
              <h2 className="text-lg font-semibold text-vemo-dark-900">{connector.name}</h2>
              <p className="text-sm text-vemo-dark-500 mt-0.5">{connector.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-vemo-dark-400 hover:text-vemo-dark-700 transition-colors ml-4 mt-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {connector.fields.length === 0 ? (
            <p className="text-sm text-vemo-dark-500 text-center py-4">
              Dieser Connector benötigt keine Konfiguration.
            </p>
          ) : (
            connector.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-vemo-dark-800 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={
                      field.type === 'password' && !showPasswords[field.key]
                        ? 'password'
                        : field.type === 'password'
                        ? 'text'
                        : field.type
                    }
                    value={values[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="input pr-10"
                    autoComplete="off"
                  />
                  {field.type === 'password' && (
                    <button
                      type="button"
                      onClick={() => toggleShowPassword(field.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-vemo-dark-400 hover:text-vemo-dark-700"
                    >
                      {showPasswords[field.key] ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                {field.helpText && (
                  <p className="mt-1.5 text-xs text-vemo-dark-500">{field.helpText}</p>
                )}
              </div>
            ))
          )}

          {connector.docsUrl && (
            <a
              href={connector.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-vemo-green-600 hover:text-vemo-green-700 font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Dokumentation öffnen
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-vemo-dark-100">
          <div>
            {isConnected && (
              <button
                onClick={handleDisconnect}
                className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                Trennen
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-ghost text-sm px-4 py-2">
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
            >
              {saving ? 'Speichern…' : isConnected ? 'Aktualisieren' : 'Verbinden'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
