'use client'

import { useState, useEffect, useCallback } from 'react'

type Chat = {
  chatId: string
  isPrimary: boolean
  isExtra: boolean
}

export default function TelegramPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [newChatId, setNewChatId] = useState('')
  const [adding, setAdding] = useState(false)
  const [testing, setTesting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const loadChats = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/chats')
      const data = await res.json()
      setChats(data.chats ?? [])
    } catch {
      setMessage({ type: 'error', text: 'Fehler beim Laden der Chats' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChats()
  }, [loadChats])

  async function handleAdd() {
    if (!newChatId.trim()) return
    setAdding(true)
    setMessage(null)
    try {
      const res = await fetch('/api/telegram/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', chatId: newChatId.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'ok', text: `Chat ${newChatId} registriert` })
        setNewChatId('')
        await loadChats()
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Fehler' })
      }
    } finally {
      setAdding(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/telegram/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'ok', text: `Testnachricht an ${data.sent} Chat(s) gesendet` })
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Fehler beim Senden' })
      }
    } finally {
      setTesting(false)
    }
  }

  async function handleRemove(chatId: string) {
    setRemoving(chatId)
    setMessage(null)
    try {
      const res = await fetch(`/api/telegram/chats?chatId=${encodeURIComponent(chatId)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setMessage({ type: 'ok', text: `Chat ${chatId} entfernt` })
        await loadChats()
      } else {
        setMessage({ type: 'error', text: 'Fehler beim Entfernen' })
      }
    } finally {
      setRemoving(null)
    }
  }

  async function handleSetWebhook() {
    setMessage(null)
    try {
      const res = await fetch('/api/telegram/setup-webhook', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.ok) {
        setMessage({ type: 'ok', text: 'Webhook erfolgreich registriert' })
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Webhook-Registrierung fehlgeschlagen' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Fehler beim Registrieren des Webhooks' })
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-vemo-dark-900">Telegram Integration</h1>
        <p className="text-vemo-dark-500 mt-1">
          Verwalte Telegram-Chats, teste die Verbindung und steuere den Bot.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm font-medium ${
            message.type === 'ok'
              ? 'bg-vemo-green-50 text-vemo-green-700 border border-vemo-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'ok' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {/* Bot Commands Reference */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider mb-4">
          Verfügbare Bot-Befehle
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { cmd: '/start', desc: 'Chat registrieren & Willkommens-Nachricht' },
            { cmd: '/status', desc: 'Systemübersicht: Approvals, Drafts, Connectors' },
            { cmd: '/approve <id>', desc: 'Approval per ID genehmigen' },
            { cmd: '/reject <id>', desc: 'Approval per ID ablehnen' },
            { cmd: '/generate', desc: 'Content-Generierung starten' },
            { cmd: '/help', desc: 'Hilfe anzeigen' },
          ].map(({ cmd, desc }) => (
            <div key={cmd} className="flex items-start gap-3 p-3 bg-vemo-dark-50 rounded-md">
              <code className="text-xs bg-vemo-dark-200 px-2 py-1 rounded font-mono text-vemo-dark-900 shrink-0">
                {cmd}
              </code>
              <span className="text-xs text-vemo-dark-600">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Registered Chats */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider">
            Registrierte Chats
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testing || chats.length === 0}
              className="btn-outline text-xs py-1.5 px-3 disabled:opacity-50"
            >
              {testing ? 'Sende...' : '📨 Test senden'}
            </button>
            <button
              onClick={handleSetWebhook}
              className="btn-outline text-xs py-1.5 px-3"
            >
              🔗 Webhook setzen
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-vemo-dark-500">Lade...</div>
        ) : chats.length === 0 ? (
          <div className="text-sm text-vemo-dark-400 text-center py-6">
            Noch keine Chats registriert.<br />
            Sende <code className="bg-vemo-dark-100 px-1 rounded">/start</code> an{' '}
            <strong>@Vemo_builder_bot</strong> oder füge eine Chat-ID unten manuell hinzu.
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.chatId}
                className="flex items-center justify-between p-3 bg-vemo-dark-50 rounded-md"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{chat.isPrimary ? '⭐' : '👤'}</span>
                  <div>
                    <div className="text-sm font-mono text-vemo-dark-900">{chat.chatId}</div>
                    <div className="text-xs text-vemo-dark-400">
                      {chat.isPrimary ? 'Primärer Chat (aus Connector)' : 'Zusätzlicher Chat'}
                    </div>
                  </div>
                </div>
                {chat.isExtra && !chat.isPrimary && (
                  <button
                    onClick={() => handleRemove(chat.chatId)}
                    disabled={removing === chat.chatId}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {removing === chat.chatId ? '...' : '✕ Entfernen'}
                  </button>
                )}
                {chat.isPrimary && (
                  <a
                    href="/connectors/telegram"
                    className="text-xs text-vemo-green-600 hover:underline"
                  >
                    ⚙ Konfigurieren
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new chat */}
        <div className="mt-4 pt-4 border-t border-vemo-dark-200">
          <p className="text-xs text-vemo-dark-500 mb-2">
            Chat-ID manuell hinzufügen (für Boards ohne /start-Zugang):
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newChatId}
              onChange={(e) => setNewChatId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="-100123456789"
              className="input flex-1 text-sm"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newChatId.trim()}
              className="btn-primary text-sm px-4 disabled:opacity-50"
            >
              {adding ? '...' : '+ Hinzufügen'}
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="card p-6 bg-sky-50/50 border-sky-200">
        <h2 className="text-sm font-bold text-sky-800 uppercase tracking-wider mb-3">
          ✈️ Setup-Anleitung
        </h2>
        <ol className="text-sm text-sky-700 space-y-2 list-decimal list-inside">
          <li>
            Bot-Token im <a href="/connectors/telegram" className="underline font-semibold">Telegram Connector</a> konfigurieren
          </li>
          <li>
            Auf <strong>«Webhook setzen»</strong> klicken — oder manuell:{' '}
            <code className="bg-sky-100 px-1 rounded text-xs">
              /setWebhook?url=https://deine-domain.ch/api/telegram/webhook
            </code>
          </li>
          <li>
            <strong>/start</strong> an <strong>@Vemo_builder_bot</strong> senden — Chat wird automatisch registriert
          </li>
          <li>
            Mit <strong>/status</strong> den Systemstatus abfragen
          </li>
        </ol>
      </div>
    </div>
  )
}
