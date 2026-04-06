/**
 * Gmail OAuth 2.0 Helper — lib/email/gmail-oauth.ts
 *
 * Handles the Gmail OAuth2 flow without external Google libraries.
 * Uses the standard OAuth2 endpoints directly.
 *
 * Required env vars:
 *   GMAIL_CLIENT_ID      — Google Cloud Console OAuth2 Client ID
 *   GMAIL_CLIENT_SECRET  — Google Cloud Console OAuth2 Client Secret
 *   NEXTAUTH_URL or APP_URL — Base URL for redirect URI (e.g. https://app.vemo.ch)
 *
 * Scopes requested:
 *   - https://mail.google.com/  (IMAP + send via SMTP)
 *   - https://www.googleapis.com/auth/gmail.modify (read/modify labels)
 *   - https://www.googleapis.com/auth/gmail.metadata (fetch metadata only)
 */

import { encrypt, decrypt } from '@/lib/crypto'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/userinfo/v2/me'
const GMAIL_WATCH_URL = 'https://www.googleapis.com/gmail/v1/users/me/watch'
const GMAIL_HISTORY_URL = 'https://www.googleapis.com/gmail/v1/users/me/history'

const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiry: Date
}

export interface GmailUserInfo {
  email: string
  name: string
}

function getRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
  return `${base}/api/gmail/callback`
}

function getClientId(): string {
  const id = process.env.GMAIL_CLIENT_ID
  if (!id) throw new Error('GMAIL_CLIENT_ID not configured')
  return id
}

function getClientSecret(): string {
  const secret = process.env.GMAIL_CLIENT_SECRET
  if (!secret) throw new Error('GMAIL_CLIENT_SECRET not configured')
  return secret
}

/**
 * Build the Google OAuth2 authorization URL to redirect the user to.
 * @param state  Opaque state string (e.g. accountId or CSRF token)
 */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: GMAIL_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }).toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiry: new Date(Date.now() + (data.expires_in - 60) * 1000),
  }
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(encryptedRefreshToken: string): Promise<{ accessToken: string; expiry: Date }> {
  const refreshToken = decrypt(encryptedRefreshToken)

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: 'refresh_token',
    }).toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token refresh failed: ${err}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    expiry: new Date(Date.now() + (data.expires_in - 60) * 1000),
  }
}

/**
 * Fetch the Gmail user's email address and name using the access token.
 */
export async function getGmailUserInfo(accessToken: string): Promise<GmailUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch Gmail user info')
  const data = await res.json()
  return { email: data.email, name: data.name || data.email }
}

/**
 * Get a valid (non-expired) access token for a Gmail account.
 * Automatically refreshes if expired.
 * Returns the access token string + updates DB if refreshed.
 */
export async function getValidAccessToken(account: {
  id: string
  oauthAccessToken: string | null
  oauthRefreshToken: string | null
  oauthExpiry: Date | null
}): Promise<string> {
  if (!account.oauthAccessToken || !account.oauthRefreshToken) {
    throw new Error('No OAuth tokens for this account')
  }

  // Check if token is still valid (5 min buffer)
  if (account.oauthExpiry && account.oauthExpiry > new Date(Date.now() + 5 * 60 * 1000)) {
    return decrypt(account.oauthAccessToken)
  }

  // Refresh the token
  const { accessToken, expiry } = await refreshAccessToken(account.oauthRefreshToken)

  // Update DB (lazy import to avoid circular deps)
  const { prisma } = await import('@/lib/db')
  await prisma.emailAccount.update({
    where: { id: account.id },
    data: {
      oauthAccessToken: encrypt(accessToken),
      oauthExpiry: expiry,
    },
  })

  return accessToken
}

/**
 * Register a Gmail push notification watch via Google Pub/Sub.
 * Sends new email notifications to our /api/gmail/webhook endpoint.
 *
 * Requires a Google Cloud Pub/Sub topic configured with:
 *   - Topic: projects/<project>/topics/gmail-push
 *   - Subscription: push delivery to https://app.vemo.ch/api/gmail/webhook
 *   - IAM: gmail-api-push@system.gserviceaccount.com as Pub/Sub Publisher
 *
 * @param accessToken  Valid Gmail access token
 * @returns historyId and expiration timestamp
 */
export async function registerGmailWatch(accessToken: string): Promise<{ historyId: string; expiryMs: number }> {
  const topicName = process.env.GMAIL_PUBSUB_TOPIC
  if (!topicName) {
    throw new Error('GMAIL_PUBSUB_TOPIC not configured (e.g. projects/my-project/topics/gmail-push)')
  }

  const res = await fetch(GMAIL_WATCH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topicName,
      labelIds: ['INBOX'],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail watch registration failed: ${err}`)
  }

  const data = await res.json()
  return {
    historyId: data.historyId,
    expiryMs: parseInt(data.expiration, 10),
  }
}

/**
 * Stop Gmail push notifications for the current user.
 */
export async function stopGmailWatch(accessToken: string): Promise<void> {
  await fetch('https://www.googleapis.com/gmail/v1/users/me/stop', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

/**
 * Fetch new Gmail message IDs since the last known historyId.
 * Returns an array of message IDs to fetch via IMAP.
 */
export async function fetchHistorySince(
  accessToken: string,
  startHistoryId: string
): Promise<{ messageId: string; historyId: string }[]> {
  const url = new URL(GMAIL_HISTORY_URL)
  url.searchParams.set('startHistoryId', startHistoryId)
  url.searchParams.set('historyTypes', 'messageAdded')
  url.searchParams.set('labelId', 'INBOX')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail history fetch failed: ${err}`)
  }

  const data = await res.json()
  const messages: { messageId: string; historyId: string }[] = []

  for (const record of data.history || []) {
    for (const added of record.messagesAdded || []) {
      messages.push({
        messageId: added.message.id,
        historyId: data.historyId,
      })
    }
  }

  return messages
}

/**
 * Build XOAUTH2 string for IMAP/SMTP OAuth2 authentication.
 * Format: base64("user=<email>\x01auth=Bearer <token>\x01\x01")
 */
export function buildXOAuth2String(email: string, accessToken: string): string {
  const raw = `user=${email}\x01auth=Bearer ${accessToken}\x01\x01`
  return Buffer.from(raw).toString('base64')
}

/**
 * Check if Gmail OAuth is configured (env vars present).
 */
export function isGmailOAuthConfigured(): boolean {
  return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET)
}
