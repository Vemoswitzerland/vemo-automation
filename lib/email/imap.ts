import { ImapFlow } from 'imapflow'
import type { EmailAccount } from '@prisma/client'
import { decrypt } from '@/lib/crypto'
import { withRetry } from '@/lib/retry'

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
}

export async function fetchNewEmails(account: EmailAccount, sinceDate?: Date): Promise<FetchedEmail[]> {
  return withRetry(() => fetchNewEmailsOnce(account, sinceDate), {
    label: `IMAP fetch (${account.email})`,
  })
}

async function fetchNewEmailsOnce(account: EmailAccount, sinceDate?: Date): Promise<FetchedEmail[]> {
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapPort === 993,
    auth: {
      user: account.username,
      pass: decrypt(account.password),
    },
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

        // Get text body
        let body = ''
        let bodyHtml = ''
        
        try {
          const textPart = await client.download(message.uid.toString(), '1', { uid: true })
          if (textPart?.content) {
            const chunks: Buffer[] = []
            for await (const chunk of textPart.content) {
              chunks.push(chunk)
            }
            body = Buffer.concat(chunks).toString('utf-8')
          }
        } catch {
          // Try alternative part
          try {
            const src = message.source
            if (src) {
              const chunks: Buffer[] = []
              for await (const chunk of src as unknown as AsyncIterable<Buffer>) {
                chunks.push(chunk)
              }
              const raw = Buffer.concat(chunks).toString('utf-8')
              // Extract plain text from raw email
              const bodyMatch = raw.match(/\r\n\r\n([\s\S]+)$/)
              if (bodyMatch) body = bodyMatch[1].replace(/=\r\n/g, '').replace(/=\n/g, '')
            }
          } catch { /* ignore */ }
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
        })
      }
    } finally {
      lock.release()
    }

    await client.logout()
  } catch (error) {
    console.error('IMAP fetch error:', error)
    throw error
  }

  return emails
}
