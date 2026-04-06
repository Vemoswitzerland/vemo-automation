import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { editMessage, sendMessage } from '@/lib/telegram/bot'

type Params = { params: Promise<{ id: string }> }

// GET /api/approvals/[id] — fetch a single approval
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const approval = await prisma.approval.findUnique({ where: { id } })
    if (!approval) {
      return NextResponse.json({ error: 'Approval nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json({ approval })
  } catch (err) {
    console.error('[GET /api/approvals/[id]]', err)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

// PATCH /api/approvals/[id] — manually approve or reject
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action } = body // 'approve' | 'reject' | 'expire'

    const approval = await prisma.approval.findUnique({ where: { id } })
    if (!approval) {
      return NextResponse.json({ error: 'Approval nicht gefunden' }, { status: 404 })
    }

    if (approval.status !== 'pending') {
      return NextResponse.json(
        { error: `Approval ist bereits ${approval.status}` },
        { status: 409 }
      )
    }

    let newStatus: string
    let now = new Date()

    if (action === 'approve') {
      newStatus = 'approved'
    } else if (action === 'reject') {
      newStatus = 'rejected'
    } else if (action === 'expire') {
      newStatus = 'expired'
    } else {
      return NextResponse.json({ error: 'Ungültige Aktion. Erlaubt: approve | reject | expire' }, { status: 400 })
    }

    const updated = await prisma.approval.update({
      where: { id },
      data: {
        status: newStatus,
        approvedAt: action === 'approve' ? now : undefined,
        rejectedAt: action === 'reject' ? now : undefined,
      },
    })

    // Notify Telegram if the approval was sent there
    if (approval.chatId && approval.messageId) {
      try {
        const connector = await prisma.connector.findUnique({ where: { id: 'telegram' } })
        if (connector?.credentials) {
          const raw = JSON.parse(connector.credentials as string)
          const creds: Record<string, string> = Object.fromEntries(
            Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? decrypt(v) : ''])
          )
          if (creds.bot_token) {
            const statusIcon = action === 'approve' ? '✅' : '❌'
            const statusText = action === 'approve' ? 'Approved' : 'Rejected'
            await editMessage(
              creds.bot_token,
              approval.chatId,
              approval.messageId,
              `${statusIcon} *${statusText}* (manuell)\n\n*${approval.title}*\n\nID: \`${approval.id}\``
            )
          }
        }
      } catch (telegramErr) {
        console.error('[PATCH /api/approvals/[id]] Telegram notify error:', telegramErr)
      }
    }

    return NextResponse.json({ approval: updated })
  } catch (err) {
    console.error('[PATCH /api/approvals/[id]]', err)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}
