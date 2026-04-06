/**
 * POST /api/instagram-content/publish
 *
 * Publishes an Instagram post (or schedules it) via the Meta Graph API.
 * Accepts a content ID (existing InstagramPost) or inline payload.
 *
 * Body (option A — existing post):
 *   contentId   string  — ID of an existing InstagramPost record
 *
 * Body (option B — inline):
 *   caption     string  — post caption (required)
 *   imageUrl    string  — public image URL (required for feed posts)
 *   scheduledAt string? — ISO date string for scheduled publishing
 *
 * Returns:
 *   post        InstagramPost (updated record)
 *   permalink   string
 *   mock        boolean
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createInstagramClient } from '@/lib/instagram/client'
import { getUserId } from '@/lib/user-context'

export async function POST(req: NextRequest) {
  const userId = getUserId(req)

  let body: {
    contentId?: string
    caption?: string
    imageUrl?: string
    imagePrompt?: string
    scheduledAt?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  let post = null

  if (body.contentId) {
    // Option A: publish existing post
    post = await prisma.instagramPost.findUnique({ where: { id: body.contentId } })
    if (!post) {
      return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
    }
    if (post.userId !== userId) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
    }
  } else {
    // Option B: create new post from inline payload
    const { caption, imageUrl, imagePrompt, scheduledAt } = body
    if (!caption) {
      return NextResponse.json({ error: 'caption ist erforderlich' }, { status: 400 })
    }
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl ist erforderlich' }, { status: 400 })
    }

    post = await prisma.instagramPost.create({
      data: {
        userId,
        caption,
        imageUrl,
        imagePrompt: imagePrompt ?? null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'scheduled' : 'draft',
      },
    })
  }

  // If a future scheduledAt is set, do not publish now — just return the scheduled post
  if (post.scheduledAt && post.scheduledAt > new Date()) {
    const updated = await prisma.instagramPost.update({
      where: { id: post.id },
      data: { status: 'scheduled' },
    })
    return NextResponse.json({
      post: updated,
      scheduled: true,
      scheduledAt: updated.scheduledAt,
    })
  }

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
      where: { id: post.id },
      data: {
        status: 'posted',
        postedAt: new Date(),
        postId: result.postId,
      },
    })

    console.info('[instagram-content] publish', {
      userId,
      postId: updated.id,
      mock: result.mock,
    })

    return NextResponse.json({
      post: updated,
      permalink: result.permalink,
      mock: result.mock,
    })
  } catch (err) {
    await prisma.instagramPost.update({
      where: { id: post.id },
      data: { status: 'failed' },
    })
    console.error('[instagram-content] publish error:', err)
    return NextResponse.json(
      { error: 'Fehler beim Publizieren', detail: String(err) },
      { status: 500 },
    )
  }
}
