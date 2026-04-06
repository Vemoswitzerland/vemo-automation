import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

export async function GET(req: NextRequest) {
  const userId = getUserId(req)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [total, draft, scheduled, posted, thisMonth] = await Promise.all([
    prisma.instagramPost.count({ where: { userId } }),
    prisma.instagramPost.count({ where: { userId, status: 'draft' } }),
    prisma.instagramPost.count({ where: { userId, status: 'scheduled' } }),
    prisma.instagramPost.count({ where: { userId, status: 'posted' } }),
    prisma.instagramPost.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    }),
  ])

  return NextResponse.json({ total, draft, scheduled, posted, thisMonth })
}
