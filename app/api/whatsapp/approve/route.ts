import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { draftId, action, editedBody } = body as {
    draftId: string
    action: 'approve' | 'reject' | 'send'
    editedBody?: string
  }

  if (!draftId || !action) {
    return NextResponse.json({ error: 'draftId and action required' }, { status: 400 })
  }

  const draft = await prisma.whatsAppDraft.findUnique({
    where: { id: draftId },
    include: { message: true },
  })
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

  if (action === 'reject') {
    await prisma.whatsAppDraft.update({
      where: { id: draftId },
      data: { status: 'rejected' },
    })
    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  // Approve or send
  const finalBody = editedBody || draft.body

  if (action === 'send') {
    // Check if WhatsApp connector is configured
    const connector = await prisma.connector.findUnique({ where: { id: 'whatsapp' } })
    const isMockMode = !connector || connector.status !== 'connected'

    if (!isMockMode) {
      // Real WhatsApp API send would go here
      // const accessToken = connector?.credentials ...
      // await sendWhatsAppMessage(draft.message.from, finalBody, accessToken)
    }

    // In mock mode or after real send: mark as sent
    await prisma.whatsAppDraft.update({
      where: { id: draftId },
      data: {
        body: finalBody,
        status: 'sent',
        sentAt: new Date(),
        approvedAt: new Date(),
      },
    })

    // Mark message as read
    await prisma.whatsAppMessage.update({
      where: { id: draft.messageId },
      data: { status: 'read' },
    })

    return NextResponse.json({ ok: true, status: 'sent', isMockMode })
  }

  // approve only (save draft without sending)
  await prisma.whatsAppDraft.update({
    where: { id: draftId },
    data: {
      body: finalBody,
      status: 'approved',
      approvedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true, status: 'approved' })
}
