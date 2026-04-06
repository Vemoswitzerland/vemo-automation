import Anthropic from '@anthropic-ai/sdk'

const MOCK_SCRIPTS: Record<string, string> = {
  default: `🎬 SKRIPT: {thema}

HOOK (0-3 Sek):
"Weisst du, was der grösste Fehler bei {thema} ist?"

HAUPTTEIL (3-25 Sek):
Stell dir vor, du könntest {thema} in nur 60 Sekunden meistern.
Hier ist, was die meisten falsch machen – und wie du es besser machst.

Punkt 1: Fokus auf das Wesentliche
Punkt 2: Konsequenz schlägt Talent
Punkt 3: Starte heute, nicht morgen

CALL TO ACTION (25-30 Sek):
"Folge uns für mehr Tipps zu {thema}. Link in Bio!"`,
}

const MOCK_IMAGE_PROMPTS = [
  'Minimalistisches, professionelles Flat-Design in Grün und Dunkelgrau. Zentrale Grafik zeigt {thema} mit modernen Icons. Saubere Typografie, viel Weissraum. Instagram-Format 1:1.',
  'Dynamische Komposition mit abstrakten Formen in leuchtendem Grün auf dunklem Hintergrund. Bold Text "{thema}" in der Mitte. High-contrast, modern aesthetic. 1080x1080px.',
  'Authentisches Lifestyle-Foto-Konzept: Person in elegantem Setting mit Bezug zu {thema}. Warme Farbtöne, natürliches Licht, Instagram-taugliche Ästhetik.',
]

const MOCK_VIDEO_CONCEPTS = [
  `🎥 VIDEO-KONZEPT: {thema}

FORMAT: Reels (30 Sek) | Vertikales Format 9:16

SZENE 1 (0-5 Sek) — Hook:
• Schneller Jump-Cut
• Boldtext-Animation: "Das musst du über {thema} wissen"
• Hintergrundmusik: Energetisch, modern

SZENE 2 (5-20 Sek) — Hauptinhalt:
• 3x schnelle Cuts mit je einem Key-Point
• Screen-Recording oder B-Roll Footage
• Captions für Stummschaltung

SZENE 3 (20-30 Sek) — CTA:
• Zoom-Out Effekt
• Text: "Mehr davon? Folge uns!"
• Like-Button Animation einblenden

STYLE: Dynamisch, modern, professionell
MUSIK: Trending Audio von Instagram`,
]

function getMockScript(thema: string): string {
  return MOCK_SCRIPTS.default.replace(/\{thema\}/g, thema)
}

function getMockImagePrompt(thema: string): string {
  const tpl = MOCK_IMAGE_PROMPTS[Math.floor(Math.random() * MOCK_IMAGE_PROMPTS.length)]
  return tpl.replace(/\{thema\}/g, thema)
}

function getMockVideoConcept(thema: string): string {
  const tpl = MOCK_VIDEO_CONCEPTS[Math.floor(Math.random() * MOCK_VIDEO_CONCEPTS.length)]
  return tpl.replace(/\{thema\}/g, thema)
}

export interface ContentGenerationResult {
  script: string
  imagePrompt: string
  videoConcept: string
  isMock: boolean
}

export async function generateContentPipeline(
  thema: string,
  tone: 'professional' | 'casual' | 'motivational' = 'casual'
): Promise<ContentGenerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const isMock = !apiKey

  if (isMock) {
    await new Promise((r) => setTimeout(r, 600))
    return {
      script: getMockScript(thema),
      imagePrompt: getMockImagePrompt(thema),
      videoConcept: getMockVideoConcept(thema),
      isMock: true,
    }
  }

  const client = new Anthropic({ apiKey })

  const toneInstructions = {
    professional: 'Professionell, seriös, kompetent. Zielgruppe: Unternehmer, Professionals.',
    casual: 'Locker, freundlich, authentisch. Zielgruppe: Allgemein, 18-35 Jahre.',
    motivational: 'Motivierend, energetisch, inspirierend. Zielgruppe: Ambitionierte Menschen.',
  }[tone]

  const prompt = `Du bist ein professioneller Social-Media-Content-Creator für Instagram.
Erstelle für das Thema "${thema}" eine vollständige Content-Pipeline.
Tonalität: ${toneInstructions}

Antworte NUR als JSON mit diesen 3 Feldern:
{
  "script": "30-Sekunden Video-Skript mit Hook, Hauptteil und CTA. Strukturiert mit Zeitangaben.",
  "imagePrompt": "Detaillierter Bild-Prompt für DALL-E oder Midjourney. Konkrete visuelle Beschreibung, Stil, Farben, Format.",
  "videoConcept": "Video-Konzept mit Szenenaufteilung, Stil, Musik, Effekten. Für Instagram Reels optimiert."
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    return {
      script: getMockScript(thema),
      imagePrompt: getMockImagePrompt(thema),
      videoConcept: getMockVideoConcept(thema),
      isMock: true,
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      script: parsed.script || getMockScript(thema),
      imagePrompt: parsed.imagePrompt || getMockImagePrompt(thema),
      videoConcept: parsed.videoConcept || getMockVideoConcept(thema),
      isMock: false,
    }
  } catch {
    return {
      script: getMockScript(thema),
      imagePrompt: getMockImagePrompt(thema),
      videoConcept: getMockVideoConcept(thema),
      isMock: true,
    }
  }
}
