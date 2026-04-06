/**
 * Load Tests — MockAdsClient parallel performance (VEMA-273)
 *
 * Verifies that the MockAdsClient handles high concurrency:
 *  - 1000 parallel getMetrics() requests all resolve
 *  - All 1000 resolve within 5 seconds
 *  - Every resolved object has the correct AdMetrics shape
 *  - No rejections under load
 */
import { describe, it, expect } from 'vitest'
import { createAdsClient } from '../client'
import type { AdMetrics } from '../client'

const CAMPAIGN_IDS = ['mock-camp-001', 'mock-camp-002', 'mock-camp-003']
const FROM = new Date('2026-04-01')
const TO = new Date('2026-04-06')

// ─── Load: 1000 parallel metrics requests ────────────────────────────────────

describe('Load test — 1000 parallel getMetrics() requests', () => {
  it(
    'all 1000 requests resolve without rejection',
    async () => {
      const client = createAdsClient()

      const requests = Array.from({ length: 1000 }, (_, i) => {
        const campaignId = CAMPAIGN_IDS[i % CAMPAIGN_IDS.length]
        return client.getMetrics(campaignId, FROM, TO)
      })

      // allSettled so we can inspect rejections separately
      const results = await Promise.allSettled(requests)

      const rejected = results.filter((r) => r.status === 'rejected')
      expect(rejected).toHaveLength(0)

      const fulfilled = results.filter((r) => r.status === 'fulfilled')
      expect(fulfilled).toHaveLength(1000)
    },
    10_000, // 10 s outer timeout — well above the 5 s assertion below
  )

  it(
    'all 1000 requests complete within 5 seconds',
    async () => {
      const client = createAdsClient()
      const start = Date.now()

      await Promise.all(
        Array.from({ length: 1000 }, (_, i) => {
          const campaignId = CAMPAIGN_IDS[i % CAMPAIGN_IDS.length]
          return client.getMetrics(campaignId, FROM, TO)
        }),
      )

      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(5000)
    },
    10_000,
  )

  it(
    'every resolved object has the correct AdMetrics shape',
    async () => {
      const client = createAdsClient()

      const allMetrics: AdMetrics[] = await Promise.all(
        Array.from({ length: 1000 }, (_, i) => {
          const campaignId = CAMPAIGN_IDS[i % CAMPAIGN_IDS.length]
          return client.getMetrics(campaignId, FROM, TO)
        }),
      )

      expect(allMetrics).toHaveLength(1000)

      allMetrics.forEach((m, idx) => {
        // Shape assertions
        expect(typeof m.campaignId, `campaignId at index ${idx}`).toBe('string')
        expect(typeof m.impressions, `impressions at index ${idx}`).toBe('number')
        expect(typeof m.clicks, `clicks at index ${idx}`).toBe('number')
        expect(typeof m.ctr, `ctr at index ${idx}`).toBe('number')
        expect(typeof m.cpc, `cpc at index ${idx}`).toBe('number')
        expect(typeof m.conversions, `conversions at index ${idx}`).toBe('number')
        expect(typeof m.cpa, `cpa at index ${idx}`).toBe('number')
        expect(typeof m.roas, `roas at index ${idx}`).toBe('number')
        expect(typeof m.reach, `reach at index ${idx}`).toBe('number')
        expect(typeof m.spend, `spend at index ${idx}`).toBe('number')
        expect(m.mock, `mock flag at index ${idx}`).toBe(true)
        expect(m.period.from instanceof Date, `period.from at index ${idx}`).toBe(true)
        expect(m.period.to instanceof Date, `period.to at index ${idx}`).toBe(true)

        // Value sanity
        expect(m.impressions).toBeGreaterThan(0)
        expect(m.clicks).toBeGreaterThan(0)
        expect(m.spend).toBeGreaterThan(0)
        expect(m.roas).toBeGreaterThan(0)
        expect(m.cpa).toBeGreaterThan(0)
        expect(m.campaignId).toMatch(/^mock-camp-00[123]$/)
      })
    },
    10_000,
  )
})

// ─── Load: 1000 parallel getAllMetrics() requests ────────────────────────────

describe('Load test — 500 parallel getAllMetrics() requests', () => {
  it(
    'all 500 getAllMetrics() calls resolve and return arrays',
    async () => {
      const client = createAdsClient()

      const allResults = await Promise.all(
        Array.from({ length: 500 }, () => client.getAllMetrics(FROM, TO)),
      )

      expect(allResults).toHaveLength(500)
      allResults.forEach((batch, batchIdx) => {
        expect(
          Array.isArray(batch),
          `batch at index ${batchIdx} should be array`,
        ).toBe(true)
        expect(batch.length).toBeGreaterThan(0)
        batch.forEach((m) => expect(m.mock).toBe(true))
      })
    },
    15_000,
  )
})

// ─── Load: concurrent getCampaigns() ─────────────────────────────────────────

describe('Load test — 200 parallel getCampaigns() requests', () => {
  it(
    'all 200 getCampaigns() calls return consistent campaign arrays',
    async () => {
      const client = createAdsClient()

      const allCampaigns = await Promise.all(
        Array.from({ length: 200 }, () => client.getCampaigns()),
      )

      expect(allCampaigns).toHaveLength(200)
      // Every response should return the same 3 mock campaigns
      allCampaigns.forEach((campaigns, idx) => {
        expect(campaigns, `campaigns at index ${idx}`).toHaveLength(3)
      })
    },
    10_000,
  )
})
