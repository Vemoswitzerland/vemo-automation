import { prisma } from '@/lib/db'
import { fetchNewEmails } from '@/lib/email/imap'
import { generateEmailResponse, prioritizeEmail } from '@/lib/ai/index'

export const dynamic = 'force-dynamic'

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(sseEvent(data)))
      }

      try {
        const accounts = await prisma.emailAccount.findMany({ where: { isActive: true } })

        if (accounts.length === 0) {
          send({ type: 'done', fetched: 0, message: 'Keine aktiven E-Mail-Accounts konfiguriert' })
          controller.close()
          return
        }

        let totalFetched = 0

        for (const account of accounts) {
          send({ type: 'status', message: `Verbinde mit ${account.email}...` })

          const lastSync = account.lastSyncAt || undefined
          const emails = await fetchNewEmails(account, lastSync)

          send({ type: 'status', message: `${emails.length} neue E-Mails gefunden` })

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

            send({ type: 'progress', count: totalFetched + 1, subject: emailData.subject })

            const draft = await generateEmailResponse(
              {
                from: emailData.from,
                fromName: emailData.fromName,
                subject: emailData.subject,
                body: emailData.body,
              },
              account.name,
              account.email
            )

            await prisma.emailDraft.create({
              data: {
                emailId: saved.id,
                subject: draft.subject,
                body: draft.body,
                status: 'pending',
              },
            })

            totalFetched++
            send({ type: 'progress', count: totalFetched, subject: emailData.subject })
          }

          await prisma.emailAccount.update({
            where: { id: account.id },
            data: { lastSyncAt: new Date() },
          })
        }

        send({ type: 'done', fetched: totalFetched, message: `Sync abgeschlossen – ${totalFetched} neue E-Mail(s)` })
      } catch (error) {
        send({ type: 'error', message: String(error) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
