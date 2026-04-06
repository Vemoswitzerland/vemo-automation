/**
 * Scheduler: Automatischer E-Mail-Sync alle 5 Minuten.
 * Singleton-Pattern — nur ein Scheduler-Prozess läuft gleichzeitig.
 */
import * as cron from 'node-cron'
import { prisma } from '@/lib/db'
import { fetchNewEmails } from '@/lib/email/imap'
import { generateEmailResponse, prioritizeEmail } from '@/lib/ai/claude'

let schedulerTask: cron.ScheduledTask | null = null

async function runEmailSync(): Promise<void> {
  console.log('[scheduler] Starting scheduled email sync...')
  const startedAt = new Date()

  try {
    const accounts = await prisma.emailAccount.findMany({ where: { isActive: true } })

    if (accounts.length === 0) {
      console.log('[scheduler] No active email accounts, skipping.')
      return
    }

    let totalFetched = 0

    for (const account of accounts) {
      try {
        const lastSync = account.lastSyncAt || undefined
        const emails = await fetchNewEmails(account, lastSync)

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
        }

        await prisma.emailAccount.update({
          where: { id: account.id },
          data: { lastSyncAt: new Date() },
        })
      } catch (error) {
        console.error(`[scheduler] Error syncing account ${account.email}:`, error)
        // Continue with next account — individual account errors don't abort the whole run
      }
    }

    // Persist scheduler state
    await prisma.appSettings.upsert({
      where: { key: 'lastScheduledSync' },
      create: { key: 'lastScheduledSync', value: startedAt.toISOString() },
      update: { value: startedAt.toISOString() },
    })

    console.log(`[scheduler] Sync complete — fetched ${totalFetched} new emails.`)
  } catch (error) {
    console.error('[scheduler] Sync failed:', error)
  }
}

export function startScheduler(): void {
  if (schedulerTask) {
    console.log('[scheduler] Already running, skipping start.')
    return
  }

  console.log('[scheduler] Starting — email sync every 5 minutes.')

  schedulerTask = cron.schedule('*/5 * * * *', () => {
    runEmailSync().catch((err) => console.error('[scheduler] Unhandled error:', err))
  })
}

export function stopScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop()
    schedulerTask = null
    console.log('[scheduler] Stopped.')
  }
}
