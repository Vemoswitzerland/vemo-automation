/**
 * A/B Tests API — /api/ads/ab-tests
 *
 * GET  — list all tests ({ tests, isMock: true })
 * POST — create a new test in memory (returns 201)
 *
 * Mock data is used until META_ADS_TOKEN / GOOGLE_ADS_TOKEN are set.
 */
import { NextRequest, NextResponse } from 'next/server'

// ─── Types ───────────────────────────────────────────────────────────────────

type VariantMetrics = {
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  ctr: number
  cpa: number
  roas: number
}

type ABTestVariant = {
  id: string
  label: string
  adId: string | null
  status: string
  metrics: VariantMetrics
}

type ABTest = {
  id: string
  name: string
  adId: string | null
  status: 'active' | 'paused' | 'completed'
  trafficSplit: number[]
  startDate: string
  endDate: string | null
  winner: string | null
  confidenceLevel: number | null
  recommendation: string | null
  variants: ABTestVariant[]
  createdAt: string
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_TESTS: ABTest[] = [
  {
    id: 'mock-abt-1',
    name: 'Instagram Story — Headline Test',
    adId: 'mock-c1',
    status: 'active',
    trafficSplit: [50, 50],
    startDate: '2026-03-20T00:00:00.000Z',
    endDate: null,
    winner: null,
    confidenceLevel: 72,
    recommendation:
      'Variante B zeigt eine höhere CTR (+18 %). Noch ca. 3 Tage bis zur statistischen Signifikanz.',
    createdAt: '2026-03-20T00:00:00.000Z',
    variants: [
      {
        id: 'mock-abt-1-a',
        label: 'A',
        adId: 'mock-ad-1a',
        status: 'active',
        metrics: { impressions: 24800, clicks: 620, conversions: 31, spend: 210, revenue: 945, ctr: 2.5, cpa: 6.77, roas: 4.5 },
      },
      {
        id: 'mock-abt-1-b',
        label: 'B',
        adId: 'mock-ad-1b',
        status: 'active',
        metrics: { impressions: 25100, clicks: 740, conversions: 39, spend: 213, revenue: 1248, ctr: 2.95, cpa: 5.46, roas: 5.86 },
      },
    ],
  },
  {
    id: 'mock-abt-2',
    name: 'Facebook — Einzelbild vs. Karussell',
    adId: 'mock-c2',
    status: 'completed',
    trafficSplit: [50, 50],
    startDate: '2026-02-01T00:00:00.000Z',
    endDate: '2026-02-28T00:00:00.000Z',
    winner: 'mock-abt-2-b',
    confidenceLevel: 96,
    recommendation:
      'Karussell (Variante B) gewinnt mit 96 % Konfidenz. ROAS +34 % gegenüber Einzelbild. Skalierung empfohlen.',
    createdAt: '2026-02-01T00:00:00.000Z',
    variants: [
      {
        id: 'mock-abt-2-a',
        label: 'A – Einzelbild',
        adId: 'mock-ad-2a',
        status: 'loser',
        metrics: { impressions: 31200, clicks: 780, conversions: 42, spend: 290, revenue: 1218, ctr: 2.5, cpa: 6.9, roas: 4.2 },
      },
      {
        id: 'mock-abt-2-b',
        label: 'B – Karussell',
        adId: 'mock-ad-2b',
        status: 'winner',
        metrics: { impressions: 30900, clicks: 1080, conversions: 67, spend: 288, revenue: 1624, ctr: 3.5, cpa: 4.3, roas: 5.64 },
      },
    ],
  },
  {
    id: 'mock-abt-3',
    name: 'Google Search — CTA Varianten',
    adId: 'mock-c3',
    status: 'paused',
    trafficSplit: [34, 33, 33],
    startDate: '2026-03-01T00:00:00.000Z',
    endDate: null,
    winner: null,
    confidenceLevel: 45,
    recommendation:
      'Test pausiert — zu wenig Daten für eine valide Auswertung. Budget auf mind. CHF 300 erhöhen und neu starten.',
    createdAt: '2026-03-01T00:00:00.000Z',
    variants: [
      {
        id: 'mock-abt-3-a',
        label: 'A – «Jetzt starten»',
        adId: 'mock-ad-3a',
        status: 'paused',
        metrics: { impressions: 5200, clicks: 188, conversions: 9, spend: 88, revenue: 270, ctr: 3.62, cpa: 9.78, roas: 3.07 },
      },
      {
        id: 'mock-abt-3-b',
        label: 'B – «Kostenlos testen»',
        adId: 'mock-ad-3b',
        status: 'paused',
        metrics: { impressions: 4980, clicks: 174, conversions: 11, spend: 85, revenue: 330, ctr: 3.49, cpa: 7.73, roas: 3.88 },
      },
      {
        id: 'mock-abt-3-c',
        label: 'C – «Demo buchen»',
        adId: 'mock-ad-3c',
        status: 'paused',
        metrics: { impressions: 4750, clicks: 152, conversions: 7, spend: 82, revenue: 210, ctr: 3.2, cpa: 11.71, roas: 2.56 },
      },
    ],
  },
]

// In-memory session store for newly created tests
const sessionTests: ABTest[] = []

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({ tests: [...sessionTests, ...MOCK_TESTS], isMock: true })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, adId, variantCount = 2, trafficSplit, durationDays = 14 } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name ist erforderlich' }, { status: 400 })
    }

    const count = Math.min(Math.max(Number(variantCount), 2), 4)
    const split: number[] = trafficSplit ?? Array(count).fill(Math.round(100 / count))
    const labels = ['A', 'B', 'C', 'D'].slice(0, count)
    const startDate = new Date().toISOString()
    const endDate = new Date(
      Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000,
    ).toISOString()

    const newTest: ABTest = {
      id: `session-abt-${Date.now()}`,
      name: name.trim(),
      adId: adId ?? null,
      status: 'active',
      trafficSplit: split,
      startDate,
      endDate,
      winner: null,
      confidenceLevel: null,
      recommendation: 'Test läuft. Erste Daten in 24–48 Stunden verfügbar.',
      createdAt: startDate,
      variants: labels.map((label, i) => ({
        id: `session-abt-${Date.now()}-${i}`,
        label,
        adId: null,
        status: 'active',
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, ctr: 0, cpa: 0, roas: 0 },
      })),
    }

    sessionTests.unshift(newTest)

    return NextResponse.json({ test: newTest, isMock: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }
}
