/**
 * IMAP Email Fetcher — lib/email/imap.ts
 *
 * Supports two authentication modes:
 *   1. Password (App Password for Gmail, regular IMAP credentials for others)
 *   2. OAuth2 via XOAUTH2 (Gmail OAuth, auto-refreshes token)
 *
 * Attachments are parsed and returned for storage.
 */
import { ImapFlow } from 'imapflow'
import type { EmailAccount } from '@prisma/client'
import { decrypt } from '@/lib/crypto'
import { withRetry } from '@/lib/retry'
import { getValidAccessToken } from './gmail-oauth'

export interface EmailAttachmentData {
  filename: string
  contentType: string
  size: number
  contentId?: string
  data?: string // base64, only for attachments < 100KB
}

export interface FetchedEmail {
  uid: string
  messageId?: string
  from: string
  fromName?: string
  to: string
  subject: string
  body: string
  bodyHtml?: string
  receivedAt: Date
  attachments?: EmailAttachmentData[]
}

export async function fetchNewEmails(account: EmailAccount, sinceDate?: Date): Promise<FetchedEmail[]> {
  return withRetry(() => fetchNewEmailsOnce(account, sinceDate), {
    label: `IMAP fetch (${account.email})`,
  })
}

async function fetchNewEmailsOnce(account: EmailAccount, sinceDate?: Date): Promise<FetchedEmail[]> {
  // Build auth config — OAuth2 or password
  let auth: Record<string, unknown>

  if (account.authType === 'oauth2' && account.oauthAccessToken) {
    // Get valid (possibly refreshed) access token
    const accessToken = await getValidAccessToken(account)
    auth = { user: account.email, accessToken }
  } else {
    auth = {
      user: account.username,
      pass: account.password ? decrypt(account.password) : '',
    }
  }

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapPort === 993,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    auth: auth as any,
    logger: false,
  })

  const emails: FetchedEmail[] = []

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      const since = sinceDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // last 7 days

      for await (const message of client.fetch(
        { since },
        {
          uid: true,
          envelope: true,
          bodyStructure: true,
          source: true,
        }
      )) {
        const envelope = message.envelope
        if (!envelope) continue

        const fromAddr = envelope.from?.[0]
        const toAddr = envelope.to?.[0]

        let body = ''
        let bodyHtml = ''
        const attachments: EmailAttachmentData[] = []

        try {
          const src = message.source
          if (src) {
            const chunks: Buffer[] = []
            for await (const chunk of src as unknown as AsyncIterable<Buffer>) {
              chunks.push(chunk)
            }
            const rawEmail = Buffer.concat(chunks)
            const parsed = parseRawEmail(rawEmail)
            body = parsed.text
            bodyHtml = parsed.html
            attachments.push(...parsed.attachments)
          }
        } catch (parseErr) {
          console.warn(`[IMAP] Could not parse email body for uid ${message.uid}:`, parseErr)
          body = '(Inhalt konnte nicht geladen werden)'
        }

        emails.push({
          uid: `${account.id}-${message.uid}`,
          messageId: envelope.messageId,
          from: fromAddr?.address || 'unknown@unknown.com',
          fromName: fromAddr?.name || undefined,
          to: toAddr?.address || account.email,
          subject: envelope.subject || '(kein Betreff)',
          body: body || '(kein Inhalt)',
          bodyHtml: bodyHtml || undefined,
          receivedAt: envelope.date || new Date(),
          attachments: attachments.length > 0 ? attachments : undefined,
        })
      }
    } finally {
      lock.release()
    }

    await client.logout()
  } catch (error) {
    console.error('[IMAP] fetch error:', error)
    throw error
  }

  return emails
}

// ─── MIME parser ─────────────────────────────────────────────────────────────

interface ParsedEmail {
  text: string
  html: string
  attachments: EmailAttachmentData[]
}

function parseRawEmail(raw: Buffer): ParsedEmail {
  const rawStr = raw.toString('utf-8')
  const result: ParsedEmail = { text: '', html: '', attachments: [] }

  const headerBodySplit = rawStr.indexOf('\r\n\r\n')
  if (headerBodySplit === -1) {
    result.text = rawStr
    return result
  }

  const headerSection = rawStr.slice(0, headerBodySplit)
  const bodySection = rawStr.slice(headerBodySplit + 4)
  const headers = parseHeaders(headerSection)

  const contentType = headers['content-type'] || 'text/plain'
  const encoding = (headers['content-transfer-encoding'] || 'quoted-printable').toLowerCase()

  if (contentType.includes('multipart/')) {
    const boundaryMatch = contentType.match(/boundary="?([^";]+)"?/i)
    if (boundaryMatch) {
      parseParts(bodySection, boundaryMatch[1].trim(), result)
    }
  } else if (contentType.startsWith('text/html')) {
    result.html = decodeBody(bodySection, encoding)
    result.text = stripHtml(result.html)
  } else {
    result.text = decodeBody(bodySection, encoding)
  }

  result.text = result.text.trim()
  result.html = result.html.trim()

  return result
}

function parseParts(body: string, boundary: string, result: ParsedEmail): void {
  const parts = body.split(`--${boundary}`)

  for (const part of parts) {
    if (!part || part.startsWith('--') || part.trim() === '--') continue

    const partSplit = part.indexOf('\r\n\r\n')
    if (partSplit === -1) continue

    const partHeaders = parseHeaders(part.slice(0, partSplit))
    const partBody = part.slice(partSplit + 4)

    const contentType = partHeaders['content-type'] || 'text/plain'
    const encoding = (partHeaders['content-transfer-encoding'] || '7bit').toLowerCase()
    const disposition = partHeaders['content-disposition'] || ''
    const contentId = partHeaders['content-id']?.replace(/[<>]/g, '')

    if (contentType.includes('multipart/')) {
      const subBoundaryMatch = contentType.match(/boundary="?([^";]+)"?/i)
      if (subBoundaryMatch) {
        parseParts(partBody, subBoundaryMatch[1].trim(), result)
      }
    } else if (
      disposition.includes('attachment') ||
      (disposition.includes('inline') && !contentType.startsWith('text/'))
    ) {
      const filenameMatch =
        disposition.match(/filename\*?="?([^";]+)"?/i) ||
        contentType.match(/name\*?="?([^";]+)"?/i)
      const filename = filenameMatch ? decodeRFC2231(filenameMatch[1].trim()) : 'attachment'
      const cleanData = partBody.replace(/\r\n/g, '').trim()
      const size = Math.floor(cleanData.length * 0.75)

      const attachment: EmailAttachmentData = {
        filename,
        contentType: contentType.split(';')[0].trim(),
        size,
        contentId,
      }

      if (size < 100_000 && encoding === 'base64') {
        attachment.data = cleanData
      }

      result.attachments.push(attachment)
    } else if (contentType.startsWith('text/html') && !result.html) {
      result.html = decodeBody(partBody, encoding)
    } else if (contentType.startsWith('text/plain') && !result.text) {
      result.text = decodeBody(partBody, encoding)
    }
  }
}

function parseHeaders(headerSection: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const unfolded = headerSection.replace(/\r\n[ \t]+/g, ' ')
  for (const line of unfolded.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).toLowerCase().trim()
    const value = line.slice(colonIdx + 1).trim()
    headers[key] = value
  }
  return headers
}

function decodeBody(body: string, encoding: string): string {
  if (encoding === 'base64') {
    try {
      return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8')
    } catch {
      return body
    }
  }
  if (encoding === 'quoted-printable') {
    return decodeQuotedPrintable(body)
  }
  return body
}

function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r\n/g, '')
    .replace(/=\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/** Decode RFC 2231 encoded filenames like "utf-8''Datei%20Name.pdf" */
function decodeRFC2231(str: string): string {
  const match = str.match(/^([^']+)''(.+)$/)
  if (match) {
    try {
      return decodeURIComponent(match[2])
    } catch {
      return match[2]
    }
  }
  return str
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}
