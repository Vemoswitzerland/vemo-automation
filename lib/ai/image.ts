/**
 * AI Image Generation Service — lib/ai/image.ts
 *
 * Abstraction over image-generation APIs (DALL-E 3, Stability AI, Midjourney).
 * Returns a MockImageGenerationClient when OPENAI_API_KEY / STABILITY_API_KEY is not set.
 * Add real credentials via .env.local → no code changes needed.
 *
 * Interface-first design: swap to real provider once API keys arrive.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImageStyle =
  | 'photorealistic'
  | 'illustration'
  | 'minimalist'
  | 'flat-design'
  | 'editorial'

export type ImageFormat = '1:1' | '4:5' | '9:16' | '16:9'

export interface ImageGenerationPayload {
  prompt: string
  style?: ImageStyle
  format?: ImageFormat
  brand?: {
    primaryColor?: string // e.g. '#1DB954'
    fontStyle?: string
    logoUrl?: string
  }
}

export interface GeneratedImage {
  url: string        // public URL or data URI
  prompt: string     // final prompt used
  revisedPrompt?: string // prompt revised by API (DALL-E)
  width: number
  height: number
  provider: 'dalle3' | 'stability' | 'mock'
  mock: boolean
}

export interface ImageGenerationClient {
  generate(payload: ImageGenerationPayload): Promise<GeneratedImage>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatToDimensions(format: ImageFormat): { width: number; height: number } {
  const map: Record<ImageFormat, { width: number; height: number }> = {
    '1:1':  { width: 1024, height: 1024 },
    '4:5':  { width: 1024, height: 1280 },
    '9:16': { width: 768,  height: 1366 },
    '16:9': { width: 1366, height: 768  },
  }
  return map[format] ?? { width: 1024, height: 1024 }
}

// ---------------------------------------------------------------------------
// Mock Client
// ---------------------------------------------------------------------------

// A set of placeholder image URLs (Unsplash-style) used in demo mode
const MOCK_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1024&h=1024&fit=crop',
  'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1024&h=1024&fit=crop',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1024&h=1024&fit=crop',
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1024&h=1024&fit=crop',
  'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=1024&h=1024&fit=crop',
]

class MockImageGenerationClient implements ImageGenerationClient {
  async generate(payload: ImageGenerationPayload): Promise<GeneratedImage> {
    await new Promise((r) => setTimeout(r, 1200)) // simulate generation time
    const dims = formatToDimensions(payload.format ?? '1:1')
    const mockUrl = MOCK_IMAGE_URLS[Math.floor(Math.random() * MOCK_IMAGE_URLS.length)]
    return {
      url: mockUrl,
      prompt: payload.prompt,
      width: dims.width,
      height: dims.height,
      provider: 'mock',
      mock: true,
    }
  }
}

// ---------------------------------------------------------------------------
// Real DALL-E 3 Client (OpenAI)
// ---------------------------------------------------------------------------

class DallE3Client implements ImageGenerationClient {
  constructor(private readonly apiKey: string) {}

  async generate(payload: ImageGenerationPayload): Promise<GeneratedImage> {
    const dims = formatToDimensions(payload.format ?? '1:1')
    const size = `${dims.width}x${dims.height}` as '1024x1024' | '1024x1792' | '1792x1024'

    const styleNote = payload.style
      ? `Style: ${payload.style}. `
      : ''
    const brandNote = payload.brand?.primaryColor
      ? `Brand color: ${payload.brand.primaryColor}. `
      : ''
    const finalPrompt = `${styleNote}${brandNote}${payload.prompt}. Professional, high quality, suitable for Instagram marketing.`

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: finalPrompt,
        n: 1,
        size,
        quality: 'hd',
        response_format: 'url',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`DALL-E 3 generation failed: ${err}`)
    }

    const data = await res.json()
    const item = data.data?.[0]
    return {
      url: item.url,
      prompt: finalPrompt,
      revisedPrompt: item.revised_prompt,
      width: dims.width,
      height: dims.height,
      provider: 'dalle3',
      mock: false,
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createImageGenerationClient(): ImageGenerationClient {
  const openAiKey = process.env.OPENAI_API_KEY
  if (openAiKey) {
    return new DallE3Client(openAiKey)
  }
  // Future: add Stability AI support here
  // const stabilityKey = process.env.STABILITY_API_KEY
  // if (stabilityKey) return new StabilityClient(stabilityKey)
  return new MockImageGenerationClient()
}

export const isMockImageGeneration = !process.env.OPENAI_API_KEY
