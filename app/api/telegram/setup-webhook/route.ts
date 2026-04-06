import { NextRequest, NextResponse } from 'next/server'
import { getBotToken } from '@/lib/telegram/notify'

// POST /api/telegram/setup-webhook — register the Telegram webhook URL
export async function POST(req: NextRequest) {
  try {
    const token = await getBotToken()
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Telegram Connector nicht verbunden oder kein Bot-Token konfiguriert' },
        { status: 400 }
      )
    }

    // Determine the public base URL from the request
    const origin = req.headers.get('x-forwarded-host')
      ? `https://${req.headers.get('x-forwarded-host')}`
      : req.nextUrl.origin

    const webhookUrl = `${origin}/api/telegram/webhook`
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET

    const body: Record<string, string> = { url: webhookUrl }
    if (secret) body.secret_token = secret

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!data.ok) {
      return NextResponse.json({ ok: false, error: data.description ?? 'Telegram API Fehler' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, webhookUrl, result: data })
  } catch (err) {
    console.error('[POST /api/telegram/setup-webhook]', err)
    return NextResponse.json({ ok: false, error: 'Interner Fehler' }, { status: 500 })
  }
}
