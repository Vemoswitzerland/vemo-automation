import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const month = searchParams.get('month') // format: YYYY-MM

  let where: any = {}

  if (status && status !== 'all') {
    where.status = status
  }

  if (month) {
    const [year, m] = month.split('-').map(Number)
    const start = new Date(year, m - 1, 1)
    const end = new Date(year, m, 1)
    where.OR = [
      { scheduledAt: { gte: start, lt: end } },
      { postedAt: { gte: start, lt: end } },
      { AND: [{ scheduledAt: null }, { postedAt: null }, { createdAt: { gte: start, lt: end } }] },
    ]
  }

  const posts = await prisma.instagramPost.findMany({
    where,
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ posts })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { caption, imageUrl, imagePrompt, script, scheduledAt, status } = body

  const post = await prisma.instagramPost.create({
    data: {
      caption: caption || '',
      imageUrl: imageUrl || null,
      imagePrompt: imagePrompt || null,
      script: script || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: status || 'draft',
    },
  })

  return NextResponse.json({ post }, { status: 201 })
}
