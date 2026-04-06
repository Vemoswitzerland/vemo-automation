import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getConnectorById } from '@/lib/connectors/registry'
import { decrypt } from '@/lib/crypto'

type Params = { params: Promise<{ id: string }> }

// POST /api/connectors/[id]/test — test if connector credentials work
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const def = getConnectorById(id)
  if (!def) return NextResponse.json({ error: 'Connector nicht gefunden' }, { status: 404 })

  const state = await prisma.connector.findUnique({ where: { id } })
  if (!state || state.status === 'disconnected' || !state.credentials) {
    return NextResponse.json({ success: false, message: 'Keine Credentials konfiguriert' })
  }

  let creds: Record<string, string> = {}
  try {
    const raw = JSON.parse(state.credentials as string)
    creds = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? decrypt(v) : ''])
    )
  } catch {
    return NextResponse.json({ success: false, message: 'Fehler beim Lesen der Credentials' })
  }

  // Connector-specific test logic
  try {
    switch (id) {
      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${creds.api_key}` },
        })
        if (res.ok) return NextResponse.json({ success: true, message: 'OpenAI API verbunden ✅' })
        return NextResponse.json({ success: false, message: `OpenAI Fehler: ${res.status} ${res.statusText}` })
      }

      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': creds.api_key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ping' }],
          }),
        })
        if (res.ok || res.status === 400) return NextResponse.json({ success: true, message: 'Anthropic API verbunden ✅' })
        return NextResponse.json({ success: false, message: `Anthropic Fehler: ${res.status} ${res.statusText}` })
      }

      case 'instagram': {
        const token = creds.access_token
        const res = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${token}`)
        if (res.ok) {
          const data = await res.json()
          return NextResponse.json({ success: true, message: `Instagram verbunden: @${data.username} ✅` })
        }
        return NextResponse.json({ success: false, message: `Instagram Fehler: ${res.status}` })
      }

      case 'gmail': {
        // Basic validation — we can't easily test IMAP/SMTP without actually connecting
        if (creds.email && creds.password) {
          return NextResponse.json({ success: true, message: 'Gmail Credentials vorhanden ✅ (IMAP-Test beim ersten Abrufen)' })
        }
        return NextResponse.json({ success: false, message: 'E-Mail oder App-Passwort fehlt' })
      }

      case 'telegram': {
        const res = await fetch(`https://api.telegram.org/bot${creds.bot_token}/getMe`)
        if (res.ok) {
          const data = await res.json()
          return NextResponse.json({ success: true, message: `Telegram Bot: @${data.result?.username} ✅` })
        }
        return NextResponse.json({ success: false, message: `Telegram Fehler: ${res.status}` })
      }

      case 'slack': {
        const res = await fetch('https://slack.com/api/auth.test', {
          headers: { Authorization: `Bearer ${creds.bot_token}` },
        })
        const data = await res.json()
        if (data.ok) return NextResponse.json({ success: true, message: `Slack: ${data.team} ✅` })
        return NextResponse.json({ success: false, message: `Slack Fehler: ${data.error}` })
      }

      default:
        // Generic: if credentials exist, assume connected
        return NextResponse.json({ success: true, message: 'Credentials vorhanden ✅' })
    }
  } catch (err) {
    return NextResponse.json({ success: false, message: `Verbindungstest fehlgeschlagen: ${(err as Error).message}` })
  }
}
