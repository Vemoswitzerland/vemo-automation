import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createFacebookClient } from '@/lib/facebook/client'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const post = await prisma.facebookPost.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const client = createFacebookClient()
    const result = await client.publish({
      message: post.caption,
      imageUrl: post.imageUrl ?? undefined,
    })

    const updated = await prisma.facebookPost.update({
      where: { id: params.id },
      data: { status: 'posted', postedAt: new Date(), postId: result.postId },
    })

    return NextResponse.json({ post: updated, result })
  } catch (err: any) {
    await prisma.facebookPost.update({
      where: { id: params.id },
      data: { status: 'failed' },
    })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
