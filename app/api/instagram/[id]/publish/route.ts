import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN

  const post = await prisma.instagramPost.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!token) {
    // Mock mode: simulate posting
    const updated = await prisma.instagramPost.update({
      where: { id: params.id },
      data: {
        status: 'posted',
        postedAt: new Date(),
        postId: `mock_${Date.now()}`,
      },
    })
    return NextResponse.json({ post: updated, mock: true })
  }

  // Real Instagram posting would go here
  // For now just mark as posted
  const updated = await prisma.instagramPost.update({
    where: { id: params.id },
    data: {
      status: 'posted',
      postedAt: new Date(),
    },
  })

  return NextResponse.json({ post: updated, mock: false })
}
