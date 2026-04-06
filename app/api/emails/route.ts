import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'all'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where = status === 'pending'
    ? { drafts: { some: { status: 'pending' } } }
    : {}

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
