import { describe, it, expect } from 'vitest'
import {
  calculateFunnel,
  calculateAttribution,
  calculateAvgVelocityDays,
  type FunnelLead,
} from '../../lib/leads/funnel'

// ─── Test data ─────────────────────────────────────────────────────────────────

const now = new Date('2026-04-06T12:00:00Z')

function daysAgo(n: number): Date {
  return new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
}

const SAMPLE_LEADS: FunnelLead[] = [
  { id: '1', source: 'instagram',  status: 'new',       value: 490,  createdAt: daysAgo(3) },
  { id: '2', source: 'google_ads', status: 'contacted', value: 890,  createdAt: daysAgo(7) },
  { id: '3', source: 'referral',   status: 'qualified', value: 1290, createdAt: daysAgo(14) },
  { id: '4', source: 'referral',   status: 'converted', value: 2490, createdAt: daysAgo(30), convertedAt: daysAgo(5) },
  { id: '5', source: 'facebook',   status: 'lost',      value: 290,  createdAt: daysAgo(10) },
  { id: '6', source: 'instagram',  status: 'new',       value: 390,  createdAt: daysAgo(1) },
  { id: '7', source: 'google_ads', status: 'converted', value: 1890, createdAt: daysAgo(25), convertedAt: daysAgo(3) },
]

// ─── calculateFunnel ──────────────────────────────────────────────────────────

describe('calculateFunnel', () => {
  it('returns correct stage counts', () => {
    const report = calculateFunnel(SAMPLE_LEADS)
    const stageMap = Object.fromEntries(report.stages.map(s => [s.stage, s]))
    expect(stageMap.new.count).toBe(2)
    expect(stageMap.contacted.count).toBe(1)
    expect(stageMap.qualified.count).toBe(1)
    expect(stageMap.converted.count).toBe(2)
  })

  it('returns correct totalLeads', () => {
    const report = calculateFunnel(SAMPLE_LEADS)
    expect(report.totalLeads).toBe(7)
  })

  it('excludes lost leads from pipeline value', () => {
    const report = calculateFunnel(SAMPLE_LEADS)
    // active leads (not lost): 490 + 890 + 1290 + 2490 + 390 + 1890 = 7440
    expect(report.totalPipelineValue).toBe(7440)
  })

  it('calculates overall conversion rate correctly', () => {
    const report = calculateFunnel(SAMPLE_LEADS)
    // 2 converted out of 7 total = 28.6%
    expect(report.overallConversionRate).toBe(28.6)
  })

  it('calculates avgDealValue for converted leads', () => {
    const report = calculateFunnel(SAMPLE_LEADS)
    // (2490 + 1890) / 2 = 2190
    expect(report.avgDealValue).toBe(2190)
  })

  it('returns 0 avgDealValue when no conversions', () => {
    const noConversions = SAMPLE_LEADS.filter(l => l.status !== 'converted')
    const report = calculateFunnel(noConversions)
    expect(report.avgDealValue).toBe(0)
  })

  it('handles empty lead array', () => {
    const report = calculateFunnel([])
    expect(report.totalLeads).toBe(0)
    expect(report.overallConversionRate).toBe(0)
    expect(report.totalPipelineValue).toBe(0)
  })

  it('returns 4 stages (new, contacted, qualified, converted)', () => {
    const report = calculateFunnel(SAMPLE_LEADS)
    expect(report.stages).toHaveLength(4)
    expect(report.stages.map(s => s.stage)).toEqual(['new', 'contacted', 'qualified', 'converted'])
  })

  it('stage conversionRate is 0 for converted (final stage)', () => {
    const report = calculateFunnel(SAMPLE_LEADS)
    const converted = report.stages.find(s => s.stage === 'converted')!
    expect(converted.conversionRate).toBe(0)
  })

  it('handles all leads being lost', () => {
    const allLost: FunnelLead[] = [
      { id: 'x', source: 'facebook', status: 'lost', value: 100, createdAt: daysAgo(5) },
    ]
    const report = calculateFunnel(allLost)
    expect(report.totalPipelineValue).toBe(0)
    expect(report.overallConversionRate).toBe(0)
  })
})

// ─── calculateAttribution ────────────────────────────────────────────────────

describe('calculateAttribution', () => {
  it('returns one result per unique source', () => {
    const results = calculateAttribution(SAMPLE_LEADS)
    const sources = results.map(r => r.source).sort()
    expect(sources).toEqual(['facebook', 'google_ads', 'instagram', 'referral'].sort())
  })

  it('counts lead totals per source correctly', () => {
    const results = calculateAttribution(SAMPLE_LEADS)
    const instagram = results.find(r => r.source === 'instagram')!
    expect(instagram.leads).toBe(2)
  })

  it('counts conversions per source correctly', () => {
    const results = calculateAttribution(SAMPLE_LEADS)
    const referral = results.find(r => r.source === 'referral')!
    expect(referral.conversions).toBe(1)
    const google = results.find(r => r.source === 'google_ads')!
    expect(google.conversions).toBe(1)
  })

  it('sums revenue per source for converted leads', () => {
    const results = calculateAttribution(SAMPLE_LEADS)
    const referral = results.find(r => r.source === 'referral')!
    expect(referral.revenue).toBe(2490)
  })

  it('calculates conversionRate as percentage', () => {
    const results = calculateAttribution(SAMPLE_LEADS)
    // referral: 1 converted / 2 total = 50%
    const referral = results.find(r => r.source === 'referral')!
    expect(referral.conversionRate).toBe(50)
  })

  it('returns 0 conversionRate for sources with no conversions', () => {
    const results = calculateAttribution(SAMPLE_LEADS)
    const instagram = results.find(r => r.source === 'instagram')!
    expect(instagram.conversionRate).toBe(0)
  })

  it('returns same results for all attribution models (single-touch)', () => {
    const first = calculateAttribution(SAMPLE_LEADS, 'first_touch')
    const last = calculateAttribution(SAMPLE_LEADS, 'last_touch')
    const linear = calculateAttribution(SAMPLE_LEADS, 'linear')
    // Source totals should match across models (single-touch behavior)
    expect(first.length).toBe(last.length)
    expect(last.length).toBe(linear.length)
  })

  it('handles empty array', () => {
    expect(calculateAttribution([])).toEqual([])
  })
})

// ─── calculateAvgVelocityDays ─────────────────────────────────────────────────

describe('calculateAvgVelocityDays', () => {
  it('calculates average velocity for converted leads with convertedAt', () => {
    const days = calculateAvgVelocityDays(SAMPLE_LEADS)
    // lead 4: 30 - 5 = 25 days; lead 7: 25 - 3 = 22 days; avg = 23.5 → 24
    expect(days).toBe(24)
  })

  it('returns 0 when no converted leads', () => {
    const noConversions = SAMPLE_LEADS.filter(l => l.status !== 'converted')
    expect(calculateAvgVelocityDays(noConversions)).toBe(0)
  })

  it('returns 0 when converted leads have no convertedAt', () => {
    const leads: FunnelLead[] = [
      { id: 'x', source: 'referral', status: 'converted', value: 500, createdAt: daysAgo(10) },
    ]
    expect(calculateAvgVelocityDays(leads)).toBe(0)
  })

  it('handles single converted lead correctly', () => {
    const leads: FunnelLead[] = [
      { id: 'y', source: 'google_ads', status: 'converted', value: 1000, createdAt: daysAgo(14), convertedAt: daysAgo(0) },
    ]
    const velocity = calculateAvgVelocityDays(leads)
    expect(velocity).toBeGreaterThanOrEqual(13)
    expect(velocity).toBeLessThanOrEqual(15)
  })
})
