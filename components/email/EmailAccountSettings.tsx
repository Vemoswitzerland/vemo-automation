'use client'

import { useState, useEffect } from 'react'

interface Account {
  id: string
  name: string
  email: string
  imapHost: string
  imapPort: number
  smtpHost: string
  smtpPort: number
  username: string
  isActive: boolean
  lastSyncAt: string | null
  authType?: string
  gmailWatchExpiry?: string | null
}

const defaultForm = {
  name: '',
  email: '',
  imapHost: 'imap.gmail.com',
  imapPort: 993,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  username: '',
  password: '',
  isActive: true,
}

export default function EmailAccountSettings() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/emails/accounts').then(r => r.json()).then(setAccounts).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/emails/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const data = await res.json()
        setAccounts(prev => [...prev, data])
        setForm(defaultForm)
        setShowForm(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-vemo-dark-900">E-Mail-Konten</h2>
        <div className="flex gap-2">
          <a
            href="/api/gmail/auth"
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Gmail-Konto mit OAuth2 verbinden (empfohlen)"
          >
            <span>📧</span> Gmail OAuth verbinden
          </a>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs">
            + IMAP/SMTP Konto
          </button>
        </div>
      </div>

      {accounts.length === 0 && !showForm && (
        <div className="text-center py-8 space-y-3">
          <p className="text-vemo-dark-600 text-sm">Kein E-Mail-Konto konfiguriert.</p>
          <p className="text-xs text-vemo-dark-500">
            Verbinde ein Gmail-Konto via OAuth oder füge IMAP-Zugangsdaten manuell hinzu.
          </p>
        </div>
      )}

      {accounts.map(account => (
        <div key={account.id} className="flex items-center justify-between py-4 border-b border-vemo-dark-200 last:border-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="font-medium text-vemo-dark-900 text-sm">{account.name}</div>
              {account.authType === 'oauth2' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">OAuth2</span>
              )}
            </div>
            <div className="text-xs text-vemo-dark-600 mt-0.5">{account.email} — IMAP: {account.imapHost}</div>
            {account.lastSyncAt && (
              <div className="text-xs text-vemo-dark-500 mt-1">
                Zuletzt sync: {new Date(account.lastSyncAt).toLocaleString('de-CH')}
              </div>
            )}
            {account.authType === 'oauth2' && account.gmailWatchExpiry && (
              <div className="text-xs text-vemo-dark-500 mt-0.5">
                Push-Watch aktiv bis: {new Date(account.gmailWatchExpiry).toLocaleDateString('de-CH')}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 ml-4">
            {account.authType === 'oauth2' && (
              <a
                href={`/api/gmail/auth?accountId=${account.id}`}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Neu verbinden
              </a>
            )}
            <span className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap ${
              account.isActive ? 'bg-vemo-green-50 text-vemo-green-700' : 'bg-vemo-dark-100 text-vemo-dark-600'
            }`}>
              {account.isActive ? '✅ Aktiv' : '⚪ Inaktiv'}
            </span>
          </div>
        </div>
      ))}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 border-t border-vemo-dark-200 pt-6">
          <h3 className="text-sm font-semibold text-vemo-dark-900">IMAP/SMTP-Konto hinzufügen</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Name (z.B. Vemo)', type: 'text' },
              { key: 'email', label: 'E-Mail-Adresse', type: 'email' },
              { key: 'username', label: 'Benutzername (meist = E-Mail)', type: 'text' },
              { key: 'password', label: 'Passwort / App-Passwort', type: 'password' },
              { key: 'imapHost', label: 'IMAP Host', type: 'text' },
              { key: 'smtpHost', label: 'SMTP Host', type: 'text' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs font-medium text-vemo-dark-700 mb-2 block">{field.label}</label>
                <input
                  type={field.type}
                  value={(form as any)[field.key]}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="input"
                  required
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50 text-sm">
              {loading ? 'Speichern...' : 'Konto speichern'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">
              Abbrechen
            </button>
          </div>
          <p className="text-xs text-vemo-dark-600 bg-vemo-dark-100 p-3 rounded-sm mt-3">
            ℹ️ Für Gmail empfehlen wir OAuth (Button oben). Alternativ: 2FA aktivieren und App-Passwort erstellen unter myaccount.google.com/apppasswords
          </p>
        </form>
      )}
    </div>
  )
}
