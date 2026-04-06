/**
 * CRM Webhook — /api/leads/webhook
 *
 * Receives incoming contact/lead events from CRM systems (HubSpot, Pipedrive, Airtable).
 * Verifies the HMAC signature (when WEBHOOK_SECRET is set) and processes the payload.
 *
 * Expected payload (all CRM adapters normalize to this shape):
 * {
 *   event: 'contact.created' | 'contact.updated' | 'deal.won' | 'deal.lost'
 *   provider: 'hubspot' | 'pipedrive' | 'airtable'
 *   data: { crmId, firstName, lastName, email?, phone?, stage, value?, updatedAt }
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

// In-memory log for demo purposes (use DB in production)
const webhookLog: Array<{
  id: string
  receivedAt: string
  event: string
  provider: string
  crmId: string
  processed: boolean
}> = []

function verifyHmacSignature(body: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  return expected === signature
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Verify HMAC signature if secret is configured
  const secret = process.env.WEBHOOK_SECRET
  if (secret) {
    const sig = request.headers.get('x-hub-signature-256') ??
                request.headers.get('x-pipedrive-signature') ??
                request.headers.get('x-airtable-signature') ?? ''
    if (!sig || !verifyHmacSignature(rawBody, sig, secret)) {
      console.warn('[crm-webhook] Invalid signature — request rejected')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: { event?: string; provider?: string; data?: Record<string, unknown> }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, provider, data } = payload

  if (!event || !data) {
    return NextResponse.json({ error: 'Missing event or data' }, { status: 400 })
  }

  const crmId = String(data.crmId ?? data.id ?? 'unknown')
  const logEntry = {
    id: `wh-${Date.now()}`,
    receivedAt: new Date().toISOString(),
    event: event,
    provider: provider ?? 'unknown',
    crmId,
    processed: false,
  }

  try {
    // Process event
    switch (event) {
      case 'contact.created':
      case 'contact.updated':
        // TODO: upsert lead into DB when Prisma schema has CRM fields
        console.log(`[crm-webhook] ${event} from ${provider}: crmId=${crmId}`)
        break

      case 'deal.won':
        console.log(`[crm-webhook] deal.won from ${provider}: crmId=${crmId}, value=${data.value}`)
        break

      case 'deal.lost':
        console.log(`[crm-webhook] deal.lost from ${provider}: crmId=${crmId}`)
        break

      default:
        console.log(`[crm-webhook] Unknown event: ${event}`)
    }

    logEntry.processed = true
    webhookLog.unshift(logEntry)
    if (webhookLog.length > 100) webhookLog.pop()

    return NextResponse.json({ received: true, id: logEntry.id })
  } catch (err) {
    console.error('[crm-webhook] Processing error:', err)
    webhookLog.unshift(logEntry)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

// GET — return recent webhook log (for admin debugging)
export async function GET() {
  return NextResponse.json({ log: webhookLog.slice(0, 20) })
}
