import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { broadcastApprovalRequest } from '@/lib/telegram/notify'

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

// POST /api/approvals — create a new approval and broadcast to all registered Telegram chats
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

    // Broadcast approval request to all registered Telegram chats
    let telegramSent = false
    if (channel === 'telegram') {
      try {
        const results = await broadcastApprovalRequest(approval.id, title, description)
        if (results.length > 0) {
          telegramSent = true
          // Store the first result's chatId/messageId on the approval record
          await prisma.approval.update({
            where: { id: approval.id },
            data: {
              chatId: results[0].chatId,
              messageId: String(results[0].messageId),
            },
          })
        }
      } catch (telegramErr) {
        console.error('[POST /api/approvals] Telegram broadcast error:', telegramErr)
        // Don't fail the whole request if Telegram send fails
      }
    }

    const updated = await prisma.approval.findUnique({ where: { id: approval.id } })
    return NextResponse.json({ approval: updated, telegramSent }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/approvals]', err)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Approvals' }, { status: 500 })
  }
}
