import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createLinkedInClient } from '@/lib/linkedin/client'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const post = await prisma.linkedInPost.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const client = createLinkedInClient()
    const result = await client.publish({
      text: post.caption,
      imageUrl: post.imageUrl ?? undefined,
    })

    const updated = await prisma.linkedInPost.update({
      where: { id: params.id },
      data: { status: 'posted', postedAt: new Date(), postId: result.postId },
    })

    return NextResponse.json({ post: updated, result })
  } catch (err: any) {
    await prisma.linkedInPost.update({
      where: { id: params.id },
      data: { status: 'failed' },
    })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
