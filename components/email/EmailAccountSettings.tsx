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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">E-Mail-Konten</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs">
          + Konto hinzufügen
        </button>
      </div>

      {accounts.length === 0 && !showForm && (
        <p className="text-gray-500 text-sm">Kein E-Mail-Konto konfiguriert.</p>
      )}

      {accounts.map(account => (
        <div key={account.id} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
          <div>
            <div className="font-medium text-white text-sm">{account.name}</div>
            <div className="text-xs text-gray-500">{account.email} — IMAP: {account.imapHost}</div>
            {account.lastSyncAt && (
              <div className="text-xs text-gray-600">
                Zuletzt sync: {new Date(account.lastSyncAt).toLocaleString('de-CH')}
              </div>
            )}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            account.isActive ? 'bg-green-900/50 text-green-300' : 'bg-gray-800 text-gray-500'
          }`}>
            {account.isActive ? 'Aktiv' : 'Inaktiv'}
          </span>
        </div>
      ))}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-gray-800 pt-4">
          <h3 className="text-sm font-medium text-white">Neues E-Mail-Konto</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'name', label: 'Name (z.B. Vemo)', type: 'text' },
              { key: 'email', label: 'E-Mail-Adresse', type: 'email' },
              { key: 'username', label: 'Benutzername (meist = E-Mail)', type: 'text' },
              { key: 'password', label: 'Passwort / App-Passwort', type: 'password' },
              { key: 'imapHost', label: 'IMAP Host', type: 'text' },
              { key: 'smtpHost', label: 'SMTP Host', type: 'text' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs text-gray-500 mb-1 block">{field.label}</label>
                <input
                  type={field.type}
                  value={(form as any)[field.key]}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Speichern...' : 'Konto speichern'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Abbrechen
            </button>
          </div>
          <p className="text-xs text-gray-600">
            ℹ️ Für Gmail: Aktiviere 2FA und erstelle ein App-Passwort unter myaccount.google.com/apppasswords
          </p>
        </form>
      )}
    </div>
  )
}
