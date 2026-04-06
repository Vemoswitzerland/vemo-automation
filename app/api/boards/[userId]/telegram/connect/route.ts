import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'

// Rate limiter: max 10 connect attempts per userId per 60s
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

function maskToken(token: string): string {
  if (token.length <= 8) return '****'
  return token.slice(0, 4) + '****' + token.slice(-4)
}

const BOARD_TELEGRAM_KEY_PREFIX = 'board_telegram_'

// GET /api/boards/[userId]/telegram/connect — get current telegram config (masked)
export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const key = `${BOARD_TELEGRAM_KEY_PREFIX}${userId}`
    const setting = await prisma.appSettings.findUnique({ where: { key } })
    if (!setting) {
      return NextResponse.json({ connected: false })
    }
    const config = JSON.parse(setting.value) as { botToken: string; chatId?: string; webhookUrl?: string }
    return NextResponse.json({
      connected: true,
      maskedToken: maskToken(decrypt(config.botToken)),
      chatId: config.chatId ? maskToken(config.chatId) : null,
      webhookUrl: config.webhookUrl ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden der Konfiguration' }, { status: 500 })
  }
}

// POST /api/boards/[userId]/telegram/connect — connect telegram bot for this board/user
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    if (!checkRateLimit(userId)) {
      return NextResponse.json({ error: 'Zu viele Anfragen. Bitte 60 Sekunden warten.' }, { status: 429 })
    }

    const body = await req.json()
    const { botToken, chatId } = body as { botToken?: string; chatId?: string }

    if (!botToken || typeof botToken !== 'string' || botToken.trim().length < 10) {
      return NextResponse.json({ error: 'Ungültiger Bot-Token' }, { status: 400 })
    }

    // Validate token against Telegram API
    const validateRes = await fetch(`https://api.telegram.org/bot${botToken.trim()}/getMe`)
    const validateData = await validateRes.json()
    if (!validateData.ok) {
      return NextResponse.json(
        { error: `Ungültiger Bot-Token: ${validateData.description ?? 'Telegram API Fehler'}` },
        { status: 400 }
      )
    }

    const botInfo = validateData.result as { username?: string; first_name?: string }

    // Encrypt and store token
    const encryptedToken = encrypt(botToken.trim())
    const key = `${BOARD_TELEGRAM_KEY_PREFIX}${userId}`

    // Determine webhook URL
    const origin = req.headers.get('x-forwarded-host')
      ? `https://${req.headers.get('x-forwarded-host')}`
      : req.nextUrl.origin
    const webhookUrl = `${origin}/api/telegram/webhook`

    // Register webhook
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    const webhookBody: Record<string, string> = { url: webhookUrl }
    if (webhookSecret) webhookBody.secret_token = webhookSecret

    const webhookRes = await fetch(`https://api.telegram.org/bot${botToken.trim()}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookBody),
    })
    const webhookData = await webhookRes.json()

    const config = {
      botToken: encryptedToken,
      chatId: chatId?.trim() || undefined,
      webhookUrl: webhookData.ok ? webhookUrl : undefined,
      botUsername: botInfo.username,
      botName: botInfo.first_name,
      connectedAt: new Date().toISOString(),
    }

    await prisma.appSettings.upsert({
      where: { key },
      update: { value: JSON.stringify(config) },
      create: { key, value: JSON.stringify(config) },
    })

    // Also update the global Telegram connector if not already connected
    const existingConnector = await prisma.connector.findUnique({ where: { id: 'telegram' } })
    if (!existingConnector || existingConnector.status !== 'connected') {
      const connectorCreds: Record<string, string> = {
        bot_token: encryptedToken,
      }
      if (chatId?.trim()) connectorCreds.chat_id = encrypt(chatId.trim())

      await prisma.connector.upsert({
        where: { id: 'telegram' },
        update: {
          status: 'connected',
          credentials: JSON.stringify(connectorCreds),
          lastTestedAt: new Date(),
          errorMessage: null,
        },
        create: {
          id: 'telegram',
          userId,
          status: 'connected',
          credentials: JSON.stringify(connectorCreds),
          lastTestedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      ok: true,
      botUsername: botInfo.username,
      botName: botInfo.first_name,
      maskedToken: maskToken(botToken.trim()),
      webhookRegistered: webhookData.ok,
      webhookUrl: webhookData.ok ? webhookUrl : null,
    })
  } catch (err) {
    console.error('[POST /api/boards/[userId]/telegram/connect]', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

// DELETE /api/boards/[userId]/telegram/connect — disconnect telegram for this board/user
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const key = `${BOARD_TELEGRAM_KEY_PREFIX}${userId}`
    await prisma.appSettings.deleteMany({ where: { key } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Trennen der Verbindung' }, { status: 500 })
  }
}
