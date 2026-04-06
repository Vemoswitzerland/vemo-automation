/**
 * POST /api/instagram-content/generate-images
 *
 * Generates one or more images for Instagram content using the configured
 * image-generation provider (DALL-E 3 when OPENAI_API_KEY is set, mock otherwise).
 *
 * Body:
 *   prompt    string  — content brief / image description (required)
 *   count?    number  — number of variants to generate (1–4, default 3)
 *   style?    ImageStyle — photorealistic | illustration | minimalist | flat-design | editorial
 *   format?   ImageFormat — 1:1 | 4:5 | 9:16 | 16:9 (default 1:1)
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  createImageGenerationClient,
  isMockImageGeneration,
  type ImageStyle,
  type ImageFormat,
} from '@/lib/ai/image'
import { getUserId } from '@/lib/user-context'

export async function POST(req: NextRequest) {
  const userId = getUserId(req)

  let body: {
    prompt?: string
    count?: number
    style?: ImageStyle
    format?: ImageFormat
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const { prompt, count = 3, style, format = '1:1' } = body

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'prompt ist erforderlich' }, { status: 400 })
  }

  const clampedCount = Math.min(Math.max(Number(count) || 3, 1), 4)
  const client = createImageGenerationClient()

  try {
    const generations = await Promise.all(
      Array.from({ length: clampedCount }, () =>
        client.generate({ prompt: prompt.trim(), style, format }),
      ),
    )

    console.info('[instagram-content] generate-images', {
      userId,
      count: clampedCount,
      style,
      format,
      mock: isMockImageGeneration,
    })

    return NextResponse.json({
      images: generations,
      mock: isMockImageGeneration,
      count: generations.length,
    })
  } catch (err) {
    console.error('[instagram-content] generate-images error:', err)
    return NextResponse.json(
      { error: 'Fehler bei der Bildgenerierung', detail: String(err) },
      { status: 500 },
    )
  }
}
