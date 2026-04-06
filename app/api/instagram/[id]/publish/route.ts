import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createInstagramClient } from '@/lib/instagram/client'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const post = await prisma.instagramPost.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
