import { describe, it, expect } from 'vitest'
import {
  detectABTestWinner,
  isTestStatisticallySignificant,
  getWinningVariant,
  zScoreToConfidence,
  type ABTest,
} from '../../lib/ads/ab-testing'

const makeTest = (overrides: Partial<ABTest> = {}): ABTest => ({
  id: 'test-1',
  name: 'Test Campaign A/B',
  status: 'active',
  startDate: new Date('2026-03-01'),
  trafficSplit: [50, 50],
  minimumSampleSize: 100,
  variants: [
    { id: 'variant-a', name: 'Variant A', impressions: 5000, clicks: 150, conversions: 30, spend: 200 },
    { id: 'variant-b', name: 'Variant B', impressions: 5000, clicks: 120, conversions: 15, spend: 200 },
  ],
  ...overrides,
})

describe('zScoreToConfidence', () => {
  it('returns 99 for very high z-score', () => {
    expect(zScoreToConfidence(3.0)).toBe(99)
  })

  it('returns 95 for z-score >= 1.96', () => {
    expect(zScoreToConfidence(2.0)).toBe(95)
  })

  it('returns 90 for z-score >= 1.645', () => {
    expect(zScoreToConfidence(1.7)).toBe(90)
  })

  it('returns low confidence for z-score near 0', () => {
    expect(zScoreToConfidence(0)).toBe(0)
  })
})

describe('detectABTestWinner', () => {
  it('identifies winner as variant with higher conversion rate', () => {
    const test = makeTest()
    const results = detectABTestWinner(test)
    const winner = results.find((r) => r.isWinner)
    expect(winner?.variantId).toBe('variant-a') // 30/150 = 20% vs 15/120 = 12.5%
  })

  it('returns results for all variants', () => {
    const test = makeTest()
    const results = detectABTestWinner(test)
    expect(results).toHaveLength(2)
  })

  it('calculates CTR correctly for each variant', () => {
    const test = makeTest()
    const results = detectABTestWinner(test)
    const varA = results.find((r) => r.variantId === 'variant-a')
    expect(varA?.ctr).toBe(3) // 150/5000 * 100 = 3%
  })

  it('handles single variant (edge case)', () => {
    const test = makeTest({
      variants: [
        { id: 'only-a', name: 'Only A', impressions: 1000, clicks: 50, conversions: 10, spend: 100 },
      ],
    })
    const results = detectABTestWinner(test)
    expect(results).toHaveLength(1)
    expect(results[0].isWinner).toBe(true)
  })

  it('handles variants with zero conversions (edge case)', () => {
    const test = makeTest({
      variants: [
        { id: 'variant-a', name: 'A', impressions: 1000, clicks: 50, conversions: 0, spend: 100 },
        { id: 'variant-b', name: 'B', impressions: 1000, clicks: 40, conversions: 0, spend: 100 },
      ],
    })
    const results = detectABTestWinner(test)
    expect(results).toHaveLength(2)
    // Winner determined by CTR when conversion rate is equal
    const winner = results.find((r) => r.isWinner)
    expect(winner?.variantId).toBe('variant-a') // higher CTR
  })

  it('recommends scale for winner with high confidence and enough samples', () => {
    // Create a test with a very clear winner to get high confidence
    const test = makeTest({
      minimumSampleSize: 100,
      variants: [
        { id: 'winner', name: 'Winner', impressions: 10000, clicks: 500, conversions: 100, spend: 500 },
        { id: 'loser', name: 'Loser', impressions: 10000, clicks: 500, conversions: 10, spend: 500 },
      ],
    })
    const results = detectABTestWinner(test)
    const winner = results.find((r) => r.variantId === 'winner')
    expect(winner?.recommendation).toBe('scale')
  })

  it('recommends pause for loser with high confidence', () => {
    const test = makeTest({
      minimumSampleSize: 100,
      variants: [
        { id: 'winner', name: 'Winner', impressions: 10000, clicks: 500, conversions: 100, spend: 500 },
        { id: 'loser', name: 'Loser', impressions: 10000, clicks: 500, conversions: 10, spend: 500 },
      ],
    })
    const results = detectABTestWinner(test)
    const loser = results.find((r) => r.variantId === 'loser')
    expect(loser?.recommendation).toBe('pause')
  })

  it('recommends continue_testing when not enough samples', () => {
    const test = makeTest({
      minimumSampleSize: 100000, // impossible to reach
      variants: [
        { id: 'variant-a', name: 'A', impressions: 5000, clicks: 150, conversions: 30, spend: 200 },
        { id: 'variant-b', name: 'B', impressions: 5000, clicks: 120, conversions: 15, spend: 200 },
      ],
    })
    const results = detectABTestWinner(test)
    results.forEach((r) => expect(r.recommendation).toBe('continue_testing'))
  })
})

describe('isTestStatisticallySignificant', () => {
  it('returns true for a clear winner with large samples', () => {
    const test = makeTest({
      variants: [
        { id: 'winner', name: 'Winner', impressions: 10000, clicks: 500, conversions: 100, spend: 500 },
        { id: 'loser', name: 'Loser', impressions: 10000, clicks: 500, conversions: 10, spend: 500 },
      ],
    })
    expect(isTestStatisticallySignificant(test)).toBe(true)
  })

  it('returns false for equal performing variants', () => {
    const test = makeTest({
      variants: [
        { id: 'a', name: 'A', impressions: 1000, clicks: 100, conversions: 10, spend: 100 },
        { id: 'b', name: 'B', impressions: 1000, clicks: 100, conversions: 10, spend: 100 },
      ],
    })
    expect(isTestStatisticallySignificant(test)).toBe(false)
  })
})

describe('getWinningVariant', () => {
  it('returns winner variant ID when test is significant', () => {
    const test = makeTest({
      variants: [
        { id: 'winner', name: 'Winner', impressions: 10000, clicks: 500, conversions: 100, spend: 500 },
        { id: 'loser', name: 'Loser', impressions: 10000, clicks: 500, conversions: 10, spend: 500 },
      ],
    })
    expect(getWinningVariant(test)).toBe('winner')
  })

  it('returns null when test is not statistically significant', () => {
    const test = makeTest({
      variants: [
        { id: 'a', name: 'A', impressions: 100, clicks: 10, conversions: 2, spend: 50 },
        { id: 'b', name: 'B', impressions: 100, clicks: 9, conversions: 2, spend: 50 },
      ],
    })
    expect(getWinningVariant(test)).toBeNull()
  })
})
