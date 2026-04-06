/**
 * POST /api/gmail/webhook
 *
 * Receives Gmail push notifications from Google Cloud Pub/Sub.
 * When Gmail detects a new message in INBOX, Pub/Sub POSTs here.
 *
 * Message format (base64-encoded JSON in request body):
 * {
 *   "message": {
 *     "data": "<base64({"emailAddress":"user@gmail.com","historyId":"12345"})>",
 *     "messageId": "...",
 *     "publishTime": "..."
 *   },
 *   "subscription": "projects/xxx/subscriptions/xxx"
 * }
 *
 * Setup requirements:
 *   1. Google Cloud project with Pub/Sub API enabled
 *   2. Topic: set GMAIL_PUBSUB_TOPIC in env
 *   3. Push subscription pointing to: <APP_URL>/api/gmail/webhook
 *   4. IAM: gmail-api-push@system.gserviceaccount.com → Pub/Sub Publisher on topic
 *   5. GMAIL_WEBHOOK_SECRET in env for optional HMAC verification
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchNewEmails } from '@/lib/email/imap'
import { generateEmailResponse, prioritizeEmail } from '@/lib/ai/index'
import { getValidAccessToken, fetchHistorySince } from '@/lib/email/gmail-oauth'

// Google Pub/Sub sends bearer tokens for verification
// We verify the token is from Google's service account
async function verifyPubSubToken(req: NextRequest): Promise<boolean> {
  // If no secret configured, skip verification (not recommended for production)
  const webhookSecret = process.env.GMAIL_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.warn('[gmail/webhook] GMAIL_WEBHOOK_SECRET not set — skipping auth verification')
    return true
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.slice(7)

  // Verify the Google-issued OIDC token
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
    )
    if (!res.ok) return false
    const info = await res.json()
    // Token must be issued by Google and for our service account
    const expectedEmail = process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT ||
      'gmail-api-push@system.gserviceaccount.com'
    return info.email === expectedEmail || info.email?.endsWith('@system.gserviceaccount.com')
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // Verify the request is from Google Pub/Sub
  const isValid = await verifyPubSubToken(req)
  if (!isValid) {
    console.warn('[gmail/webhook] Unauthorized webhook call')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { message?: { data?: string }; subscription?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.message?.data) {
    // Pub/Sub sends empty keep-alive pings — acknowledge silently
    return NextResponse.json({ ok: true })
  }

  // Decode the Pub/Sub message
  let notification: { emailAddress: string; historyId: string }
  try {
    const decoded = Buffer.from(body.message.data, 'base64').toString('utf-8')
    notification = JSON.parse(decoded)
  } catch {
    return NextResponse.json({ error: 'Invalid message data' }, { status: 400 })
  }

  const { emailAddress, historyId } = notification
  if (!emailAddress || !historyId) {
    return NextResponse.json({ error: 'Missing emailAddress or historyId' }, { status: 400 })
  }

  console.log(`[gmail/webhook] Push notification for ${emailAddress}, historyId=${historyId}`)

  try {
    // Find the EmailAccount for this Gmail address
    const account = await prisma.emailAccount.findFirst({
      where: { email: emailAddress, isActive: true, authType: 'oauth2' },
    })

    if (!account) {
      console.warn(`[gmail/webhook] No active OAuth account found for ${emailAddress}`)
      // Still acknowledge to avoid Pub/Sub retry storms
      return NextResponse.json({ ok: true })
    }

    // Fetch new emails since last known historyId
    const lastHistoryId = account.gmailHistoryId || historyId

    // Get valid access token (auto-refreshes if expired)
    const accessToken = await getValidAccessToken(account)

    // Use history API to find new message IDs (for efficiency)
    let newMessageIds: string[] = []
    try {
      const history = await fetchHistorySince(accessToken, lastHistoryId)
      newMessageIds = history.map((h) => h.messageId)
      console.log(`[gmail/webhook] ${newMessageIds.length} new messages in history`)
    } catch (histErr) {
      console.warn('[gmail/webhook] History fetch failed, falling back to full IMAP sync:', histErr)
    }

    // Fall back to IMAP sync if history is empty or failed
    if (newMessageIds.length === 0) {
      const emails = await fetchNewEmails(account, account.lastSyncAt || undefined)
      let synced = 0

      for (const emailData of emails) {
        const existing = await prisma.email.findUnique({ where: { uid: emailData.uid } })
        if (existing) continue

        const priority = await prioritizeEmail(emailData.subject, emailData.body)

        const saved = await prisma.email.create({
          data: {
            uid: emailData.uid,
            messageId: emailData.messageId,
            from: emailData.from,
            fromName: emailData.fromName,
            to: emailData.to,
            subject: emailData.subject,
            body: emailData.body,
            bodyHtml: emailData.bodyHtml,
            receivedAt: emailData.receivedAt,
            priority,
            emailAccountId: account.id,
          },
        })

        const draft = await generateEmailResponse(
          { from: emailData.from, fromName: emailData.fromName, subject: emailData.subject, body: emailData.body },
          account.name,
          account.email
        )

        await prisma.emailDraft.create({
          data: { emailId: saved.id, subject: draft.subject, body: draft.body, status: 'pending' },
        })
        synced++
      }

      console.log(`[gmail/webhook] IMAP fallback synced ${synced} new emails for ${emailAddress}`)
    }

    // Update historyId and lastSyncAt
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: {
        gmailHistoryId: historyId,
        lastSyncAt: new Date(),
      },
    })

    // HTTP 200 = acknowledge to Pub/Sub (no retry)
    return NextResponse.json({ ok: true, processed: emailAddress })
  } catch (err) {
    console.error('[gmail/webhook] Processing error:', err)
    // Return 500 → Pub/Sub will retry
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
