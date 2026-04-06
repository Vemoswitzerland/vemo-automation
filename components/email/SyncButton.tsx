'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export default function SyncButton() {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setMessage('Verbinde...')

    try {
      const res = await fetch('/api/emails/fetch/stream')
      if (!res.body) throw new Error('Kein Stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''

        for (const chunk of chunks) {
          const dataLine = chunk.split('\n').find(l => l.startsWith('data: '))
          if (!dataLine) continue

          try {
            const event = JSON.parse(dataLine.slice(6))
            if (event.type === 'status') {
              setMessage(event.message)
            } else if (event.type === 'progress') {
              setMessage(`${event.count} E-Mail(s) verarbeitet...`)
            } else if (event.type === 'done') {
              setMessage(event.message)
              await queryClient.invalidateQueries({ queryKey: ['emails'] })
            } else if (event.type === 'error') {
              setMessage(`Fehler: ${event.message}`)
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (e) {
      setMessage('Fehler beim Abrufen')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-sm text-vemo-dark-600">{message}</span>}
      <button onClick={handleSync} disabled={loading} className="btn-primary disabled:opacity-50">
        {loading ? '⏳ Abrufen...' : '🔄 E-Mails abrufen'}
      </button>
    </div>
  )
}
