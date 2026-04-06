import { describe, it, expect } from 'vitest'
import { calculateMetrics } from '../../lib/ads/metrics'
import { detectABTestWinner, type ABTest } from '../../lib/ads/ab-testing'

describe('Load Tests', () => {
  it('processes 1000 metrics calculations in parallel without errors', async () => {
    const inputs = Array.from({ length: 1000 }, (_, i) => ({
      spend: 100 + i,
      revenue: 300 + i * 2,
      clicks: 50 + Math.floor(i / 10),
      impressions: 5000 + i * 10,
      conversions: 5 + Math.floor(i / 20),
    }))

    const start = Date.now()
    const results = await Promise.all(inputs.map((input) => Promise.resolve(calculateMetrics(input))))
    const duration = Date.now() - start

    expect(results).toHaveLength(1000)
    results.forEach((r) => {
      expect(r.roas).toBeGreaterThanOrEqual(0)
      expect(r.ctr).toBeGreaterThanOrEqual(0)
      expect(r.cpc).toBeGreaterThanOrEqual(0)
      expect(r.cpa).toBeGreaterThanOrEqual(0)
    })
    // Should complete in under 2 seconds
    expect(duration).toBeLessThan(2000)
  })

  it('processes 1000 A/B test winner detections in parallel', async () => {
    const tests: ABTest[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `test-${i}`,
      name: `Test ${i}`,
      status: 'active' as const,
      startDate: new Date(),
      trafficSplit: [50, 50],
      minimumSampleSize: 100,
      variants: [
        { id: `a-${i}`, name: 'A', impressions: 5000 + i, clicks: 150 + i, conversions: 30 + Math.floor(i / 10), spend: 200 },
        { id: `b-${i}`, name: 'B', impressions: 5000 + i, clicks: 120 + i, conversions: 15, spend: 200 },
      ],
    }))

    const start = Date.now()
    const results = await Promise.all(tests.map((t) => Promise.resolve(detectABTestWinner(t))))
    const duration = Date.now() - start

    expect(results).toHaveLength(1000)
    results.forEach((r) => {
      expect(r.length).toBeGreaterThanOrEqual(1)
      const winners = r.filter((v) => v.isWinner)
      expect(winners).toHaveLength(1)
    })
    // Should complete in under 3 seconds
    expect(duration).toBeLessThan(3000)
  })

  it('handles edge cases at scale (zero spend, zero impressions, zero conversions)', async () => {
    const edgeCases = [
      { spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 },
      { spend: 100, revenue: 0, clicks: 0, impressions: 10000, conversions: 0 },
      { spend: 0, revenue: 1000, clicks: 100, impressions: 5000, conversions: 50 },
      { spend: 100, revenue: 50, clicks: 50, impressions: 1000, conversions: 5 }, // negative ROI
    ]

    const repeated = Array.from({ length: 250 }, () => edgeCases).flat() // 1000 total

    const results = await Promise.all(repeated.map((input) => Promise.resolve(calculateMetrics(input))))

    expect(results).toHaveLength(1000)
    results.forEach((r) => {
      expect(Number.isFinite(r.roas)).toBe(true)
      expect(Number.isFinite(r.ctr)).toBe(true)
      expect(Number.isFinite(r.cpc)).toBe(true)
      expect(Number.isFinite(r.cpa)).toBe(true)
      expect(Number.isNaN(r.roas)).toBe(false)
      expect(Number.isNaN(r.ctr)).toBe(false)
    })
  })
})
