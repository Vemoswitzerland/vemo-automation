import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import {
  pollUpdates,
  processCallbackQuery,
  answerCallbackQuery,
  editMessage,
  sendMessage,
} from '@/lib/telegram/bot'

// POST /api/telegram/poll — trigger a manual poll of Telegram updates
// Called by the UI to check for new approve/reject responses.
// Stores offset in AppSettings table to avoid re-processing updates.
export async function POST(_req: NextRequest) {
  try {
    // Load Telegram bot token from connector
    const connector = await prisma.connector.findUnique({ where: { id: 'telegram' } })
    if (!connector || connector.status !== 'connected' || !connector.credentials) {
      return NextResponse.json({ error: 'Telegram Connector nicht verbunden' }, { status: 400 })
    }

    let creds: Record<string, string> = {}
    try {
      const raw = JSON.parse(connector.credentials as string)
      creds = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? decrypt(v) : ''])
      )
    } catch {
      return NextResponse.json({ error: 'Fehler beim Lesen der Telegram-Credentials' }, { status: 500 })
    }

    const botToken = creds.bot_token
    if (!botToken) {
      return NextResponse.json({ error: 'Kein Bot-Token konfiguriert' }, { status: 400 })
    }

    // Load last offset from AppSettings
    const offsetSetting = await prisma.appSettings.findUnique({
      where: { key: 'telegram_poll_offset' },
    })
    let offset = offsetSetting ? parseInt(offsetSetting.value, 10) : 0
    if (isNaN(offset)) offset = 0

    // Poll Telegram
    const updates = await pollUpdates(botToken, offset)
    const processed: string[] = []
    let maxUpdateId = offset - 1

    for (const update of updates) {
      if (update.update_id > maxUpdateId) maxUpdateId = update.update_id

      // Handle callback_query (inline button presses)
      if (update.callback_query) {
        const callbackQuery = update.callback_query
        const callbackData = callbackQuery.data ?? ''
        const parsed = processCallbackQuery(callbackData)

        if (parsed) {
          const { action, approvalId } = parsed
          const approval = await prisma.approval.findUnique({ where: { id: approvalId } })

          if (!approval) {
            await answerCallbackQuery(botToken, callbackQuery.id, '⚠️ Nicht gefunden')
          } else if (approval.status !== 'pending') {
            await answerCallbackQuery(
              botToken,
              callbackQuery.id,
              `Bereits ${approval.status === 'approved' ? '✅' : '❌'} ${approval.status}`
            )
          } else {
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
            const userName =
              callbackQuery.from?.first_name ?? callbackQuery.from?.username ?? 'Unbekannt'

            await answerCallbackQuery(botToken, callbackQuery.id, `${statusIcon} ${statusText}!`)

            if (callbackQuery.message) {
              const chatId = String(callbackQuery.message.chat.id)
              const messageId = callbackQuery.message.message_id
              await editMessage(
                botToken,
                chatId,
                messageId,
                `${statusIcon} *${statusText}* von ${userName}\n\n*${approval.title}*\n\nID: \`${approvalId}\``
              )
            }

            processed.push(`${action}:${approvalId}`)
          }
        }
      }

      // Handle text commands /approve <id> or /reject <id>
      if (update.message?.text) {
        const text = update.message.text.trim()
        const chatId = String(update.message.chat.id)
        const commandMatch = text.match(/^\/(approve|reject)\s+(\S+)/i)

        if (commandMatch) {
          const action = commandMatch[1].toLowerCase() as 'approve' | 'reject'
          const approvalId = commandMatch[2]

          const approval = await prisma.approval.findUnique({ where: { id: approvalId } })
          if (!approval) {
            await sendMessage(botToken, chatId, `⚠️ Approval \`${approvalId}\` nicht gefunden.`)
          } else if (approval.status !== 'pending') {
            await sendMessage(botToken, chatId, `ℹ️ Approval ist bereits *${approval.status}*.`)
          } else {
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
            await sendMessage(
              botToken,
              chatId,
              `${statusIcon} *${statusText}*: ${approval.title}\n\nID: \`${approvalId}\``
            )
            processed.push(`${action}:${approvalId}`)
          }
        }
      }
    }

    // Save new offset (next update to fetch = maxUpdateId + 1)
    const newOffset = maxUpdateId + 1
    if (newOffset > offset) {
      await prisma.appSettings.upsert({
        where: { key: 'telegram_poll_offset' },
        update: { value: String(newOffset) },
        create: { key: 'telegram_poll_offset', value: String(newOffset) },
      })
    }

    return NextResponse.json({
      ok: true,
      updatesCount: updates.length,
      processed,
      newOffset,
    })
  } catch (err) {
    console.error('[POST /api/telegram/poll]', err)
    return NextResponse.json({ error: 'Polling-Fehler' }, { status: 500 })
  }
}
