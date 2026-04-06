import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateEmailResponse } from '@/lib/ai/claude'

export async function POST(req: NextRequest) {
  const { emailId, instructions } = await req.json()

  const email = await prisma.email.findUnique({ where: { id: emailId } })
  if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 })

  const account = await prisma.emailAccount.findFirst({ where: { isActive: true } })
  const accountName = account?.name || 'Automation Center'
  const accountEmail = account?.email || ''

  const draft = await generateEmailResponse(
    {
      from: email.from,
      fromName: email.fromName || undefined,
      subject: email.subject,
      body: email.body,
    },
    accountName,
    accountEmail,
    instructions
  )

  const saved = await prisma.emailDraft.create({
    data: {
      emailId: email.id,
      subject: draft.subject,
      body: draft.body,
      status: 'pending',
      aiPrompt: instructions,
    },
  })

  return NextResponse.json(saved)
}
