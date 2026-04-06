/**
 * POST /api/instagram-content/generate-captions
 *
 * Generates Instagram caption, hashtags, and a 30-second video script for a
 * given topic. Uses Claude (Anthropic) when ANTHROPIC_API_KEY is set, or
 * returns mock data otherwise.
 *
 * Body:
 *   thema       string  — content topic / brief (required)
 *   tone?       "casual" | "professional" | "motivational"  (default: casual)
 *   hashtags?   string  — seed hashtags to include
 *   zielgruppe? string  — target audience description
 *   imageUrl?   string  — if provided, caption is tailored to the image
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateContentPipeline } from '@/lib/ai/content'
import { getUserId } from '@/lib/user-context'

export async function POST(req: NextRequest) {
  const userId = getUserId(req)

  let body: {
    thema?: string
    tone?: 'casual' | 'professional' | 'motivational'
    hashtags?: string
    zielgruppe?: string
    imageUrl?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const { thema, tone = 'casual', hashtags, zielgruppe } = body

  if (!thema || typeof thema !== 'string' || !thema.trim()) {
    return NextResponse.json({ error: 'thema ist erforderlich' }, { status: 400 })
  }

  try {
    const result = await generateContentPipeline(thema.trim(), tone)

    // Append seed hashtags if provided
    const captionWithHashtags = hashtags
      ? `${result.script}\n\n${hashtags}`
      : result.script

    console.info('[instagram-content] generate-captions', {
      userId,
      tone,
      zielgruppe,
      mock: result.isMock,
    })

    return NextResponse.json({
      caption: captionWithHashtags,
      script: result.script,
      imagePrompt: result.imagePrompt,
      videoConcept: result.videoConcept,
      tone,
      mock: result.isMock,
    })
  } catch (err) {
    console.error('[instagram-content] generate-captions error:', err)
    return NextResponse.json(
      { error: 'Fehler bei der Caption-Generierung', detail: String(err) },
      { status: 500 },
    )
  }
}
