import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { sendApprovalRequest } from '@/lib/telegram/bot'

// GET /api/approvals — list all approvals (sorted newest first)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') // e.g. "pending"

    const approvals = await prisma.approval.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ approvals })
  } catch (err) {
    console.error('[GET /api/approvals]', err)
    return NextResponse.json({ error: 'Fehler beim Laden der Approvals' }, { status: 500 })
  }
}

// POST /api/approvals — create a new approval (optionally sends to Telegram)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, channel = 'telegram', chatId, metadata, expiresAt } = body

    if (!title) {
      return NextResponse.json({ error: 'title ist erforderlich' }, { status: 400 })
    }

    const approval = await prisma.approval.create({
      data: {
        title,
        description: description ?? null,
        channel,
        chatId: chatId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    // Auto-send to Telegram if channel is telegram and Telegram connector is connected
    let telegramMessageId: number | null = null
    let resolvedChatId = chatId

    if (channel === 'telegram') {
      try {
        const connector = await prisma.connector.findUnique({ where: { id: 'telegram' } })
        if (connector && connector.status === 'connected' && connector.credentials) {
          const raw = JSON.parse(connector.credentials as string)
          const creds: Record<string, string> = Object.fromEntries(
            Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? decrypt(v) : ''])
          )
          const botToken = creds.bot_token
          // Use chat_id from connector credentials if not provided explicitly
          if (!resolvedChatId && creds.chat_id) {
            resolvedChatId = creds.chat_id
          }

          if (botToken && resolvedChatId) {
            telegramMessageId = await sendApprovalRequest(
              botToken,
              resolvedChatId,
              approval.id,
              title,
              description
            )
            if (telegramMessageId !== null) {
              // Update approval with message info
              await prisma.approval.update({
                where: { id: approval.id },
                data: {
                  chatId: resolvedChatId,
                  messageId: String(telegramMessageId),
                },
              })
            }
          }
        }
      } catch (telegramErr) {
        console.error('[POST /api/approvals] Telegram send error:', telegramErr)
        // Don't fail the whole request if Telegram send fails
      }
    }

    const updated = await prisma.approval.findUnique({ where: { id: approval.id } })
    return NextResponse.json({ approval: updated, telegramSent: telegramMessageId !== null }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/approvals]', err)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Approvals' }, { status: 500 })
  }
}
