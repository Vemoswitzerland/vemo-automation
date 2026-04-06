/**
 * A/B Testing Logic — lib/ads/ab-testing.ts
 * Statistical analysis for ad A/B tests.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ABTestVariant {
  id: string
  name: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
}

export interface ABTestResult {
  variantId: string
  ctr: number
  conversionRate: number
  cpa: number
  isWinner: boolean
  confidenceLevel: number   // 0-100%
  recommendation: 'scale' | 'pause' | 'continue_testing'
}

export interface ABTest {
  id: string
  name: string
  variants: ABTestVariant[]
  status: 'active' | 'completed' | 'paused'
  startDate: Date
  endDate?: Date
  trafficSplit: number[]    // e.g. [50, 50] for 2 variants
  minimumSampleSize: number
}

// ---------------------------------------------------------------------------
// Statistical Helper Functions
// ---------------------------------------------------------------------------

/**
 * Calculate Z-score for two-proportion z-test
 */
function calculateZScore(p1: number, n1: number, p2: number, n2: number): number {
  if (n1 === 0 || n2 === 0) return 0
  const pooled = (p1 * n1 + p2 * n2) / (n1 + n2)
  if (pooled === 0 || pooled === 1) return 0
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
  if (se === 0) return 0
  return Math.abs((p1 - p2) / se)
}

/**
 * Convert Z-score to confidence level percentage
 * Based on standard normal distribution approximation
 */
export function zScoreToConfidence(zScore: number): number {
  if (zScore >= 2.576) return 99
  if (zScore >= 1.960) return 95
  if (zScore >= 1.645) return 90
  if (zScore >= 1.282) return 80
  return Math.round(Math.min(zScore / 2.576 * 80, 79))
}

// ---------------------------------------------------------------------------
// A/B Test Analysis
// ---------------------------------------------------------------------------

/**
 * Detect the winner of an A/B test
 * Returns results for all variants sorted by performance
 */
export function detectABTestWinner(test: ABTest): ABTestResult[] {
  const { variants } = test

  if (variants.length < 2) {
    return variants.map((v) => ({
      variantId: v.id,
      ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
      conversionRate: v.clicks > 0 ? (v.conversions / v.clicks) * 100 : 0,
      cpa: v.conversions > 0 ? v.spend / v.conversions : 0,
      isWinner: true,
      confidenceLevel: 0,
      recommendation: 'continue_testing',
    }))
  }

  // Calculate metrics per variant
  const metrics = variants.map((v) => ({
    variant: v,
    ctr: v.impressions > 0 ? v.clicks / v.impressions : 0,
    conversionRate: v.clicks > 0 ? v.conversions / v.clicks : 0,
    cpa: v.conversions > 0 ? v.spend / v.conversions : 0,
  }))

  // Find best performing variant by conversion rate (primary) then CTR
  const sorted = [...metrics].sort((a, b) => {
    if (a.conversionRate !== b.conversionRate) return b.conversionRate - a.conversionRate
    return b.ctr - a.ctr
  })

  const best = sorted[0]
  const secondBest = sorted[1]

  // Calculate statistical confidence between top 2
  const confidence = zScoreToConfidence(
    calculateZScore(
      best.conversionRate, best.variant.clicks,
      secondBest.conversionRate, secondBest.variant.clicks,
    )
  )

  return metrics.map(({ variant, ctr, conversionRate, cpa }) => {
    const isWinner = variant.id === best.variant.id
    const hasMinSamples = variant.impressions >= test.minimumSampleSize

    let recommendation: ABTestResult['recommendation'] = 'continue_testing'
    if (isWinner && confidence >= 95 && hasMinSamples) {
      recommendation = 'scale'
    } else if (!isWinner && confidence >= 95 && hasMinSamples) {
      recommendation = 'pause'
    }

    return {
      variantId: variant.id,
      ctr: Math.round(ctr * 10000) / 100,
      conversionRate: Math.round(conversionRate * 10000) / 100,
      cpa: Math.round(cpa * 100) / 100,
      isWinner,
      confidenceLevel: isWinner ? confidence : 100 - confidence,
      recommendation,
    }
  })
}

/**
 * Check if an A/B test has reached statistical significance
 */
export function isTestStatisticallySignificant(test: ABTest, threshold = 95): boolean {
  const results = detectABTestWinner(test)
  const winner = results.find((r) => r.isWinner)
  return (winner?.confidenceLevel ?? 0) >= threshold
}

/**
 * Get the winning variant ID, or null if test is not significant
 */
export function getWinningVariant(test: ABTest): string | null {
  if (!isTestStatisticallySignificant(test)) return null
  const results = detectABTestWinner(test)
  return results.find((r) => r.isWinner)?.variantId ?? null
}
