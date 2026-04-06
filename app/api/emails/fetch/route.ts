import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchNewEmails } from '@/lib/email/imap'
import { generateEmailResponse, prioritizeEmail } from '@/lib/ai/index'
import { applyAutomationRules } from '@/lib/email/automation'

export async function POST() {
  try {
    const accounts = await prisma.emailAccount.findMany({ where: { isActive: true } })

    if (accounts.length === 0) {
      return NextResponse.json({ message: 'No active email accounts configured', fetched: 0 })
    }

    let totalFetched = 0

    for (const account of accounts) {
      const lastSync = account.lastSyncAt || undefined
      const emails = await fetchNewEmails(account, lastSync)

      for (const emailData of emails) {
        // Skip if already exists
        const existing = await prisma.email.findUnique({ where: { uid: emailData.uid } })
        if (existing) continue

        // Prioritize
        const priority = await prioritizeEmail(emailData.subject, emailData.body)

        // Save email with account reference
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

        // Save attachments
        if (emailData.attachments?.length) {
          await prisma.emailAttachment.createMany({
            data: emailData.attachments.map((a) => ({
              emailId: saved.id,
              filename: a.filename,
              contentType: a.contentType,
              size: a.size,
              contentId: a.contentId,
              data: a.data,
            })),
          })
        }

        // Apply automation rules first (auto_reply, label, queue)
        const automationResult = await applyAutomationRules({
          id: saved.id,
          uid: saved.uid,
          from: saved.from,
          fromName: saved.fromName,
          subject: saved.subject,
          body: saved.body,
          receivedAt: saved.receivedAt,
          emailAccountId: saved.emailAccountId,
        })

        // Only generate AI draft if no auto-reply was sent (fallback/queue/label path)
        if (!automationResult.replied) {
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
        }

        totalFetched++
      }

      // Update last sync
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: { lastSyncAt: new Date() },
      })
    }

    return NextResponse.json({ message: 'Sync complete', fetched: totalFetched })
  } catch (error) {
    console.error('Email fetch error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
