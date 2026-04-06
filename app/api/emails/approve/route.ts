import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email/smtp'

const ApproveSchema = z.object({
  draftId: z.string().min(1, 'draftId is required'),
  action: z.enum(['approve', 'reject', 'send'] as const),
  editedBody: z.string().optional(),
  editedSubject: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ApproveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 })
  }

  const { draftId, action, editedBody, editedSubject } = parsed.data

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
}
