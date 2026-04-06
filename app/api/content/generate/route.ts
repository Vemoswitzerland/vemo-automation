import { NextRequest, NextResponse } from 'next/server'
import { generateContentPipeline } from '@/lib/ai/content'

export async function POST(req: NextRequest) {
  try {
    const { thema, tone } = await req.json()

    if (!thema || typeof thema !== 'string' || !thema.trim()) {
      return NextResponse.json({ error: 'Thema ist erforderlich' }, { status: 400 })
    }

    const result = await generateContentPipeline(thema.trim(), tone || 'casual')
    return NextResponse.json(result)
  } catch (err) {
    console.error('Content generation error:', err)
    return NextResponse.json({ error: 'Fehler bei der Content-Generierung' }, { status: 500 })
  }
}
