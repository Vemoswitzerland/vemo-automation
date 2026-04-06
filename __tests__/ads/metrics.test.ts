import { describe, it, expect } from 'vitest'
import {
  calculateROAS,
  calculateCTR,
  calculateCPC,
  calculateCPA,
  calculateMetrics,
  generateOptimizationTips,
} from '../../lib/ads/metrics'

describe('calculateROAS', () => {
  it('calculates ROAS correctly', () => {
    expect(calculateROAS(1000, 200)).toBe(5)
    expect(calculateROAS(600, 200)).toBe(3)
  })

  it('returns 0 when spend is 0 (edge case: zero spend)', () => {
    expect(calculateROAS(1000, 0)).toBe(0)
  })

  it('returns 0 when spend is negative (edge case)', () => {
    expect(calculateROAS(1000, -50)).toBe(0)
  })

  it('returns 0 when revenue is 0 (no conversions)', () => {
    expect(calculateROAS(0, 200)).toBe(0)
  })

  it('handles negative ROAS (spending more than earning)', () => {
    // Revenue < spend = ROAS < 1 (not negative, just < 1)
    expect(calculateROAS(50, 200)).toBe(0.25)
  })

  it('rounds to 2 decimal places', () => {
    expect(calculateROAS(100, 30)).toBe(3.33)
  })
})

describe('calculateCTR', () => {
  it('calculates CTR correctly', () => {
    expect(calculateCTR(100, 10000)).toBe(1)
    expect(calculateCTR(250, 10000)).toBe(2.5)
  })

  it('returns 0 when impressions is 0 (edge case)', () => {
    expect(calculateCTR(100, 0)).toBe(0)
  })

  it('returns 0 when clicks is 0', () => {
    expect(calculateCTR(0, 10000)).toBe(0)
  })

  it('returns 100 when all impressions become clicks (edge case)', () => {
    expect(calculateCTR(1000, 1000)).toBe(100)
  })

  it('rounds to 2 decimal places', () => {
    expect(calculateCTR(1, 300)).toBe(0.33)
  })
})

describe('calculateCPC', () => {
  it('calculates CPC correctly', () => {
    expect(calculateCPC(200, 100)).toBe(2)
    expect(calculateCPC(300, 150)).toBe(2)
  })

  it('returns 0 when clicks is 0', () => {
    expect(calculateCPC(200, 0)).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    expect(calculateCPC(100, 30)).toBe(3.33)
  })
})

describe('calculateCPA', () => {
  it('calculates CPA correctly', () => {
    expect(calculateCPA(200, 10)).toBe(20)
    expect(calculateCPA(300, 15)).toBe(20)
  })

  it('returns 0 when conversions is 0 (edge case: no conversions)', () => {
    expect(calculateCPA(200, 0)).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    expect(calculateCPA(100, 30)).toBe(3.33)
  })
})

describe('calculateMetrics (combined)', () => {
  it('calculates all metrics from raw input', () => {
    const result = calculateMetrics({
      spend: 200,
      revenue: 800,
      clicks: 100,
      impressions: 10000,
      conversions: 10,
    })
    expect(result.roas).toBe(4)
    expect(result.ctr).toBe(1)
    expect(result.cpc).toBe(2)
    expect(result.cpa).toBe(20)
    expect(result.conversionRate).toBe(10)
  })

  it('handles all-zero input (complete edge case)', () => {
    const result = calculateMetrics({
      spend: 0,
      revenue: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
    })
    expect(result.roas).toBe(0)
    expect(result.ctr).toBe(0)
    expect(result.cpc).toBe(0)
    expect(result.cpa).toBe(0)
    expect(result.conversionRate).toBe(0)
  })
})

describe('generateOptimizationTips', () => {
  it('suggests budget increase for excellent ROAS', () => {
    const metrics = calculateMetrics({ spend: 100, revenue: 700, clicks: 100, impressions: 5000, conversions: 10 })
    const tips = generateOptimizationTips(metrics, { spend: 100, revenue: 700, clicks: 100, impressions: 5000, conversions: 10 }, 500)
    const budgetTip = tips.find((t) => t.type === 'budget_increase')
    expect(budgetTip).toBeDefined()
    expect(budgetTip?.priority).toBe('high')
  })

  it('suggests creative refresh for low CTR', () => {
    const metrics = calculateMetrics({ spend: 100, revenue: 200, clicks: 10, impressions: 10000, conversions: 2 })
    const tips = generateOptimizationTips(metrics, { spend: 100, revenue: 200, clicks: 10, impressions: 10000, conversions: 2 }, 200)
    const creativeTip = tips.find((t) => t.type === 'creative_refresh')
    expect(creativeTip).toBeDefined()
  })

  it('suggests pause for negative ROI (spend > revenue)', () => {
    const metrics = calculateMetrics({ spend: 500, revenue: 100, clicks: 100, impressions: 5000, conversions: 5 })
    const tips = generateOptimizationTips(metrics, { spend: 500, revenue: 100, clicks: 100, impressions: 5000, conversions: 5 }, 500)
    const pauseTip = tips.find((t) => t.type === 'pause_campaign')
    expect(pauseTip).toBeDefined()
    expect(pauseTip?.priority).toBe('high')
  })

  it('returns high-priority tip for zero spend (edge case)', () => {
    const metrics = calculateMetrics({ spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 })
    const tips = generateOptimizationTips(metrics, { spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 }, 200)
    expect(tips).toHaveLength(1)
    expect(tips[0].priority).toBe('high')
    expect(tips[0].type).toBe('budget_increase')
  })

  it('suggests creative refresh for no conversions with spend', () => {
    const metrics = calculateMetrics({ spend: 200, revenue: 0, clicks: 50, impressions: 5000, conversions: 0 })
    const tips = generateOptimizationTips(metrics, { spend: 200, revenue: 0, clicks: 50, impressions: 5000, conversions: 0 }, 300)
    const creativeTip = tips.find((t) => t.type === 'creative_refresh')
    expect(creativeTip).toBeDefined()
  })
})
