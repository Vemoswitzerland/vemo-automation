import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req)
  const post = await prisma.linkedInPost.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
  if (post.userId !== userId) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  const body = await req.json()
  const { caption, imageUrl, imagePrompt, scheduledAt, status } = body

  const updated = await prisma.linkedInPost.update({
    where: { id: params.id },
    data: {
      ...(caption !== undefined && { caption }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(imagePrompt !== undefined && { imagePrompt }),
      ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      ...(status !== undefined && { status }),
    },
  })

  return NextResponse.json({ post: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req)
  const post = await prisma.linkedInPost.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
  if (post.userId !== userId) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  await prisma.linkedInPost.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
