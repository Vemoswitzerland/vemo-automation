import { describe, it, expect, beforeEach } from 'vitest'
import {
  scoreLead,
  scoreSource,
  scoreStatus,
  scoreValue,
  scoreEngagement,
  scoreRecency,
  getScoreLabel,
  scoreLeadsBatch,
  type LeadScoreInput,
} from '../../lib/leads/scoring'

// ─── scoreSource ───────────────────────────────────────────────────────────────

describe('scoreSource', () => {
  it('gives highest score to referral', () => {
    expect(scoreSource('referral')).toBe(25)
  })

  it('gives correct score to google_ads', () => {
    expect(scoreSource('google_ads')).toBe(20)
  })

  it('gives correct score to instagram', () => {
    expect(scoreSource('instagram')).toBe(15)
  })

  it('gives correct score to facebook', () => {
    expect(scoreSource('facebook')).toBe(12)
  })

  it('gives lowest score to manual', () => {
    expect(scoreSource('manual')).toBe(8)
  })
})

// ─── scoreStatus ──────────────────────────────────────────────────────────────

describe('scoreStatus', () => {
  it('gives maximum score to converted leads', () => {
    expect(scoreStatus('converted')).toBe(35)
  })

  it('gives correct score to qualified', () => {
    expect(scoreStatus('qualified')).toBe(28)
  })

  it('gives correct score to contacted', () => {
    expect(scoreStatus('contacted')).toBe(18)
  })

  it('gives lowest active score to new', () => {
    expect(scoreStatus('new')).toBe(10)
  })

  it('gives zero score to lost leads', () => {
    expect(scoreStatus('lost')).toBe(0)
  })
})

// ─── scoreValue ───────────────────────────────────────────────────────────────

describe('scoreValue', () => {
  it('returns 0 for null value', () => {
    expect(scoreValue(null)).toBe(0)
  })

  it('returns 0 for zero value', () => {
    expect(scoreValue(0)).toBe(0)
  })

  it('returns 0 for negative value', () => {
    expect(scoreValue(-100)).toBe(0)
  })

  it('returns max 25 for value equal to scale (5000 CHF)', () => {
    expect(scoreValue(5000)).toBe(25)
  })

  it('returns max 25 for value above scale', () => {
    expect(scoreValue(10000)).toBe(25)
  })

  it('returns proportional score for 2500 CHF (half scale)', () => {
    expect(scoreValue(2500)).toBe(13)  // round(12.5) = 13
  })

  it('returns proportional score for 1000 CHF', () => {
    expect(scoreValue(1000)).toBe(5)
  })
})

// ─── scoreEngagement ──────────────────────────────────────────────────────────

describe('scoreEngagement', () => {
  it('returns 10 when both email and phone present', () => {
    expect(scoreEngagement(true, true)).toBe(10)
  })

  it('returns 6 when only email present', () => {
    expect(scoreEngagement(true, false)).toBe(6)
  })

  it('returns 6 when only phone present', () => {
    expect(scoreEngagement(false, true)).toBe(6)
  })

  it('returns 0 when neither email nor phone', () => {
    expect(scoreEngagement(false, false)).toBe(0)
  })
})

// ─── scoreRecency ─────────────────────────────────────────────────────────────

describe('scoreRecency', () => {
  it('returns max 5 for leads created just now', () => {
    const justNow = new Date()
    expect(scoreRecency(justNow)).toBe(5)
  })

  it('returns 5 for leads created 1 day ago', () => {
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    const score = scoreRecency(yesterday)
    expect(score).toBeGreaterThanOrEqual(4)
    expect(score).toBeLessThanOrEqual(5)
  })

  it('returns 0 for leads older than 30 days', () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    expect(scoreRecency(old)).toBe(0)
  })

  it('accepts ISO string dates', () => {
    const score = scoreRecency(new Date().toISOString())
    expect(score).toBe(5)
  })
})

// ─── scoreLead ────────────────────────────────────────────────────────────────

describe('scoreLead', () => {
  const baseInput: LeadScoreInput = {
    source: 'referral',
    status: 'converted',
    value: 5000,
    hasEmail: true,
    hasPhone: true,
    createdAt: new Date(),
    lastContact: new Date(),
  }

  it('returns a total score between 0 and 100', () => {
    const result = scoreLead(baseInput)
    expect(result.total).toBeGreaterThanOrEqual(0)
    expect(result.total).toBeLessThanOrEqual(100)
  })

  it('gives high score to ideal lead (referral + converted + high value + both contacts)', () => {
    const result = scoreLead(baseInput)
    expect(result.total).toBeGreaterThanOrEqual(90)
  })

  it('gives low score to lost manual lead with no value or contacts', () => {
    const result = scoreLead({
      source: 'manual',
      status: 'lost',
      value: null,
      hasEmail: false,
      hasPhone: false,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      lastContact: null,
    })
    expect(result.total).toBeLessThanOrEqual(15)
  })

  it('returns correct breakdown structure', () => {
    const result = scoreLead(baseInput)
    expect(result.breakdown).toHaveProperty('source')
    expect(result.breakdown).toHaveProperty('status')
    expect(result.breakdown).toHaveProperty('value')
    expect(result.breakdown).toHaveProperty('engagement')
    expect(result.breakdown).toHaveProperty('recency')
  })

  it('breakdown components sum to total', () => {
    const result = scoreLead(baseInput)
    const sumOfBreakdown = Object.values(result.breakdown).reduce((s, n) => s + n, 0)
    expect(result.total).toBe(Math.min(sumOfBreakdown, 100))
  })

  it('handles zero value correctly', () => {
    const result = scoreLead({ ...baseInput, value: 0 })
    expect(result.breakdown.value).toBe(0)
  })

  it('caps total at 100 even if all factors are maxed', () => {
    const result = scoreLead({ ...baseInput, value: 99999 })
    expect(result.total).toBeLessThanOrEqual(100)
  })

  it('new lead from google_ads with medium value gets medium score', () => {
    const result = scoreLead({
      source: 'google_ads',
      status: 'new',
      value: 490,
      hasEmail: true,
      hasPhone: false,
      createdAt: new Date(),
      lastContact: null,
    })
    // source(20) + status(10) + value(~2) + engagement(6) + recency(5) ≈ 43
    expect(result.total).toBeGreaterThanOrEqual(35)
    expect(result.total).toBeLessThanOrEqual(60)
  })
})

// ─── getScoreLabel ────────────────────────────────────────────────────────────

describe('getScoreLabel', () => {
  it('returns "high" for scores >= 70', () => {
    expect(getScoreLabel(70)).toBe('high')
    expect(getScoreLabel(95)).toBe('high')
    expect(getScoreLabel(100)).toBe('high')
  })

  it('returns "medium" for scores 40–69', () => {
    expect(getScoreLabel(40)).toBe('medium')
    expect(getScoreLabel(55)).toBe('medium')
    expect(getScoreLabel(69)).toBe('medium')
  })

  it('returns "low" for scores below 40', () => {
    expect(getScoreLabel(0)).toBe('low')
    expect(getScoreLabel(22)).toBe('low')
    expect(getScoreLabel(39)).toBe('low')
  })
})

// ─── scoreLeadsBatch ──────────────────────────────────────────────────────────

describe('scoreLeadsBatch', () => {
  const leads = [
    { id: 'a', source: 'referral' as const, status: 'converted' as const, value: 5000, hasEmail: true, hasPhone: true, createdAt: new Date(), lastContact: new Date() },
    { id: 'b', source: 'manual' as const,   status: 'lost' as const,      value: null, hasEmail: false, hasPhone: false, createdAt: new Date(Date.now() - 60 * 86400000), lastContact: null },
  ]

  it('returns one result per input lead', () => {
    const results = scoreLeadsBatch(leads)
    expect(results).toHaveLength(2)
  })

  it('preserves lead ids in results', () => {
    const results = scoreLeadsBatch(leads)
    expect(results[0].id).toBe('a')
    expect(results[1].id).toBe('b')
  })

  it('first lead scores higher than second lead', () => {
    const results = scoreLeadsBatch(leads)
    expect(results[0].score.total).toBeGreaterThan(results[1].score.total)
  })

  it('handles empty array', () => {
    expect(scoreLeadsBatch([])).toEqual([])
  })
})
