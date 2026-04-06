'use client'

import { useState } from 'react'

export default function SyncButton() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/emails/fetch', { method: 'POST' })
      const data = await res.json()
      setMessage(data.message || 'Sync abgeschlossen')
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      setMessage('Fehler beim Abrufen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-sm text-gray-400">{message}</span>}
      <button onClick={handleSync} disabled={loading} className="btn-primary disabled:opacity-50">
        {loading ? '⏳ Abrufen...' : '🔄 E-Mails abrufen'}
      </button>
    </div>
  )
}
