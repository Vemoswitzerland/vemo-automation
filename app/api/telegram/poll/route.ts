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
import { registerChatId } from '@/lib/telegram/notify'

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

      // Handle text commands
      if (update.message?.text) {
        const text = update.message.text.trim()
        const chatId = String(update.message.chat.id)
        const firstName = update.message.from?.first_name ?? 'Unbekannt'

        // /start — register and greet
        if (text.startsWith('/start')) {
          await registerChatId(chatId)
          await sendMessage(
            botToken,
            chatId,
            `👋 Willkommen, ${firstName}!\n\nDu bist jetzt mit der *Vemo Automationszentrale* verbunden.\n\n📋 *Verfügbare Befehle:*\n/status — Systemübersicht\n/approve <id> — Inhalt genehmigen\n/reject <id> — Inhalt ablehnen\n/generate — Content generieren\n/help — Hilfe anzeigen`
          )
          processed.push(`start:${chatId}`)
          continue
        }

        // /status
        if (text.startsWith('/status')) {
          const [pendingApprovals, pendingDrafts, connectors, instagramPosts] = await Promise.all([
            prisma.approval.count({ where: { status: 'pending' } }),
            prisma.emailDraft.count({ where: { status: 'pending' } }),
            prisma.connector.findMany(),
            prisma.instagramPost.count(),
          ])
          const connectedCount = connectors.filter(c => c.status === 'connected').length
          const now = new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })
          await sendMessage(
            botToken,
            chatId,
            `📊 *Automationszentrale — Status*\n_${now}_\n\n` +
            `📋 *Approvals:* ${pendingApprovals} ausstehend\n` +
            `📧 *E-Mail Drafts:* ${pendingDrafts} ausstehend\n` +
            `📸 *Instagram Posts:* ${instagramPosts} total\n` +
            `🔌 *Connectors:* ${connectedCount}/${connectors.length} verbunden\n\n` +
            (pendingApprovals > 0
              ? `⚠️ _Offene Approvals warten auf deine Bestätigung!_`
              : `✅ _Alles erledigt!_`)
          )
          processed.push(`status:${chatId}`)
          continue
        }

        // /help
        if (text.startsWith('/help')) {
          await sendMessage(
            botToken,
            chatId,
            `🤖 *Vemo Bot — Hilfe*\n\n/status — Offene Approvals, Drafts & Connector-Status\n/approve <id> — Approval genehmigen\n/reject <id> — Approval ablehnen\n/generate — Neuen Content-Entwurf erstellen\n/help — Diese Hilfe anzeigen`
          )
          continue
        }

        // /generate
        if (text.startsWith('/generate')) {
          await sendMessage(
            botToken,
            chatId,
            `🎨 *Content generieren:*\n\nVerfügbare Optionen:\n• /generate instagram — Instagram Post-Entwurf\n• /generate email — E-Mail Entwurf\n\nOder öffne die Automationszentrale direkt.`
          )
          continue
        }

        // /approve <id> or /reject <id>
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
