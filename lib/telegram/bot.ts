// Telegram Bot service
// Polls Telegram API for updates, handles /approve and /reject commands, sends approval requests

const TELEGRAM_API = 'https://api.telegram.org'

export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    chat: { id: number; type: string }
    from?: { id: number; username?: string; first_name?: string }
    text?: string
    date: number
  }
  callback_query?: {
    id: string
    from: { id: number; username?: string; first_name?: string }
    message?: {
      message_id: number
      chat: { id: number }
    }
    data?: string
  }
}

export interface InlineKeyboardButton {
  text: string
  callback_data: string
}

/**
 * Send an approval request message to a Telegram chat with inline ✅/❌ buttons.
 * Returns the message_id of the sent message, or null on failure.
 */
export async function sendApprovalRequest(
  botToken: string,
  chatId: string,
  approvalId: string,
  title: string,
  description?: string
): Promise<number | null> {
  const text = description
    ? `📋 *Approval erforderlich*\n\n*${escapeMarkdown(title)}*\n\n${escapeMarkdown(description)}\n\nID: \`${approvalId}\``
    : `📋 *Approval erforderlich*\n\n*${escapeMarkdown(title)}*\n\nID: \`${approvalId}\``

  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve:${approvalId}` },
          { text: '❌ Reject', callback_data: `reject:${approvalId}` },
        ],
      ],
    },
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error('[Telegram] sendApprovalRequest failed:', res.status, await res.text())
      return null
    }
    const data = await res.json()
    return data.result?.message_id ?? null
  } catch (err) {
    console.error('[Telegram] sendApprovalRequest error:', err)
    return null
  }
}

/**
 * Send a plain text message to a Telegram chat.
 */
export async function sendMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<void> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    if (!res.ok) {
      console.error('[Telegram] sendMessage failed:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[Telegram] sendMessage error:', err)
  }
}

/**
 * Edit an existing message to show the approval result.
 */
export async function editMessage(
  botToken: string,
  chatId: string,
  messageId: string | number,
  text: string
): Promise<void> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: Number(messageId),
        text,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] },
      }),
    })
    if (!res.ok) {
      console.error('[Telegram] editMessage failed:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[Telegram] editMessage error:', err)
  }
}

/**
 * Answer a callback query (removes loading spinner in Telegram).
 */
export async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text?: string
): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API}/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    })
  } catch (err) {
    console.error('[Telegram] answerCallbackQuery error:', err)
  }
}

/**
 * Poll Telegram for new updates starting from the given offset.
 * Returns an array of Update objects.
 */
export async function pollUpdates(
  botToken: string,
  offset: number,
  timeout = 0
): Promise<TelegramUpdate[]> {
  try {
    const res = await fetch(
      `${TELEGRAM_API}/bot${botToken}/getUpdates?offset=${offset}&timeout=${timeout}&limit=100`,
      { method: 'GET' }
    )
    if (!res.ok) {
      console.error('[Telegram] pollUpdates failed:', res.status)
      return []
    }
    const data = await res.json()
    return data.result ?? []
  } catch (err) {
    console.error('[Telegram] pollUpdates error:', err)
    return []
  }
}

/**
 * Parse a callback_data string and extract action + approvalId.
 * Expected format: "approve:<id>" or "reject:<id>"
 */
export function processCallbackQuery(
  callbackData: string
): { action: 'approve' | 'reject'; approvalId: string } | null {
  const match = callbackData.match(/^(approve|reject):(.+)$/)
  if (!match) return null
  return {
    action: match[1] as 'approve' | 'reject',
    approvalId: match[2],
  }
}

/**
 * Escape special Markdown characters for Telegram Markdown v1.
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
}
