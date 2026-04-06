/**
 * Unit Tests — lib/ads/metrics.ts
 * Coverage: ROAS, CTR, CPC, CPA, calculateMetrics, generateOptimizationTips
 */
import { describe, it, expect } from 'vitest'
import {
  calculateROAS,
  calculateCTR,
  calculateCPC,
  calculateCPA,
  calculateMetrics,
  generateOptimizationTips,
  type CampaignMetricsInput,
} from '../metrics'

// ─── calculateROAS ────────────────────────────────────────────────────────────

describe('calculateROAS', () => {
  it('returns revenue / spend rounded to 2 decimals', () => {
    expect(calculateROAS(1000, 250)).toBe(4)
    expect(calculateROAS(1500, 400)).toBe(3.75)
  })

  it('returns 0 when spend is 0 (no division by zero)', () => {
    expect(calculateROAS(1000, 0)).toBe(0)
  })

  it('returns 0 when spend is negative', () => {
    expect(calculateROAS(500, -10)).toBe(0)
  })

  it('returns 0 when both are 0', () => {
    expect(calculateROAS(0, 0)).toBe(0)
  })

  it('handles negative ROAS (spend > revenue)', () => {
    // revenue=100, spend=400 → 0.25 — still positive ratio but below 1
    expect(calculateROAS(100, 400)).toBe(0.25)
  })

  it('returns 0 when revenue is 0', () => {
    expect(calculateROAS(0, 200)).toBe(0)
  })
})

// ─── calculateCTR ─────────────────────────────────────────────────────────────

describe('calculateCTR', () => {
  it('returns (clicks / impressions) * 100 rounded to 2 decimals', () => {
    expect(calculateCTR(250, 10000)).toBe(2.5)
    expect(calculateCTR(1, 3)).toBeCloseTo(33.33, 1)
  })

  it('returns 0 when impressions is 0', () => {
    expect(calculateCTR(100, 0)).toBe(0)
  })

  it('returns 0 when impressions is negative', () => {
    expect(calculateCTR(5, -1)).toBe(0)
  })

  it('returns 0 when clicks are 0', () => {
    expect(calculateCTR(0, 5000)).toBe(0)
  })

  it('caps at 100% when all impressions are clicks', () => {
    expect(calculateCTR(1000, 1000)).toBe(100)
  })
})

// ─── calculateCPC ─────────────────────────────────────────────────────────────

describe('calculateCPC', () => {
  it('returns spend / clicks rounded to 2 decimals', () => {
    expect(calculateCPC(300, 100)).toBe(3)
    expect(calculateCPC(250, 75)).toBeCloseTo(3.33, 1)
  })

  it('returns 0 when clicks is 0', () => {
    expect(calculateCPC(200, 0)).toBe(0)
  })

  it('returns 0 when clicks is negative', () => {
    expect(calculateCPC(100, -5)).toBe(0)
  })
})

// ─── calculateCPA ─────────────────────────────────────────────────────────────

describe('calculateCPA', () => {
  it('returns spend / conversions rounded to 2 decimals', () => {
    expect(calculateCPA(500, 10)).toBe(50)
    expect(calculateCPA(123, 7)).toBeCloseTo(17.57, 1)
  })

  it('returns 0 when conversions is 0 (zero-conversion edge case)', () => {
    expect(calculateCPA(300, 0)).toBe(0)
  })

  it('returns 0 when conversions is negative', () => {
    expect(calculateCPA(100, -2)).toBe(0)
  })
})

// ─── calculateMetrics ─────────────────────────────────────────────────────────

describe('calculateMetrics', () => {
  it('calculates all metrics correctly for a healthy campaign', () => {
    const input: CampaignMetricsInput = {
      spend: 400,
      revenue: 1600,
      clicks: 200,
      impressions: 10000,
      conversions: 20,
    }
    const result = calculateMetrics(input)
    expect(result.roas).toBe(4)
    expect(result.ctr).toBe(2)
    expect(result.cpc).toBe(2)
    expect(result.cpa).toBe(20)
    expect(result.conversionRate).toBe(10)
  })

  it('handles zero spend (zero-spend edge case)', () => {
    const input: CampaignMetricsInput = { spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 }
    const result = calculateMetrics(input)
    expect(result.roas).toBe(0)
    expect(result.ctr).toBe(0)
    expect(result.cpc).toBe(0)
    expect(result.cpa).toBe(0)
    expect(result.conversionRate).toBe(0)
  })

  it('handles no conversions edge case', () => {
    const input: CampaignMetricsInput = {
      spend: 200,
      revenue: 0,
      clicks: 80,
      impressions: 4000,
      conversions: 0,
    }
    const result = calculateMetrics(input)
    expect(result.roas).toBe(0)
    expect(result.cpa).toBe(0)
    expect(result.conversionRate).toBe(0)
    expect(result.ctr).toBe(2)
  })
})

// ─── generateOptimizationTips ─────────────────────────────────────────────────

describe('generateOptimizationTips', () => {
  const goodMetrics = calculateMetrics({ spend: 400, revenue: 2400, clicks: 200, impressions: 8000, conversions: 24 })

  it('returns budget_increase tip for excellent ROAS (≥ 6x)', () => {
    const tips = generateOptimizationTips(goodMetrics, { spend: 400, revenue: 2400, clicks: 200, impressions: 8000, conversions: 24 }, 400)
    const budgetTip = tips.find((t) => t.type === 'budget_increase')
    expect(budgetTip).toBeDefined()
    expect(budgetTip?.priority).toBe('high')
  })

  it('returns creative_refresh tip when there are zero conversions', () => {
    const input: CampaignMetricsInput = { spend: 200, revenue: 0, clicks: 100, impressions: 5000, conversions: 0 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 200)
    const tip = tips.find((t) => t.type === 'creative_refresh')
    expect(tip).toBeDefined()
    expect(tip?.priority).toBe('high')
  })

  it('returns budget_increase tip for zero-spend campaigns', () => {
    const input: CampaignMetricsInput = { spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 0)
    expect(tips.length).toBeGreaterThan(0)
    expect(tips[0].type).toBe('budget_increase')
  })

  it('returns pause_campaign tip when ROAS < 1 (negative ROI)', () => {
    const input: CampaignMetricsInput = { spend: 500, revenue: 300, clicks: 50, impressions: 2000, conversions: 3 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 500)
    const pauseTip = tips.find((t) => t.type === 'pause_campaign')
    expect(pauseTip).toBeDefined()
    expect(pauseTip?.priority).toBe('high')
  })

  it('returns budget_decrease tip when ROAS is below benchmark (1.5–3)', () => {
    const input: CampaignMetricsInput = { spend: 200, revenue: 400, clicks: 80, impressions: 4000, conversions: 5 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 200)
    const tip = tips.find((t) => t.type === 'budget_decrease')
    expect(tip).toBeDefined()
  })

  it('returns creative_refresh tip for very low CTR', () => {
    const input: CampaignMetricsInput = { spend: 300, revenue: 900, clicks: 10, impressions: 10000, conversions: 5 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 300)
    const tip = tips.find((t) => t.type === 'creative_refresh')
    expect(tip).toBeDefined()
  })

  it('returns no tips for a perfect campaign (high ROAS + high CTR)', () => {
    // CTR = 5%, ROAS = 8 → only budget_increase tip expected
    const input: CampaignMetricsInput = { spend: 200, revenue: 1600, clicks: 500, impressions: 10000, conversions: 40 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 200)
    // No pause or budget_decrease tips
    expect(tips.find((t) => t.type === 'pause_campaign')).toBeUndefined()
    expect(tips.find((t) => t.type === 'budget_decrease')).toBeUndefined()
  })
})
