'use client'

import { useState, useEffect } from 'react'

type ConnectionStatus = 'idle' | 'connected' | 'error'

export default function SettingsPage() {
  // Section 1: Claude API
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [testingConnection, setTestingConnection] = useState(false)

  // Section 2: General
  const [appName, setAppName] = useState('Automationszentrale')
  const [defaultModel, setDefaultModel] = useState('claude-sonnet-4-6')
  const [heartbeat, setHeartbeat] = useState(30)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load current settings on mount
  useEffect(() => {
    fetch('/api/settings/credentials')
      .then((res) => res.json())
      .then((data) => {
        if (data.ANTHROPIC_API_KEY) {
          setConnectionStatus('connected')
        }
      })
      .catch(() => {
        // ignore load errors
      })
  }, [])

  async function testConnection() {
    if (!apiKey.trim()) return
    setTestingConnection(true)
    setConnectionStatus('idle')
    try {
      const res = await fetch('/api/settings/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: { ANTHROPIC_API_KEY: apiKey },
        }),
      })
      if (res.ok) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('error')
      }
    } catch {
      setConnectionStatus('error')
    } finally {
      setTestingConnection(false)
    }
  }

  async function saveGeneral() {
    setSaving(true)
    setSaveSuccess(false)
    try {
      await fetch('/api/settings/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: {
            APP_NAME: appName,
            DEFAULT_AI_MODEL: defaultModel,
            AGENT_HEARTBEAT_SECONDS: String(heartbeat),
          },
        }),
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const statusDot =
    connectionStatus === 'connected'
      ? 'bg-green-500'
      : connectionStatus === 'error'
        ? 'bg-red-500'
        : 'bg-gray-300'

  const statusText =
    connectionStatus === 'connected'
      ? 'Verbunden'
      : connectionStatus === 'error'
        ? 'Fehler'
        : 'Nicht verbunden'

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>

      {/* Section 1: Claude API */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Claude Verbindung</h2>
          <p className="text-sm text-gray-500 mt-1">
            Verbinde dein Claude-Abo für AI-Funktionen
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
          <span className="text-gray-600">{statusText}</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modell</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            >
              <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
              <option value="claude-opus-4-6">claude-opus-4-6</option>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001</option>
            </select>
          </div>

          <button
            onClick={testConnection}
            disabled={testingConnection || !apiKey.trim()}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testingConnection ? 'Teste...' : 'Verbindung testen'}
          </button>
        </div>
      </div>

      {/* Section 2: General */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Allgemein</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Standard AI-Modell
          </label>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
          >
            <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
            <option value="claude-opus-4-6">claude-opus-4-6</option>
            <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agent Heartbeat (Sekunden)
          </label>
          <input
            type="number"
            value={heartbeat}
            onChange={(e) => setHeartbeat(Number(e.target.value))}
            min={5}
            max={300}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <button
          onClick={saveGeneral}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Speichern...' : saveSuccess ? 'Gespeichert!' : 'Speichern'}
        </button>
      </div>

      {/* Section 3: About */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Über</h2>
        <p className="text-sm text-gray-500">Vemo Automationszentrale v0.1.0</p>
        <a
          href="https://github.com/Vemoswitzerland/vemo-automation"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-green-600 hover:text-green-700 hover:underline"
        >
          GitHub Repository
        </a>
      </div>
    </div>
  )
}
