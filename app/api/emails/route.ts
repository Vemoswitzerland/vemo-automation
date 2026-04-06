import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MOCK_EMAILS, MOCK_DRAFTS } from '@/lib/email/index'
import { getUserId } from '@/lib/user-context'

function buildMockEmailResponse() {
  const emails = MOCK_EMAILS.map((e, i) => {
    const draft = MOCK_DRAFTS[e.uid]
    return {
      id: e.uid,
      uid: e.uid,
      from: e.from,
      fromName: e.fromName ?? null,
      subject: e.subject,
      body: e.body,
      priority: e.uid === 'mock-email-005' ? 8 : e.uid === 'mock-email-002' ? 6 : 5,
      receivedAt: e.receivedAt.toISOString(),
      drafts: draft
        ? [
            {
              id: `${e.uid}-draft`,
              subject: draft.subject,
              body: draft.body,
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
    }
  })
  return { emails, total: emails.length, page: 1, limit: 50, mock: true }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isMock = searchParams.get('mock') === 'true'

  if (isMock) {
    return NextResponse.json(buildMockEmailResponse())
  }

  const userId = getUserId(req)
  const status = searchParams.get('status') || 'all'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = status === 'pending'
    ? { userId, drafts: { some: { status: 'pending' } } }
    : { userId }

  const [emails, total] = await Promise.all([
    prisma.email.findMany({
      where,
      include: { drafts: true },
      orderBy: [{ priority: 'desc' }, { receivedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.email.count({ where }),
  ])

  return NextResponse.json({ emails, total, page, limit })
}
