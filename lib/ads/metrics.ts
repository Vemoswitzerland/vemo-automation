/**
 * Ads Metrics Calculations — lib/ads/metrics.ts
 * Pure functions for ROAS, CTR, CPA, and optimization tip generation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CampaignMetricsInput {
  spend: number        // CHF
  revenue: number      // CHF
  clicks: number
  impressions: number
  conversions: number
}

export interface CalculatedMetrics {
  roas: number         // Return on Ad Spend (revenue / spend)
  ctr: number          // Click-Through Rate % (clicks / impressions * 100)
  cpc: number          // Cost Per Click (spend / clicks)
  cpa: number          // Cost Per Acquisition (spend / conversions)
  conversionRate: number // conversions / clicks * 100
}

export interface OptimizationTip {
  type: 'budget_increase' | 'budget_decrease' | 'creative_refresh' | 'pause_campaign' | 'scale_winner'
  priority: 'high' | 'medium' | 'low'
  message: string
  suggestedAction?: string
}

// ---------------------------------------------------------------------------
// Calculation Functions
// ---------------------------------------------------------------------------

/**
 * Calculate ROAS (Return on Ad Spend)
 * ROAS = Revenue / Spend
 * Returns 0 if spend is 0 to avoid division by zero
 */
export function calculateROAS(revenue: number, spend: number): number {
  if (spend <= 0) return 0
  return Math.round((revenue / spend) * 100) / 100
}

/**
 * Calculate CTR (Click-Through Rate) in percentage
 * CTR = (Clicks / Impressions) * 100
 * Returns 0 if impressions is 0
 */
export function calculateCTR(clicks: number, impressions: number): number {
  if (impressions <= 0) return 0
  return Math.round((clicks / impressions) * 10000) / 100
}

/**
 * Calculate CPC (Cost Per Click)
 * CPC = Spend / Clicks
 * Returns 0 if clicks is 0
 */
export function calculateCPC(spend: number, clicks: number): number {
  if (clicks <= 0) return 0
  return Math.round((spend / clicks) * 100) / 100
}

/**
 * Calculate CPA (Cost Per Acquisition)
 * CPA = Spend / Conversions
 * Returns 0 if conversions is 0
 */
export function calculateCPA(spend: number, conversions: number): number {
  if (conversions <= 0) return 0
  return Math.round((spend / conversions) * 100) / 100
}

/**
 * Calculate all metrics from raw campaign data
 */
export function calculateMetrics(input: CampaignMetricsInput): CalculatedMetrics {
  return {
    roas: calculateROAS(input.revenue, input.spend),
    ctr: calculateCTR(input.clicks, input.impressions),
    cpc: calculateCPC(input.spend, input.clicks),
    cpa: calculateCPA(input.spend, input.conversions),
    conversionRate: input.clicks > 0
      ? Math.round((input.conversions / input.clicks) * 10000) / 100
      : 0,
  }
}

// ---------------------------------------------------------------------------
// Optimization Tips
// ---------------------------------------------------------------------------

const BENCHMARK_CTR = 2.5     // % benchmark CTR
const BENCHMARK_ROAS = 3.0    // ROAS threshold: below = underperforming

/**
 * Generate optimization tips based on campaign metrics
 */
export function generateOptimizationTips(
  metrics: CalculatedMetrics,
  input: CampaignMetricsInput,
  budget: number,
): OptimizationTip[] {
  const tips: OptimizationTip[] = []

  // Zero spend edge case
  if (input.spend <= 0) {
    tips.push({
      type: 'budget_increase',
      priority: 'high',
      message: 'Keine Ausgaben registriert. Kampagne aktivieren oder Budget erhöhen.',
    })
    return tips
  }

  // ROAS analysis
  if (metrics.roas === 0 && input.conversions === 0) {
    tips.push({
      type: 'creative_refresh',
      priority: 'high',
      message: 'Keine Conversions. Creative und Landing Page überprüfen.',
      suggestedAction: 'A/B Test mit neuem Creative starten',
    })
  } else if (metrics.roas < BENCHMARK_ROAS && metrics.roas > 0) {
    tips.push({
      type: 'budget_decrease',
      priority: 'medium',
      message: `ROAS unter Benchmark (${metrics.roas}x < ${BENCHMARK_ROAS}x). Budget reduzieren oder Creative optimieren.`,
      suggestedAction: 'Budget um 20% reduzieren und Creative testen',
    })
  } else if (metrics.roas >= BENCHMARK_ROAS * 2) {
    tips.push({
      type: 'budget_increase',
      priority: 'high',
      message: `Exzellenter ROAS (${metrics.roas}x). Budget skalieren für mehr Reichweite.`,
      suggestedAction: `Budget von CHF ${budget} auf CHF ${Math.round(budget * 1.5)} erhöhen`,
    })
  }

  // CTR analysis
  if (metrics.ctr < BENCHMARK_CTR * 0.5) {
    tips.push({
      type: 'creative_refresh',
      priority: 'high',
      message: `CTR sehr niedrig (${metrics.ctr}%). Neue Creatives dringend notwendig.`,
      suggestedAction: 'Mindestens 3 neue Ad Varianten testen',
    })
  } else if (metrics.ctr < BENCHMARK_CTR) {
    tips.push({
      type: 'creative_refresh',
      priority: 'medium',
      message: `CTR unter Benchmark (${metrics.ctr}% < ${BENCHMARK_CTR}%). Creative optimieren.`,
      suggestedAction: 'A/B Test mit direkterem CTA starten',
    })
  }

  // Negative ROAS (spending more than earning)
  if (input.revenue > 0 && metrics.roas < 1) {
    tips.push({
      type: 'pause_campaign',
      priority: 'high',
      message: 'Negativer ROI: Ausgaben übersteigen Einnahmen. Kampagne pausieren.',
      suggestedAction: 'Kampagne sofort pausieren und Strategie überarbeiten',
    })
  }

  return tips
}
