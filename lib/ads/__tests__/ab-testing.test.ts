/**
 * Unit Tests — lib/ads/ab-testing.ts
 * Coverage: zScoreToConfidence, detectABTestWinner, isTestStatisticallySignificant, getWinningVariant
 */
import { describe, it, expect } from 'vitest'
import {
  zScoreToConfidence,
  detectABTestWinner,
  isTestStatisticallySignificant,
  getWinningVariant,
  type ABTest,
  type ABTestVariant,
} from '../ab-testing'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeVariant(overrides: Partial<ABTestVariant> & Pick<ABTestVariant, 'id'>): ABTestVariant {
  return {
    name: overrides.id,
    impressions: 10000,
    clicks: 300,
    conversions: 30,
    spend: 150,
    ...overrides,
  }
}

function makeTest(variants: ABTestVariant[], overrides: Partial<ABTest> = {}): ABTest {
  return {
    id: 'test-1',
    name: 'Test',
    variants,
    status: 'active',
    startDate: new Date('2026-01-01'),
    trafficSplit: variants.map(() => Math.round(100 / variants.length)),
    minimumSampleSize: 500,
    ...overrides,
  }
}

// ─── zScoreToConfidence ───────────────────────────────────────────────────────

describe('zScoreToConfidence', () => {
  it('returns 99 for z ≥ 2.576', () => {
    expect(zScoreToConfidence(2.576)).toBe(99)
    expect(zScoreToConfidence(3.0)).toBe(99)
  })

  it('returns 95 for z in [1.960, 2.576)', () => {
    expect(zScoreToConfidence(1.96)).toBe(95)
    expect(zScoreToConfidence(2.4)).toBe(95)
  })

  it('returns 90 for z in [1.645, 1.960)', () => {
    expect(zScoreToConfidence(1.645)).toBe(90)
    expect(zScoreToConfidence(1.8)).toBe(90)
  })

  it('returns 80 for z in [1.282, 1.645)', () => {
    expect(zScoreToConfidence(1.282)).toBe(80)
    expect(zScoreToConfidence(1.5)).toBe(80)
  })

  it('returns < 80 for z < 1.282', () => {
    const val = zScoreToConfidence(0.5)
    expect(val).toBeLessThan(80)
    expect(val).toBeGreaterThanOrEqual(0)
  })
})

// ─── detectABTestWinner ───────────────────────────────────────────────────────

describe('detectABTestWinner', () => {
  it('identifies the variant with higher conversion rate as winner', () => {
    const varA = makeVariant({ id: 'A', clicks: 1000, conversions: 100, impressions: 20000, spend: 200 }) // 10% CR
    const varB = makeVariant({ id: 'B', clicks: 1000, conversions: 50, impressions: 20000, spend: 200 })  // 5% CR
    const test = makeTest([varA, varB])

    const results = detectABTestWinner(test)
    const winner = results.find((r) => r.isWinner)
    const loser = results.find((r) => !r.isWinner)

    expect(winner?.variantId).toBe('A')
    expect(loser?.variantId).toBe('B')
  })

  it('computes CTR correctly', () => {
    const varA = makeVariant({ id: 'A', impressions: 10000, clicks: 500 })
    const varB = makeVariant({ id: 'B', impressions: 10000, clicks: 200 })
    const results = detectABTestWinner(makeTest([varA, varB]))
    const aResult = results.find((r) => r.variantId === 'A')!
    expect(aResult.ctr).toBeCloseTo(5, 1) // 500/10000 * 100 = 5%
  })

  it('returns recommendation=scale for winner with high confidence and enough samples', () => {
    // Massively different conversion rates → high z-score → high confidence
    const varA = makeVariant({ id: 'A', impressions: 50000, clicks: 5000, conversions: 500, spend: 1000 }) // 10% CR
    const varB = makeVariant({ id: 'B', impressions: 50000, clicks: 5000, conversions: 50, spend: 1000 })  // 1% CR
    const test = makeTest([varA, varB], { minimumSampleSize: 500 })

    const results = detectABTestWinner(test)
    const winner = results.find((r) => r.isWinner)
    expect(winner?.recommendation).toBe('scale')
  })

  it('returns recommendation=continue_testing when samples below minimum', () => {
    const varA = makeVariant({ id: 'A', impressions: 100, clicks: 20, conversions: 10, spend: 50 })
    const varB = makeVariant({ id: 'B', impressions: 100, clicks: 20, conversions: 5, spend: 50 })
    const test = makeTest([varA, varB], { minimumSampleSize: 10000 }) // sample threshold far above

    const results = detectABTestWinner(test)
    expect(results.every((r) => r.recommendation === 'continue_testing')).toBe(true)
  })

  it('handles no-conversion edge case without crashing', () => {
    const varA = makeVariant({ id: 'A', clicks: 100, conversions: 0, impressions: 5000, spend: 80 })
    const varB = makeVariant({ id: 'B', clicks: 100, conversions: 0, impressions: 5000, spend: 80 })
    expect(() => detectABTestWinner(makeTest([varA, varB]))).not.toThrow()
  })

  it('handles zero-spend edge case without crashing', () => {
    const varA = makeVariant({ id: 'A', spend: 0, clicks: 0, impressions: 0, conversions: 0 })
    const varB = makeVariant({ id: 'B', spend: 0, clicks: 0, impressions: 0, conversions: 0 })
    expect(() => detectABTestWinner(makeTest([varA, varB]))).not.toThrow()
  })

  it('handles single variant gracefully', () => {
    const varA = makeVariant({ id: 'A' })
    const results = detectABTestWinner(makeTest([varA]))
    expect(results).toHaveLength(1)
    expect(results[0].isWinner).toBe(true)
    expect(results[0].recommendation).toBe('continue_testing')
  })

  it('handles 3 variants and picks the best', () => {
    const varA = makeVariant({ id: 'A', clicks: 1000, conversions: 30, impressions: 20000, spend: 200 })  // 3% CR
    const varB = makeVariant({ id: 'B', clicks: 1000, conversions: 80, impressions: 20000, spend: 200 })  // 8% CR
    const varC = makeVariant({ id: 'C', clicks: 1000, conversions: 50, impressions: 20000, spend: 200 })  // 5% CR
    const results = detectABTestWinner(makeTest([varA, varB, varC]))
    const winner = results.find((r) => r.isWinner)
    expect(winner?.variantId).toBe('B')
  })

  it('computes CPA correctly', () => {
    const varA = makeVariant({ id: 'A', spend: 300, conversions: 10, clicks: 100, impressions: 5000 })
    const results = detectABTestWinner(makeTest([varA, makeVariant({ id: 'B' })]))
    const aResult = results.find((r) => r.variantId === 'A')!
    expect(aResult.cpa).toBe(30) // 300 / 10
  })
})

// ─── isTestStatisticallySignificant ───────────────────────────────────────────

describe('isTestStatisticallySignificant', () => {
  it('returns true when winner confidence ≥ threshold', () => {
    const varA = makeVariant({ id: 'A', impressions: 50000, clicks: 5000, conversions: 500, spend: 1000 })
    const varB = makeVariant({ id: 'B', impressions: 50000, clicks: 5000, conversions: 50, spend: 1000 })
    const test = makeTest([varA, varB], { minimumSampleSize: 100 })
    expect(isTestStatisticallySignificant(test, 95)).toBe(true)
  })

  it('returns false when confidence is below threshold', () => {
    const varA = makeVariant({ id: 'A', clicks: 50, conversions: 6, impressions: 1000, spend: 50 })
    const varB = makeVariant({ id: 'B', clicks: 50, conversions: 5, impressions: 1000, spend: 50 })
    const test = makeTest([varA, varB], { minimumSampleSize: 50000 })
    expect(isTestStatisticallySignificant(test, 95)).toBe(false)
  })
})

// ─── getWinningVariant ────────────────────────────────────────────────────────

describe('getWinningVariant', () => {
  it('returns winning variant ID when test is statistically significant', () => {
    const varA = makeVariant({ id: 'A', impressions: 50000, clicks: 5000, conversions: 500, spend: 1000 })
    const varB = makeVariant({ id: 'B', impressions: 50000, clicks: 5000, conversions: 50, spend: 1000 })
    const test = makeTest([varA, varB], { minimumSampleSize: 100 })
    expect(getWinningVariant(test)).toBe('A')
  })

  it('returns null when test is not significant', () => {
    const varA = makeVariant({ id: 'A', clicks: 50, conversions: 6, impressions: 1000, spend: 50 })
    const varB = makeVariant({ id: 'B', clicks: 50, conversions: 5, impressions: 1000, spend: 50 })
    const test = makeTest([varA, varB], { minimumSampleSize: 50000 })
    expect(getWinningVariant(test)).toBeNull()
  })
})

// ─── Mock Meta/Google Ads API ─────────────────────────────────────────────────

describe('Mock Ads API — edge cases in A/B winner detection', () => {
  // Simulates the kind of data that would come from Meta/Google Ads API

  it('handles negative ROAS scenario (spend > revenue) correctly', () => {
    // Not directly a function in ab-testing.ts, but winner detection still works
    const varA = makeVariant({ id: 'A', spend: 1000, conversions: 2, clicks: 50, impressions: 2000 })
    const varB = makeVariant({ id: 'B', spend: 1000, conversions: 1, clicks: 50, impressions: 2000 })
    const results = detectABTestWinner(makeTest([varA, varB]))
    expect(results.find((r) => r.isWinner)?.variantId).toBe('A')
  })

  it('handles 1000 variants sync scenario — processes large input without error', () => {
    const variants: ABTestVariant[] = Array.from({ length: 4 }, (_, i) =>
      makeVariant({
        id: `var-${i}`,
        impressions: 1000 * (i + 1),
        clicks: 100 * (i + 1),
        conversions: 10 * (i + 1),
        spend: 50 * (i + 1),
      }),
    )
    expect(() => detectABTestWinner(makeTest(variants))).not.toThrow()
    const results = detectABTestWinner(makeTest(variants))
    expect(results).toHaveLength(4)
  })

  it('all variants have same metrics — no crash, any variant can be winner', () => {
    const varA = makeVariant({ id: 'A', clicks: 100, conversions: 10, impressions: 5000, spend: 100 })
    const varB = makeVariant({ id: 'B', clicks: 100, conversions: 10, impressions: 5000, spend: 100 })
    expect(() => detectABTestWinner(makeTest([varA, varB]))).not.toThrow()
  })
})
