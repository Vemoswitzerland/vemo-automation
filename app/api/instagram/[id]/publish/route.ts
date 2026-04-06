import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createInstagramClient } from '@/lib/instagram/client'
import { getUserId } from '@/lib/user-context'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req)
  const post = await prisma.instagramPost.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (post.userId !== userId) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  if (!post.imageUrl) {
    return NextResponse.json(
      { error: 'Post hat kein Bild — bitte zuerst ein Bild hinzufügen' },
      { status: 400 },
    )
  }

  const client = createInstagramClient()

  try {
    const result = await client.publish({
      imageUrl: post.imageUrl,
      caption: post.caption,
    })

    const updated = await prisma.instagramPost.update({
      where: { id: params.id },
      data: {
        status: 'posted',
        postedAt: new Date(),
        postId: result.postId,
      },
    })

    return NextResponse.json({ post: updated, mock: result.mock, permalink: result.permalink })
  } catch (error) {
    await prisma.instagramPost.update({
      where: { id: params.id },
      data: { status: 'failed' },
    })
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
