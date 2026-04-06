/**
 * WhatsApp Client Interface — lib/whatsapp/client.ts
 *
 * Abstraction over the WhatsApp Business API (Meta Cloud API).
 * Returns a MockWhatsAppClient when WHATSAPP_API_TOKEN is not set.
 * Add real credentials via .env.local → no code changes needed.
 *
 * Interface-first design: drop in RealWhatsAppClient once API keys arrive.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhatsAppMessage {
  waId: string
  from: string
  fromName?: string
  body: string
  direction: 'inbound' | 'outbound'
  status: 'unread' | 'read' | 'replied'
  receivedAt: Date
}

export interface WhatsAppSendPayload {
  to: string
  body: string
  replyToMessageId?: string
}

export interface WhatsAppSendResult {
  messageId: string
  to: string
  status: 'sent' | 'failed'
  mock: boolean
}

export interface WhatsAppProfile {
  phoneNumber: string
  displayName: string
  about?: string
}

export interface WhatsAppClient {
  sendMessage(payload: WhatsAppSendPayload): Promise<WhatsAppSendResult>
  getProfile(): Promise<WhatsAppProfile>
  markAsRead(messageId: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Mock Client
// ---------------------------------------------------------------------------

class MockWhatsAppClient implements WhatsAppClient {
  async sendMessage(payload: WhatsAppSendPayload): Promise<WhatsAppSendResult> {
    await new Promise((r) => setTimeout(r, 600))
    return {
      messageId: `mock_${Date.now()}`,
      to: payload.to,
      status: 'sent',
      mock: true,
    }
  }

  async getProfile(): Promise<WhatsAppProfile> {
    return {
      phoneNumber: '+41791234567',
      displayName: 'Vemo (Demo)',
      about: 'Automation Center – Demo-Modus',
    }
  }

  async markAsRead(_messageId: string): Promise<void> {
    // no-op in mock mode
  }
}

// ---------------------------------------------------------------------------
// Real WhatsApp Business API Client
// ---------------------------------------------------------------------------

class RealWhatsAppClient implements WhatsAppClient {
  private readonly baseUrl = 'https://graph.facebook.com/v19.0'

  constructor(
    private readonly apiToken: string,
    private readonly phoneNumberId: string,
  ) {}

  async sendMessage(payload: WhatsAppSendPayload): Promise<WhatsAppSendResult> {
    const body: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: payload.to,
      type: 'text',
      text: { body: payload.body },
    }

    if (payload.replyToMessageId) {
      body.context = { message_id: payload.replyToMessageId }
    }

    const res = await fetch(
      `${this.baseUrl}/${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify(body),
      },
    )

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`WhatsApp sendMessage failed: ${err}`)
    }

    const data = await res.json()
    const msgId = data?.messages?.[0]?.id ?? `wa_${Date.now()}`
    return { messageId: msgId, to: payload.to, status: 'sent', mock: false }
  }

  async getProfile(): Promise<WhatsAppProfile> {
    const res = await fetch(
      `${this.baseUrl}/${this.phoneNumberId}?fields=display_phone_number,verified_name`,
      {
        headers: { Authorization: `Bearer ${this.apiToken}` },
      },
    )
    if (!res.ok) return { phoneNumber: 'unknown', displayName: 'unknown' }
    const data = await res.json()
    return {
      phoneNumber: data.display_phone_number ?? 'unknown',
      displayName: data.verified_name ?? 'Vemo',
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    })
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWhatsAppClient(): WhatsAppClient {
  const token = process.env.WHATSAPP_API_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (token && phoneNumberId) {
    return new RealWhatsAppClient(token, phoneNumberId)
  }
  return new MockWhatsAppClient()
}

export const isMockWhatsApp =
  !process.env.WHATSAPP_API_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID
