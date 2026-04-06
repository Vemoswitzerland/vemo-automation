import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { caption, imageUrl, imagePrompt, script, scheduledAt, status } = body

  const post = await prisma.instagramPost.update({
    where: { id: params.id },
    data: {
      ...(caption !== undefined && { caption }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(imagePrompt !== undefined && { imagePrompt }),
      ...(script !== undefined && { script }),
      ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      ...(status !== undefined && { status }),
    },
  })

  return NextResponse.json({ post })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.instagramPost.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
