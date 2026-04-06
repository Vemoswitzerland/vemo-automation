/**
 * Unit Tests — lib/ads/utils.ts (via lib/ads/metrics.ts)
 * VEMA-273: Ads Module Tests
 *
 * Coverage:
 *  - calculateROAS  (revenue / spend)
 *  - calculateCTR   (clicks / impressions × 100)
 *  - generateOptimizationTips (priority thresholds)
 *  - detectWinnerByROAS / detectWinnerByCPA
 *  - Edge cases: zero spend, zero impressions, negative ROAS, no conversions
 */
import { describe, it, expect } from 'vitest'
import {
  calculateROAS,
  calculateCTR,
  calculateCPC,
  calculateCPA,
  calculateMetrics,
  generateOptimizationTips,
  detectWinnerByROAS,
  detectWinnerByCPA,
  type CampaignMetricsInput,
  type VariantROAS,
  type VariantCPA,
} from '../utils'

// ─── CTR Benchmark used in generateOptimizationTips ─────────────────────────
const BENCHMARK_CTR = 2.5

// ─── calculateROAS ───────────────────────────────────────────────────────────

describe('calculateROAS', () => {
  it('returns revenue / spend rounded to 2 decimals — normal case', () => {
    expect(calculateROAS(1000, 250)).toBe(4)
    expect(calculateROAS(1500, 400)).toBe(3.75)
    expect(calculateROAS(945, 210)).toBeCloseTo(4.5, 2)
  })

  it('returns 0 when spend is 0 (avoid division by zero)', () => {
    expect(calculateROAS(1000, 0)).toBe(0)
    expect(calculateROAS(0, 0)).toBe(0)
  })

  it('returns 0 when spend is negative', () => {
    expect(calculateROAS(500, -10)).toBe(0)
    expect(calculateROAS(0, -100)).toBe(0)
  })

  it('returns 0 when revenue is 0 (zero-revenue edge case)', () => {
    expect(calculateROAS(0, 200)).toBe(0)
  })

  it('handles sub-1 ROAS correctly (spend > revenue)', () => {
    // 100 revenue / 400 spend = 0.25
    expect(calculateROAS(100, 400)).toBe(0.25)
  })

  it('handles mock data values from MockAdsClient (roas=3.2)', () => {
    // MOCK: spend=312.50, revenue ~ 1000 → roas ~ 3.2
    expect(calculateROAS(1000, 312.5)).toBeCloseTo(3.2, 1)
  })

  it('handles high ROAS correctly', () => {
    expect(calculateROAS(10000, 100)).toBe(100)
  })
})

// ─── calculateCTR ────────────────────────────────────────────────────────────

describe('calculateCTR', () => {
  it('returns (clicks / impressions) × 100 rounded to 2 decimals — normal case', () => {
    expect(calculateCTR(250, 10000)).toBe(2.5)
    expect(calculateCTR(342, 12480)).toBeCloseTo(2.74, 1) // mock data value
  })

  it('returns 0 when impressions is 0', () => {
    expect(calculateCTR(100, 0)).toBe(0)
    expect(calculateCTR(0, 0)).toBe(0)
  })

  it('returns 0 when impressions is negative', () => {
    expect(calculateCTR(5, -1)).toBe(0)
  })

  it('returns 0 when clicks are 0', () => {
    expect(calculateCTR(0, 5000)).toBe(0)
  })

  it('returns 100 when all impressions convert to clicks', () => {
    expect(calculateCTR(1000, 1000)).toBe(100)
  })

  it('high CTR scenario: 10% is valid', () => {
    expect(calculateCTR(1000, 10000)).toBe(10)
  })

  it('compares CTR against benchmark correctly', () => {
    const ctr = calculateCTR(200, 10000) // 2%
    expect(ctr).toBeLessThan(BENCHMARK_CTR)

    const goodCtr = calculateCTR(500, 10000) // 5%
    expect(goodCtr).toBeGreaterThan(BENCHMARK_CTR)
  })
})

// ─── calculateCPC ────────────────────────────────────────────────────────────

describe('calculateCPC', () => {
  it('returns spend / clicks rounded to 2 decimals', () => {
    expect(calculateCPC(300, 100)).toBe(3)
    expect(calculateCPC(444, 342)).toBeCloseTo(1.3, 1) // ~mock CPC
  })

  it('returns 0 when clicks is 0', () => {
    expect(calculateCPC(200, 0)).toBe(0)
  })

  it('returns 0 when clicks is negative', () => {
    expect(calculateCPC(100, -5)).toBe(0)
  })
})

// ─── calculateCPA ────────────────────────────────────────────────────────────

describe('calculateCPA', () => {
  it('returns spend / conversions rounded to 2 decimals', () => {
    expect(calculateCPA(444.74, 18)).toBeCloseTo(24.71, 0) // ~mock CPA
    expect(calculateCPA(500, 10)).toBe(50)
  })

  it('returns 0 when conversions is 0 (zero-conversion edge case)', () => {
    expect(calculateCPA(300, 0)).toBe(0)
  })

  it('returns 0 when conversions is negative', () => {
    expect(calculateCPA(100, -2)).toBe(0)
  })
})

// ─── calculateMetrics (composite) ────────────────────────────────────────────

describe('calculateMetrics', () => {
  it('correctly calculates all metrics for a healthy campaign', () => {
    const input: CampaignMetricsInput = {
      spend: 400,
      revenue: 1600,
      clicks: 200,
      impressions: 10000,
      conversions: 20,
    }
    const m = calculateMetrics(input)
    expect(m.roas).toBe(4)
    expect(m.ctr).toBe(2)
    expect(m.cpc).toBe(2)
    expect(m.cpa).toBe(20)
    expect(m.conversionRate).toBe(10)
  })

  it('handles zero-spend edge case cleanly', () => {
    const input: CampaignMetricsInput = { spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 }
    const m = calculateMetrics(input)
    expect(m.roas).toBe(0)
    expect(m.ctr).toBe(0)
    expect(m.cpc).toBe(0)
    expect(m.cpa).toBe(0)
    expect(m.conversionRate).toBe(0)
  })

  it('handles no-conversion edge case', () => {
    const input: CampaignMetricsInput = { spend: 200, revenue: 0, clicks: 80, impressions: 4000, conversions: 0 }
    const m = calculateMetrics(input)
    expect(m.roas).toBe(0)
    expect(m.cpa).toBe(0)
    expect(m.conversionRate).toBe(0)
    expect(m.ctr).toBe(2)
  })

  it('handles negative ROAS scenario (revenue < spend)', () => {
    const input: CampaignMetricsInput = { spend: 500, revenue: 300, clicks: 50, impressions: 2000, conversions: 3 }
    const m = calculateMetrics(input)
    expect(m.roas).toBeLessThan(1)
    expect(m.roas).toBeGreaterThan(0)
  })
})

// ─── generateOptimizationTips ────────────────────────────────────────────────

describe('generateOptimizationTips', () => {
  it('returns high-priority budget_increase for excellent ROAS (≥ 6x)', () => {
    const input: CampaignMetricsInput = { spend: 200, revenue: 1600, clicks: 500, impressions: 10000, conversions: 40 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 200)
    const tip = tips.find((t) => t.type === 'budget_increase')
    expect(tip).toBeDefined()
    expect(tip?.priority).toBe('high')
  })

  it('returns high-priority creative_refresh when zero conversions', () => {
    const input: CampaignMetricsInput = { spend: 200, revenue: 0, clicks: 100, impressions: 5000, conversions: 0 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 200)
    const tip = tips.find((t) => t.type === 'creative_refresh')
    expect(tip).toBeDefined()
    expect(tip?.priority).toBe('high')
  })

  it('returns medium-priority budget_decrease for below-benchmark ROAS (1–3x)', () => {
    const input: CampaignMetricsInput = { spend: 200, revenue: 400, clicks: 80, impressions: 4000, conversions: 5 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 200)
    expect(tips.find((t) => t.type === 'budget_decrease')).toBeDefined()
  })

  it('returns high-priority pause_campaign when ROAS < 1 (negative ROI)', () => {
    const input: CampaignMetricsInput = { spend: 500, revenue: 300, clicks: 50, impressions: 2000, conversions: 3 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 500)
    const tip = tips.find((t) => t.type === 'pause_campaign')
    expect(tip).toBeDefined()
    expect(tip?.priority).toBe('high')
  })

  it('returns high-priority creative_refresh for very low CTR (< 1.25%)', () => {
    const input: CampaignMetricsInput = { spend: 300, revenue: 900, clicks: 10, impressions: 10000, conversions: 5 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 300)
    const tip = tips.find((t) => t.type === 'creative_refresh')
    expect(tip).toBeDefined()
  })

  it('returns medium-priority creative_refresh for CTR below benchmark (1.25–2.5%)', () => {
    const input: CampaignMetricsInput = { spend: 300, revenue: 1200, clicks: 150, impressions: 10000, conversions: 15 }
    const metrics = calculateMetrics(input)   // CTR=1.5%, ROAS=4
    const tips = generateOptimizationTips(metrics, input, 300)
    const tip = tips.find((t) => t.type === 'creative_refresh')
    expect(tip).toBeDefined()
    expect(tip?.priority).toBe('medium')
  })

  it('returns no pause/decrease tips for a perfect campaign', () => {
    const input: CampaignMetricsInput = { spend: 200, revenue: 1600, clicks: 500, impressions: 10000, conversions: 40 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 200)
    expect(tips.find((t) => t.type === 'pause_campaign')).toBeUndefined()
    expect(tips.find((t) => t.type === 'budget_decrease')).toBeUndefined()
  })

  it('returns budget_increase for zero-spend campaign', () => {
    const input: CampaignMetricsInput = { spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 }
    const metrics = calculateMetrics(input)
    const tips = generateOptimizationTips(metrics, input, 0)
    expect(tips.length).toBeGreaterThan(0)
    expect(tips[0].type).toBe('budget_increase')
    expect(tips[0].priority).toBe('high')
  })
})

// ─── detectWinnerByROAS ──────────────────────────────────────────────────────

describe('detectWinnerByROAS', () => {
  it('picks the variant with clearly higher ROAS (>10% advantage)', () => {
    const variants: VariantROAS[] = [
      { id: 'A', spend: 213, revenue: 1248 }, // ROAS ~5.86
      { id: 'B', spend: 210, revenue: 945 },  // ROAS ~4.5
    ]
    expect(detectWinnerByROAS(variants)).toBe('A')
  })

  it('returns null when no variant has >10% ROAS advantage (tie)', () => {
    const variants: VariantROAS[] = [
      { id: 'A', spend: 100, revenue: 400 }, // 4x
      { id: 'B', spend: 100, revenue: 410 }, // 4.1x — < 10% difference
    ]
    expect(detectWinnerByROAS(variants)).toBeNull()
  })

  it('returns null for a single variant', () => {
    expect(detectWinnerByROAS([{ id: 'A', spend: 100, revenue: 500 }])).toBeNull()
  })

  it('returns null when all variants have zero spend', () => {
    const variants: VariantROAS[] = [
      { id: 'A', spend: 0, revenue: 0 },
      { id: 'B', spend: 0, revenue: 0 },
    ]
    expect(detectWinnerByROAS(variants)).toBeNull()
  })

  it('returns the only variant with spend when the other has none', () => {
    const variants: VariantROAS[] = [
      { id: 'A', spend: 200, revenue: 1000 }, // ROAS 5
      { id: 'B', spend: 0, revenue: 0 },      // ROAS 0
    ]
    expect(detectWinnerByROAS(variants)).toBe('A')
  })

  it('handles three variants and picks the best', () => {
    const variants: VariantROAS[] = [
      { id: 'A', spend: 290, revenue: 1218 }, // ROAS ~4.2
      { id: 'B', spend: 288, revenue: 1624 }, // ROAS ~5.64
      { id: 'C', spend: 100, revenue: 250 },  // ROAS 2.5
    ]
    expect(detectWinnerByROAS(variants)).toBe('B')
  })
})

// ─── detectWinnerByCPA ───────────────────────────────────────────────────────

describe('detectWinnerByCPA', () => {
  it('picks the variant with clearly lower CPA (>10% advantage)', () => {
    const variants: VariantCPA[] = [
      { id: 'A', spend: 213, conversions: 39 }, // CPA ~5.46
      { id: 'B', spend: 210, conversions: 31 }, // CPA ~6.77
    ]
    expect(detectWinnerByCPA(variants)).toBe('A')
  })

  it('returns null when no variant has >10% CPA advantage', () => {
    const variants: VariantCPA[] = [
      { id: 'A', spend: 100, conversions: 10 }, // CPA 10
      { id: 'B', spend: 100, conversions: 10 }, // CPA 10 — tie
    ]
    expect(detectWinnerByCPA(variants)).toBeNull()
  })

  it('returns null when all variants have zero conversions', () => {
    const variants: VariantCPA[] = [
      { id: 'A', spend: 200, conversions: 0 },
      { id: 'B', spend: 200, conversions: 0 },
    ]
    expect(detectWinnerByCPA(variants)).toBeNull()
  })

  it('returns winner when only one variant has conversions', () => {
    const variants: VariantCPA[] = [
      { id: 'A', spend: 150, conversions: 10 },
      { id: 'B', spend: 150, conversions: 0 },
    ]
    expect(detectWinnerByCPA(variants)).toBe('A')
  })

  it('returns null for a single variant', () => {
    expect(detectWinnerByCPA([{ id: 'A', spend: 100, conversions: 5 }])).toBeNull()
  })
})
