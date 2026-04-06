import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email/smtp'

export async function POST(req: NextRequest) {
  const { draftId, action, editedBody, editedSubject } = await req.json()

  const draft = await prisma.emailDraft.findUnique({
    where: { id: draftId },
    include: { email: true },
  })

  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

  if (action === 'reject') {
    await prisma.emailDraft.update({
      where: { id: draftId },
      data: { status: 'rejected' },
    })
    return NextResponse.json({ message: 'Draft rejected' })
  }

  if (action === 'approve') {
    // Update draft if edited
    const finalSubject = editedSubject || draft.subject
    const finalBody = editedBody || draft.body

    await prisma.emailDraft.update({
      where: { id: draftId },
      data: {
        status: 'approved',
        subject: finalSubject,
        body: finalBody,
        approvedAt: new Date(),
      },
    })

    return NextResponse.json({ message: 'Draft approved - ready to send', draftId })
  }

  if (action === 'send') {
    const account = await prisma.emailAccount.findFirst({ where: { isActive: true } })
    if (!account) return NextResponse.json({ error: 'No active email account' }, { status: 400 })

    const finalSubject = editedSubject || draft.subject
    const finalBody = editedBody || draft.body

    await sendEmail(account, draft.email.from, finalSubject, finalBody, draft.email.messageId ?? undefined)

    await prisma.emailDraft.update({
      where: { id: draftId },
      data: {
        status: 'sent',
        subject: finalSubject,
        body: finalBody,
        approvedAt: new Date(),
        sentAt: new Date(),
      },
    })

    return NextResponse.json({ message: 'Email sent successfully' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
