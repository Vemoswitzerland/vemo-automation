import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { processCallbackQuery, answerCallbackQuery, editMessage, sendMessage } from '@/lib/telegram/bot'

// POST /api/telegram/webhook — receive Telegram webhook updates
// Register with: https://api.telegram.org/bot{token}/setWebhook?url=https://your-domain/api/telegram/webhook
export async function POST(req: NextRequest) {
  try {
    const update = await req.json()

    // Handle inline button callback queries (approve/reject buttons)
    if (update.callback_query) {
      const callbackQuery = update.callback_query
      const callbackData = callbackQuery.data ?? ''
      const parsed = processCallbackQuery(callbackData)

      if (!parsed) {
        return NextResponse.json({ ok: true })
      }

      const { action, approvalId } = parsed

      // Load approval
      const approval = await prisma.approval.findUnique({ where: { id: approvalId } })
      if (!approval) {
        await answerCallbackQueryWithToken(callbackQuery.id, '⚠️ Approval nicht gefunden')
        return NextResponse.json({ ok: true })
      }

      if (approval.status !== 'pending') {
        await answerCallbackQueryWithToken(
          callbackQuery.id,
          `Bereits ${approval.status === 'approved' ? '✅ approved' : '❌ rejected'}`
        )
        return NextResponse.json({ ok: true })
      }

      // Update approval status
      const now = new Date()
      await prisma.approval.update({
        where: { id: approvalId },
        data: {
          status: action === 'approve' ? 'approved' : 'rejected',
          approvedAt: action === 'approve' ? now : undefined,
          rejectedAt: action === 'reject' ? now : undefined,
        },
      })

      // Answer callback and edit the original message
      const statusIcon = action === 'approve' ? '✅' : '❌'
      const statusText = action === 'approve' ? 'Approved' : 'Rejected'
      const userName =
        callbackQuery.from?.first_name ?? callbackQuery.from?.username ?? 'Unbekannt'

      await answerCallbackQueryWithToken(
        callbackQuery.id,
        `${statusIcon} ${statusText}!`
      )

      if (callbackQuery.message) {
        const chatId = String(callbackQuery.message.chat.id)
        const messageId = callbackQuery.message.message_id

        await editMessageWithToken(
          chatId,
          messageId,
          `${statusIcon} *${statusText}* von ${userName}\n\n*${approval.title}*\n\nID: \`${approvalId}\``
        )
      }

      return NextResponse.json({ ok: true })
    }

    // Handle text commands like /approve <id> or /reject <id>
    if (update.message?.text) {
      const text: string = update.message.text.trim()
      const chatId = String(update.message.chat.id)
      const commandMatch = text.match(/^\/(approve|reject)\s+(\S+)/i)

      if (commandMatch) {
        const action = commandMatch[1].toLowerCase() as 'approve' | 'reject'
        const approvalId = commandMatch[2]

        const approval = await prisma.approval.findUnique({ where: { id: approvalId } })
        if (!approval) {
          await sendMessageWithToken(chatId, `⚠️ Approval \`${approvalId}\` nicht gefunden.`)
          return NextResponse.json({ ok: true })
        }

        if (approval.status !== 'pending') {
          await sendMessageWithToken(chatId, `ℹ️ Approval ist bereits *${approval.status}*.`)
          return NextResponse.json({ ok: true })
        }

        const now = new Date()
        await prisma.approval.update({
          where: { id: approvalId },
          data: {
            status: action === 'approve' ? 'approved' : 'rejected',
            approvedAt: action === 'approve' ? now : undefined,
            rejectedAt: action === 'reject' ? now : undefined,
          },
        })

        const statusIcon = action === 'approve' ? '✅' : '❌'
        const statusText = action === 'approve' ? 'Approved' : 'Rejected'
        await sendMessageWithToken(
          chatId,
          `${statusIcon} *${statusText}*: ${approval.title}\n\nID: \`${approvalId}\``
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/telegram/webhook]', err)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}

// Helper: load bot token from connector and call answerCallbackQuery
async function answerCallbackQueryWithToken(callbackQueryId: string, text?: string) {
  const token = await getBotToken()
  if (!token) return
  const { answerCallbackQuery } = await import('@/lib/telegram/bot')
  await answerCallbackQuery(token, callbackQueryId, text)
}

// Helper: load bot token and edit a message
async function editMessageWithToken(chatId: string, messageId: number, text: string) {
  const token = await getBotToken()
  if (!token) return
  const { editMessage } = await import('@/lib/telegram/bot')
  await editMessage(token, chatId, messageId, text)
}

// Helper: load bot token and send a message
async function sendMessageWithToken(chatId: string, text: string) {
  const token = await getBotToken()
  if (!token) return
  const { sendMessage } = await import('@/lib/telegram/bot')
  await sendMessage(token, chatId, text)
}

async function getBotToken(): Promise<string | null> {
  try {
    const connector = await prisma.connector.findUnique({ where: { id: 'telegram' } })
    if (!connector?.credentials) return null
    const raw = JSON.parse(connector.credentials as string)
    const creds: Record<string, string> = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? decrypt(v) : ''])
    )
    return creds.bot_token ?? null
  } catch {
    return null
  }
}
