/**
 * GET /api/instagram-content/status/[contentId]
 *
 * Returns the current status and details of an Instagram post.
 *
 * Statuses:
 *   draft      — created, not yet published or scheduled
 *   scheduled  — scheduled for future publishing
 *   posted     — successfully published on Instagram
 *   failed     — publishing attempt failed
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

export async function GET(
  req: NextRequest,
  { params }: { params: { contentId: string } },
) {
  const userId = getUserId(req)
  const { contentId } = params

  if (!contentId) {
    return NextResponse.json({ error: 'contentId ist erforderlich' }, { status: 400 })
  }

  const post = await prisma.instagramPost.findUnique({
    where: { id: contentId },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
  }

  if (post.userId !== userId) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  return NextResponse.json({
    id: post.id,
    status: post.status,
    caption: post.caption,
    imageUrl: post.imageUrl,
    postId: post.postId,
    scheduledAt: post.scheduledAt,
    postedAt: post.postedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    permalink: post.postId ? `https://www.instagram.com/p/${post.postId}/` : null,
  })
}
