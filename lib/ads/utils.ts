/**
 * Ads Utilities — lib/ads/utils.ts
 *
 * Pure calculation helpers and winner-detection logic built on top of
 * metrics.ts and ab-testing.ts.  Importing everything from a single
 * place makes the test surface clear and import paths simple.
 */

// Re-export the core calculation primitives
export {
  calculateROAS,
  calculateCTR,
  calculateCPC,
  calculateCPA,
  calculateMetrics,
  generateOptimizationTips,
} from './metrics'

export type {
  CampaignMetricsInput,
  CalculatedMetrics,
  OptimizationTip,
} from './metrics'

// Re-export A/B testing utilities
export {
  zScoreToConfidence,
  detectABTestWinner,
  isTestStatisticallySignificant,
  getWinningVariant,
} from './ab-testing'

export type {
  ABTestVariant,
  ABTestResult,
  ABTest,
} from './ab-testing'

// ---------------------------------------------------------------------------
// Additional utilities — ROAS-based winner detection
// ---------------------------------------------------------------------------

export interface VariantROAS {
  id: string
  spend: number
  revenue: number
}

/**
 * Detect winning variant by ROAS across two or more variants.
 * A variant wins when its ROAS is more than 10% better than any other variant.
 * Returns null when no variant clears the 10% threshold or when there is no
 * spend data.
 */
export function detectWinnerByROAS(variants: VariantROAS[]): string | null {
  if (variants.length < 2) return null

  const withROAS = variants.map((v) => ({
    id: v.id,
    roas: v.spend > 0 ? v.revenue / v.spend : 0,
  }))

  withROAS.sort((a, b) => b.roas - a.roas)

  const best = withROAS[0]
  const secondBest = withROAS[1]

  // Require at least 10% advantage
  if (secondBest.roas === 0) {
    return best.roas > 0 ? best.id : null
  }

  const advantage = (best.roas - secondBest.roas) / secondBest.roas
  return advantage >= 0.1 ? best.id : null
}

/**
 * Detect winning variant by CPA (lower is better).
 * A variant wins when its CPA is more than 10% better than the next best.
 * Returns null when no variant has conversions or no clear winner emerges.
 */
export interface VariantCPA {
  id: string
  spend: number
  conversions: number
}

export function detectWinnerByCPA(variants: VariantCPA[]): string | null {
  if (variants.length < 2) return null

  const withCPA = variants
    .filter((v) => v.conversions > 0)
    .map((v) => ({ id: v.id, cpa: v.spend / v.conversions }))

  if (withCPA.length === 0) return null

  withCPA.sort((a, b) => a.cpa - b.cpa) // ascending — lower CPA wins

  const best = withCPA[0]
  if (withCPA.length < 2) return best.id

  const secondBest = withCPA[1]
  const advantage = (secondBest.cpa - best.cpa) / secondBest.cpa
  return advantage >= 0.1 ? best.id : null
}
