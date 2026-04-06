import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getAllChatIds, registerChatId, removeChatId, broadcastMessage } from '@/lib/telegram/notify'

// GET /api/telegram/chats — list all registered chat IDs
export async function GET() {
  try {
    const ids = await getAllChatIds()

    // Get primary chat from connector
    let primaryId: string | null = null
    try {
      const connector = await prisma.connector.findUnique({ where: { id: 'telegram' } })
      if (connector?.credentials) {
        const raw = JSON.parse(connector.credentials as string)
        const creds: Record<string, string> = Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? decrypt(v) : ''])
        )
        primaryId = creds.chat_id ?? null
      }
    } catch { /* ignore */ }

    const extra = await prisma.appSettings.findUnique({ where: { key: 'telegram_extra_chats' } })
    const extraIds: string[] = extra?.value ? JSON.parse(extra.value) : []

    return NextResponse.json({
      chats: ids.map(id => ({
        chatId: id,
        isPrimary: id === primaryId,
        isExtra: extraIds.includes(id),
      })),
      total: ids.length,
    })
  } catch (err) {
    console.error('[GET /api/telegram/chats]', err)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

// POST /api/telegram/chats — register a new chat ID or send a test message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, chatId } = body

    if (!action) return NextResponse.json({ error: 'action erforderlich' }, { status: 400 })

    if (action === 'register') {
      if (!chatId) return NextResponse.json({ error: 'chatId erforderlich' }, { status: 400 })
      await registerChatId(chatId)
      return NextResponse.json({ ok: true, message: `Chat ${chatId} registriert` })
    }

    if (action === 'test') {
      const count = await broadcastMessage(
        '✅ *Vemo Automationszentrale* — Verbindung erfolgreich!\n\nDieser Chat empfängt ab sofort Benachrichtigungen.'
      )
      return NextResponse.json({ ok: true, sent: count })
    }

    return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 })
  } catch (err) {
    console.error('[POST /api/telegram/chats]', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

// DELETE /api/telegram/chats — remove an extra chat ID
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get('chatId')
    if (!chatId) return NextResponse.json({ error: 'chatId erforderlich' }, { status: 400 })
    await removeChatId(chatId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/telegram/chats]', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
