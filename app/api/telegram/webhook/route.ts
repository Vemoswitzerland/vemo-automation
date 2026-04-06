import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { processCallbackQuery, answerCallbackQuery, editMessage, sendMessage } from '@/lib/telegram/bot'
import { getBotToken, getAllChatIds, registerChatId } from '@/lib/telegram/notify'

// Rate limiter for webhook: max 30 updates per chatId per 60s
const webhookRateLimit = new Map<string, { count: number; resetAt: number }>()

function checkWebhookRateLimit(chatId: string): boolean {
  const now = Date.now()
  const entry = webhookRateLimit.get(chatId)
  if (!entry || entry.resetAt < now) {
    webhookRateLimit.set(chatId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

/** Trigger all active flows that have a telegram_command_trigger node matching the command */
async function triggerFlowsForCommand(command: string, chatId: string, fromName: string): Promise<void> {
  try {
    const activeFlows = await prisma.flow.findMany({
      where: { status: 'active' },
    })

    for (const flow of activeFlows) {
      const nodes = JSON.parse(flow.nodes) as Array<{ type?: string; data?: { command?: string; label?: string } }>
      const triggerNode = nodes.find(
        (n) =>
          (n.type === 'telegram_command_trigger' || n.data?.label === 'telegram_command_trigger') &&
          n.data?.command === command
      )
      if (!triggerNode) continue

      await prisma.execution.create({
        data: {
          flowId: flow.id,
          boardId: flow.boardId,
          triggeredBy: `telegram:${chatId}`,
          status: 'running',
          input: JSON.stringify({ command, chatId, fromName }),
          isTest: false,
        },
      })

      // Process send_telegram_message nodes in the flow
      const token = await getBotToken()
      if (token) {
        for (const node of nodes) {
          if (node.type === 'send_telegram_message' || node.data?.label === 'send_telegram_message') {
            const msg = (node.data as Record<string, unknown>)?.message as string | undefined
            if (msg) {
              const targetChatId = (node.data as Record<string, unknown>)?.chatId as string | undefined
              const targets = targetChatId ? [targetChatId] : await getAllChatIds()
              for (const tid of targets) {
                await sendMessage(token, tid, msg).catch(() => null)
              }
            }
          }
        }
      }

      await prisma.execution.updateMany({
        where: { flowId: flow.id, status: 'running', triggeredBy: `telegram:${chatId}` },
        data: { status: 'success', completedAt: new Date() },
      })
    }
  } catch (err) {
    console.error('[triggerFlowsForCommand]', err)
  }
}

// POST /api/telegram/webhook — receive Telegram webhook updates
// Register with: https://api.telegram.org/bot{token}/setWebhook?url=https://your-domain/api/telegram/webhook&secret_token={TELEGRAM_WEBHOOK_SECRET}
export async function POST(req: NextRequest) {
  try {
    // Verify Telegram webhook secret token to reject fake/spoofed updates
    const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (expectedSecret && (!secretToken || secretToken !== expectedSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

      await answerCallbackQueryWithToken(callbackQuery.id, `${statusIcon} ${statusText}!`)

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

    // Handle text commands
    if (update.message?.text) {
      const text: string = update.message.text.trim()
      const chatId = String(update.message.chat.id)
      const firstName = update.message.from?.first_name ?? 'Unbekannt'

      // Rate limit per chat
      if (!checkWebhookRateLimit(chatId)) {
        console.warn(`[webhook] Rate limit exceeded for chatId ${chatId}`)
        return NextResponse.json({ ok: true })
      }

      // Extract command (e.g. /mycommand → mycommand)
      const commandMatch = text.match(/^\/(\w+)/)
      if (commandMatch) {
        const cmd = commandMatch[1].toLowerCase()
        // Trigger any flows listening for this command (non-blocking)
        triggerFlowsForCommand(cmd, chatId, firstName).catch(() => null)
      }

      // /start — register this chat and greet
      if (text.startsWith('/start')) {
        await registerChatId(chatId)
        await sendMessageWithToken(
          chatId,
          `👋 Willkommen, ${firstName}!\n\nDu bist jetzt mit der *Vemo Automationszentrale* verbunden.\n\n📋 *Verfügbare Befehle:*\n/status — Systemübersicht\n/approve <id> — Inhalt genehmigen\n/reject <id> — Inhalt ablehnen\n/generate — Content generieren\n/help — Hilfe anzeigen`
        )
        return NextResponse.json({ ok: true })
      }

      // /help
      if (text.startsWith('/help')) {
        await sendMessageWithToken(
          chatId,
          `🤖 *Vemo Bot — Hilfe*\n\n/status — Offene Approvals, Drafts & Connector-Status\n/approve <id> — Approval genehmigen\n/reject <id> — Approval ablehnen\n/generate — Neuen Content-Entwurf erstellen\n/help — Diese Hilfe anzeigen`
        )
        return NextResponse.json({ ok: true })
      }

      // /status — show system overview
      if (text.startsWith('/status')) {
        try {
          const [pendingApprovals, pendingDrafts, connectors, instagramPosts] = await Promise.all([
            prisma.approval.count({ where: { status: 'pending' } }),
            prisma.emailDraft.count({ where: { status: 'pending' } }),
            prisma.connector.findMany(),
            prisma.instagramPost.count(),
          ])
          const connectedCount = connectors.filter(c => c.status === 'connected').length
          const now = new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })

          const statusMsg =
            `📊 *Automationszentrale — Status*\n` +
            `_${now}_\n\n` +
            `📋 *Approvals:* ${pendingApprovals} ausstehend\n` +
            `📧 *E-Mail Drafts:* ${pendingDrafts} ausstehend\n` +
            `📸 *Instagram Posts:* ${instagramPosts} total\n` +
            `🔌 *Connectors:* ${connectedCount}/${connectors.length} verbunden\n\n` +
            (pendingApprovals > 0
              ? `⚠️ _Offene Approvals warten auf deine Bestätigung!_`
              : `✅ _Alles erledigt!_`)

          await sendMessageWithToken(chatId, statusMsg)
        } catch (err) {
          console.error('[/status command]', err)
          await sendMessageWithToken(chatId, '⚠️ Fehler beim Laden des Status.')
        }
        return NextResponse.json({ ok: true })
      }

      // /generate — trigger content generation
      if (text.startsWith('/generate')) {
        const arg = text.replace('/generate', '').trim().toLowerCase()
        try {
          if (!arg || arg === 'instagram') {
            await sendMessageWithToken(
              chatId,
              `🎨 *Content generieren:*\n\nVerfügbare Optionen:\n• /generate instagram — Instagram Post-Entwurf\n• /generate email — E-Mail Entwurf\n\nOder öffne die Automationszentrale direkt.`
            )
          } else if (arg === 'email') {
            await sendMessageWithToken(
              chatId,
              '📧 E-Mail-Generierung: Öffne die Automationszentrale unter /emails um neue Entwürfe zu erstellen und per KI zu generieren.'
            )
          } else {
            await sendMessageWithToken(
              chatId,
              `❓ Unbekannte Option: _${arg}_\n\nVerfügbar: /generate instagram | /generate email`
            )
          }
        } catch (err) {
          console.error('[/generate command]', err)
          await sendMessageWithToken(chatId, '⚠️ Fehler beim Verarbeiten des Befehls.')
        }
        return NextResponse.json({ ok: true })
      }

      // /approve <id> or /reject <id>
      const approvalMatch = text.match(/^\/(approve|reject)\s+(\S+)/i)
      if (approvalMatch) {
        const action = approvalMatch[1].toLowerCase() as 'approve' | 'reject'
        const approvalId = approvalMatch[2]

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

async function answerCallbackQueryWithToken(callbackQueryId: string, text?: string) {
  const token = await getBotToken()
  if (!token) return
  await answerCallbackQuery(token, callbackQueryId, text)
}

async function editMessageWithToken(chatId: string, messageId: number, text: string) {
  const token = await getBotToken()
  if (!token) return
  await editMessage(token, chatId, messageId, text)
}

async function sendMessageWithToken(chatId: string, text: string) {
  const token = await getBotToken()
  if (!token) return
  await sendMessage(token, chatId, text)
}
