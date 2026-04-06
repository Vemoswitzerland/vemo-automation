/**
 * GET  /api/instagram-content/briefs          — list briefs/templates
 * POST /api/instagram-content/briefs          — create brief/template
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

export async function GET(req: NextRequest) {
  const userId = getUserId(req)
  const { searchParams } = new URL(req.url)
  const templatesOnly = searchParams.get('templates') === 'true'

  const briefs = await prisma.contentBrief.findMany({
    where: {
      userId,
      ...(templatesOnly ? { isTemplate: true } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ briefs })
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req)

  let body: {
    name?: string
    thema?: string
    zielgruppe?: string
    hashtags?: string
    toneOfVoice?: string
    isTemplate?: boolean
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const { name, thema, zielgruppe, hashtags, toneOfVoice = 'casual', isTemplate = false } = body

  if (!thema || typeof thema !== 'string' || !thema.trim()) {
    return NextResponse.json({ error: 'thema ist erforderlich' }, { status: 400 })
  }

  const brief = await prisma.contentBrief.create({
    data: {
      userId,
      name: name || thema.trim().slice(0, 60),
      thema: thema.trim(),
      zielgruppe: zielgruppe ?? null,
      hashtags: hashtags ?? null,
      toneOfVoice,
      isTemplate,
    },
  })

  return NextResponse.json({ brief }, { status: 201 })
}
