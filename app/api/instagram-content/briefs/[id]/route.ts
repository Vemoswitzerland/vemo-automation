/**
 * PATCH  /api/instagram-content/briefs/[id]  — update brief
 * DELETE /api/instagram-content/briefs/[id]  — delete brief
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = getUserId(req)
  const brief = await prisma.contentBrief.findUnique({ where: { id: params.id } })
  if (!brief) return NextResponse.json({ error: 'Brief nicht gefunden' }, { status: 404 })
  if (brief.userId !== userId) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  const body = await req.json()
  const { name, thema, zielgruppe, hashtags, toneOfVoice, isTemplate } = body

  const updated = await prisma.contentBrief.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(thema !== undefined && { thema }),
      ...(zielgruppe !== undefined && { zielgruppe }),
      ...(hashtags !== undefined && { hashtags }),
      ...(toneOfVoice !== undefined && { toneOfVoice }),
      ...(isTemplate !== undefined && { isTemplate }),
    },
  })

  return NextResponse.json({ brief: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = getUserId(req)
  const brief = await prisma.contentBrief.findUnique({ where: { id: params.id } })
  if (!brief) return NextResponse.json({ error: 'Brief nicht gefunden' }, { status: 404 })
  if (brief.userId !== userId) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  await prisma.contentBrief.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
