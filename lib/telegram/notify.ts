// lib/telegram/notify.ts
// Broadcast notifications to all registered Telegram chats

import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { sendMessage, sendApprovalRequest } from '@/lib/telegram/bot'

/** Get the bot token from the connected Telegram connector */
export async function getBotToken(): Promise<string | null> {
  try {
    const connector = await prisma.connector.findUnique({ where: { id: 'telegram' } })
    if (!connector?.credentials || connector.status !== 'connected') return null
    const raw = JSON.parse(connector.credentials as string)
    const creds: Record<string, string> = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? decrypt(v) : ''])
    )
    return creds.bot_token ?? null
  } catch {
    return null
  }
}

/** Get all registered Telegram chat IDs (primary from connector + extras from AppSettings) */
export async function getAllChatIds(): Promise<string[]> {
  const ids: string[] = []
  try {
    const connector = await prisma.connector.findUnique({ where: { id: 'telegram' } })
    if (connector?.credentials) {
      const raw = JSON.parse(connector.credentials as string)
      const creds: Record<string, string> = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? decrypt(v) : ''])
      )
      if (creds.chat_id) ids.push(creds.chat_id)
    }
  } catch { /* ignore */ }

  try {
    const extra = await prisma.appSettings.findUnique({ where: { key: 'telegram_extra_chats' } })
    if (extra?.value) {
      const parsed: string[] = JSON.parse(extra.value)
      for (const id of parsed) {
        if (!ids.includes(id)) ids.push(id)
      }
    }
  } catch { /* ignore */ }

  return ids
}

/** Register an additional chat ID (e.g. from /start command) */
export async function registerChatId(chatId: string): Promise<void> {
  const existing = await getAllChatIds()
  if (existing.includes(chatId)) return

  const extra = await prisma.appSettings.findUnique({ where: { key: 'telegram_extra_chats' } })
  const current: string[] = extra?.value ? JSON.parse(extra.value) : []
  if (!current.includes(chatId)) {
    current.push(chatId)
    await prisma.appSettings.upsert({
      where: { key: 'telegram_extra_chats' },
      update: { value: JSON.stringify(current) },
      create: { key: 'telegram_extra_chats', value: JSON.stringify(current) },
    })
  }
}

/** Remove a chat ID from extras */
export async function removeChatId(chatId: string): Promise<void> {
  const extra = await prisma.appSettings.findUnique({ where: { key: 'telegram_extra_chats' } })
  if (!extra?.value) return
  const current: string[] = JSON.parse(extra.value)
  const updated = current.filter(id => id !== chatId)
  await prisma.appSettings.upsert({
    where: { key: 'telegram_extra_chats' },
    update: { value: JSON.stringify(updated) },
    create: { key: 'telegram_extra_chats', value: JSON.stringify(updated) },
  })
}

/** Broadcast a plain text message to all registered chat IDs */
export async function broadcastMessage(text: string): Promise<number> {
  const token = await getBotToken()
  if (!token) return 0
  const chatIds = await getAllChatIds()
  let sent = 0
  for (const chatId of chatIds) {
    await sendMessage(token, chatId, text)
    sent++
  }
  return sent
}

/** Send an approval request to all registered chats; returns list of {chatId, messageId} */
export async function broadcastApprovalRequest(
  approvalId: string,
  title: string,
  description?: string
): Promise<{ chatId: string; messageId: number }[]> {
  const token = await getBotToken()
  if (!token) return []
  const chatIds = await getAllChatIds()
  const results: { chatId: string; messageId: number }[] = []
  for (const chatId of chatIds) {
    const msgId = await sendApprovalRequest(token, chatId, approvalId, title, description)
    if (msgId !== null) results.push({ chatId, messageId: msgId })
  }
  return results
}
