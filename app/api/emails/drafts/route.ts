import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { generateEmailResponse } from '@/lib/ai/claude'

const DraftSchema = z.object({
  emailId: z.string().min(1, 'emailId is required'),
  instructions: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = DraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 })
  }

  const { emailId, instructions } = parsed.data

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
