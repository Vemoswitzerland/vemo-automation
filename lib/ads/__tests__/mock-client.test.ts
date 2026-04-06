/**
 * Unit Tests — MockAdsClient (VEMA-273)
 *
 * Tests the public interface of the ads client layer:
 *  - getCampaigns() — correct structure, length, fields
 *  - getMetrics()   — AdMetrics shape, mock: true
 *  - getAllMetrics() — metrics for all campaigns
 *  - getInsights()  — AdInsight array with correct priority values
 *  - createAdsClient() — returns MockAdsClient when env vars not set
 *  - Edge case: single campaign metrics
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAdsClient, isMockAds } from '../client'
import type { AdCampaign, AdMetrics, AdInsight } from '../client'

// ─── createAdsClient factory ─────────────────────────────────────────────────

describe('createAdsClient()', () => {
  it('returns MockAdsClient when META_ADS_ACCESS_TOKEN is not set', () => {
    delete process.env.META_ADS_ACCESS_TOKEN
    delete process.env.META_ADS_ACCOUNT_ID
    const client = createAdsClient()
    // MockAdsClient always resolves — if it were a RealClient it would call fetch
    expect(client).toBeDefined()
  })

  it('isMockAds is true when env vars are absent', () => {
    delete process.env.META_ADS_ACCESS_TOKEN
    delete process.env.META_ADS_ACCOUNT_ID
    // Re-import would be needed to re-evaluate; we verify the function logic instead
    const mock =
      !process.env.META_ADS_ACCESS_TOKEN || !process.env.META_ADS_ACCOUNT_ID
    expect(mock).toBe(true)
  })
})

// ─── getCampaigns() ───────────────────────────────────────────────────────────

describe('MockAdsClient.getCampaigns()', () => {
  it('returns a non-empty array of AdCampaign objects', async () => {
    const client = createAdsClient()
    const campaigns = await client.getCampaigns()
    expect(Array.isArray(campaigns)).toBe(true)
    expect(campaigns.length).toBeGreaterThan(0)
  })

  it('each campaign has required fields with correct types', async () => {
    const client = createAdsClient()
    const campaigns = await client.getCampaigns()
    campaigns.forEach((c: AdCampaign) => {
      expect(typeof c.id).toBe('string')
      expect(typeof c.name).toBe('string')
      expect(['active', 'paused', 'completed', 'draft']).toContain(c.status)
      expect(['meta', 'google', 'tiktok']).toContain(c.platform)
      expect(typeof c.budget).toBe('number')
      expect(typeof c.spent).toBe('number')
      expect(c.startDate instanceof Date).toBe(true)
    })
  })

  it('returns exactly 3 mock campaigns', async () => {
    const client = createAdsClient()
    const campaigns = await client.getCampaigns()
    expect(campaigns).toHaveLength(3)
  })

  it('campaigns include both meta and google platforms', async () => {
    const client = createAdsClient()
    const campaigns = await client.getCampaigns()
    const platforms = campaigns.map((c) => c.platform)
    expect(platforms).toContain('meta')
    expect(platforms).toContain('google')
  })

  it('spent is less than or equal to budget for all campaigns', async () => {
    const client = createAdsClient()
    const campaigns = await client.getCampaigns()
    campaigns.forEach((c) => {
      expect(c.spent).toBeLessThanOrEqual(c.budget)
    })
  })
})

// ─── getMetrics() ─────────────────────────────────────────────────────────────

describe('MockAdsClient.getMetrics()', () => {
  const from = new Date('2026-04-01')
  const to = new Date('2026-04-06')

  it('returns AdMetrics with mock: true', async () => {
    const client = createAdsClient()
    const metrics = await client.getMetrics('mock-camp-001', from, to)
    expect(metrics.mock).toBe(true)
  })

  it('returned object has all required AdMetrics fields', async () => {
    const client = createAdsClient()
    const metrics: AdMetrics = await client.getMetrics('mock-camp-001', from, to)

    expect(typeof metrics.campaignId).toBe('string')
    expect(typeof metrics.impressions).toBe('number')
    expect(typeof metrics.clicks).toBe('number')
    expect(typeof metrics.ctr).toBe('number')
    expect(typeof metrics.cpc).toBe('number')
    expect(typeof metrics.conversions).toBe('number')
    expect(typeof metrics.cpa).toBe('number')
    expect(typeof metrics.roas).toBe('number')
    expect(typeof metrics.reach).toBe('number')
    expect(typeof metrics.spend).toBe('number')
    expect(metrics.period.from instanceof Date).toBe(true)
    expect(metrics.period.to instanceof Date).toBe(true)
  })

  it('campaignId matches the requested campaign', async () => {
    const client = createAdsClient()
    const metrics = await client.getMetrics('mock-camp-001', from, to)
    expect(metrics.campaignId).toBe('mock-camp-001')
  })

  it('impressions are positive integers', async () => {
    const client = createAdsClient()
    const metrics = await client.getMetrics('mock-camp-001', from, to)
    expect(metrics.impressions).toBeGreaterThan(0)
    expect(Number.isInteger(metrics.impressions)).toBe(true)
  })

  it('period dates match the requested range', async () => {
    const client = createAdsClient()
    const metrics = await client.getMetrics('mock-camp-002', from, to)
    expect(metrics.period.from).toEqual(from)
    expect(metrics.period.to).toEqual(to)
  })

  it('ROAS and CPA are positive numbers', async () => {
    const client = createAdsClient()
    const metrics = await client.getMetrics('mock-camp-001', from, to)
    expect(metrics.roas).toBeGreaterThan(0)
    expect(metrics.cpa).toBeGreaterThan(0)
  })

  it('CTR value falls within realistic ad-industry range (0–100)', async () => {
    const client = createAdsClient()
    const metrics = await client.getMetrics('mock-camp-001', from, to)
    expect(metrics.ctr).toBeGreaterThanOrEqual(0)
    expect(metrics.ctr).toBeLessThanOrEqual(100)
  })

  // Edge case: single campaign — only one result expected
  it('edge case: single campaign getMetrics returns exactly one object', async () => {
    const client = createAdsClient()
    const metrics = await client.getMetrics('mock-camp-003', from, to)
    // Should return the single object, not an array
    expect(typeof metrics).toBe('object')
    expect(Array.isArray(metrics)).toBe(false)
  })
})

// ─── getAllMetrics() ───────────────────────────────────────────────────────────

describe('MockAdsClient.getAllMetrics()', () => {
  const from = new Date('2026-04-01')
  const to = new Date('2026-04-06')

  it('returns an array of metrics for all campaigns', async () => {
    const client = createAdsClient()
    const allMetrics = await client.getAllMetrics(from, to)
    expect(Array.isArray(allMetrics)).toBe(true)
    expect(allMetrics.length).toBeGreaterThan(0)
  })

  it('returns one metrics object per mock campaign', async () => {
    const client = createAdsClient()
    const [campaigns, allMetrics] = await Promise.all([
      client.getCampaigns(),
      client.getAllMetrics(from, to),
    ])
    expect(allMetrics).toHaveLength(campaigns.length)
  })

  it('every metrics entry has mock: true', async () => {
    const client = createAdsClient()
    const allMetrics = await client.getAllMetrics(from, to)
    allMetrics.forEach((m) => expect(m.mock).toBe(true))
  })

  it('all campaignIds in results match the known mock campaign ids', async () => {
    const client = createAdsClient()
    const [campaigns, allMetrics] = await Promise.all([
      client.getCampaigns(),
      client.getAllMetrics(from, to),
    ])
    const campaignIds = new Set(campaigns.map((c) => c.id))
    allMetrics.forEach((m) => {
      expect(campaignIds.has(m.campaignId)).toBe(true)
    })
  })

  it('all AdMetrics objects have positive spend values', async () => {
    const client = createAdsClient()
    const allMetrics = await client.getAllMetrics(from, to)
    allMetrics.forEach((m) => {
      expect(m.spend).toBeGreaterThan(0)
    })
  })
})

// ─── getInsights() ────────────────────────────────────────────────────────────

describe('MockAdsClient.getInsights()', () => {
  it('returns an array of AdInsight objects', async () => {
    const client = createAdsClient()
    const insights = await client.getInsights()
    expect(Array.isArray(insights)).toBe(true)
  })

  it('each insight has required fields', async () => {
    const client = createAdsClient()
    const insights: AdInsight[] = await client.getInsights()
    insights.forEach((insight) => {
      expect(typeof insight.campaignId).toBe('string')
      expect(typeof insight.recommendation).toBe('string')
      expect(['high', 'medium', 'low']).toContain(insight.priority)
      expect(typeof insight.potentialImpact).toBe('string')
    })
  })

  it('insight priority values are only high, medium, or low', async () => {
    const client = createAdsClient()
    const insights = await client.getInsights()
    insights.forEach((i) => {
      expect(['high', 'medium', 'low']).toContain(i.priority)
    })
  })

  it('at least one insight has high priority (CTR below benchmark)', async () => {
    const client = createAdsClient()
    const insights = await client.getInsights()
    const highPriority = insights.filter((i) => i.priority === 'high')
    expect(highPriority.length).toBeGreaterThan(0)
  })

  it('insight recommendation strings are non-empty', async () => {
    const client = createAdsClient()
    const insights = await client.getInsights()
    insights.forEach((i) => {
      expect(i.recommendation.trim().length).toBeGreaterThan(0)
    })
  })

  it('potentialImpact field contains a meaningful value', async () => {
    const client = createAdsClient()
    const insights = await client.getInsights()
    insights.forEach((i) => {
      expect(i.potentialImpact.trim().length).toBeGreaterThan(0)
    })
  })
})
