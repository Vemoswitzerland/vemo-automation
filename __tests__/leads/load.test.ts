/**
 * Load Test: Lead Scoring at Scale
 *
 * Tests that scoring 10,000 leads in parallel completes within acceptable time.
 */

import { describe, it, expect } from 'vitest'
import { scoreLead, scoreLeadsBatch, type LeadScoreInput } from '../../lib/leads/scoring'
import { calculateFunnel, calculateAttribution } from '../../lib/leads/funnel'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
type LeadSource = 'instagram' | 'facebook' | 'google_ads' | 'referral' | 'manual'

const STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost']
const SOURCES: LeadSource[] = ['instagram', 'facebook', 'google_ads', 'referral', 'manual']

function makeLead(i: number): LeadScoreInput & { id: string } {
  return {
    id: `lead-${i}`,
    source: SOURCES[i % SOURCES.length],
    status: STATUSES[i % STATUSES.length],
    value: (i % 20) * 100 + 100,
    hasEmail: i % 3 !== 0,
    hasPhone: i % 4 !== 0,
    createdAt: new Date(Date.now() - (i % 60) * 24 * 60 * 60 * 1000),
    lastContact: i % 2 === 0 ? new Date(Date.now() - (i % 7) * 24 * 60 * 60 * 1000) : null,
  }
}

// ─── Scoring Load Tests ────────────────────────────────────────────────────────

describe('Lead Scoring Load Test', () => {
  it('scores 1,000 leads without error', () => {
    const leads = Array.from({ length: 1000 }, (_, i) => makeLead(i))
    const results = leads.map(l => scoreLead(l))
    expect(results).toHaveLength(1000)
    results.forEach(r => {
      expect(r.total).toBeGreaterThanOrEqual(0)
      expect(r.total).toBeLessThanOrEqual(100)
    })
  })

  it('batch-scores 10,000 leads in under 2 seconds', () => {
    const leads = Array.from({ length: 10000 }, (_, i) => makeLead(i))
    const start = Date.now()
    const results = scoreLeadsBatch(leads)
    const elapsed = Date.now() - start

    expect(results).toHaveLength(10000)
    expect(elapsed).toBeLessThan(2000)
  })

  it('all 10,000 scored leads have valid scores', () => {
    const leads = Array.from({ length: 10000 }, (_, i) => makeLead(i))
    const results = scoreLeadsBatch(leads)

    const invalid = results.filter(r => r.score.total < 0 || r.score.total > 100)
    expect(invalid).toHaveLength(0)
  })

  it('score distribution includes all three bands (low/medium/high)', () => {
    const leads = Array.from({ length: 10000 }, (_, i) => makeLead(i))
    const results = scoreLeadsBatch(leads)

    const low    = results.filter(r => r.score.total < 40).length
    const medium = results.filter(r => r.score.total >= 40 && r.score.total < 70).length
    const high   = results.filter(r => r.score.total >= 70).length

    expect(low).toBeGreaterThan(0)
    expect(medium).toBeGreaterThan(0)
    expect(high).toBeGreaterThan(0)
  })

  it('same lead input always produces the same score (deterministic)', () => {
    const lead = makeLead(42)
    const score1 = scoreLead(lead)
    const score2 = scoreLead(lead)
    expect(score1.total).toBe(score2.total)
  })
})

// ─── Funnel Load Tests ────────────────────────────────────────────────────────

describe('Funnel Calculation Load Test', () => {
  type FunnelStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  const FUNNEL_STATUSES: FunnelStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost']
  type FunnelSource = 'instagram' | 'facebook' | 'google_ads' | 'referral' | 'manual'
  const FUNNEL_SOURCES: FunnelSource[] = ['instagram', 'facebook', 'google_ads', 'referral', 'manual']

  function makeFunnelLead(i: number) {
    const status = FUNNEL_STATUSES[i % FUNNEL_STATUSES.length]
    return {
      id: `fl-${i}`,
      source: FUNNEL_SOURCES[i % FUNNEL_SOURCES.length],
      status,
      value: (i % 50) * 50 + 100,
      createdAt: new Date(Date.now() - (i % 90) * 24 * 60 * 60 * 1000),
      convertedAt: status === 'converted'
        ? new Date(Date.now() - (i % 30) * 24 * 60 * 60 * 1000)
        : undefined,
    }
  }

  it('calculates funnel for 10,000 leads in under 1 second', () => {
    const leads = Array.from({ length: 10000 }, (_, i) => makeFunnelLead(i))
    const start = Date.now()
    const report = calculateFunnel(leads)
    const elapsed = Date.now() - start

    expect(report.totalLeads).toBe(10000)
    expect(elapsed).toBeLessThan(1000)
  })

  it('attribution calculation for 10,000 leads in under 500ms', () => {
    const leads = Array.from({ length: 10000 }, (_, i) => makeFunnelLead(i))
    const start = Date.now()
    const results = calculateAttribution(leads)
    const elapsed = Date.now() - start

    expect(results.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(500)
  })

  it('funnel stage counts sum to totalLeads', () => {
    const leads = Array.from({ length: 5000 }, (_, i) => makeFunnelLead(i))
    const report = calculateFunnel(leads)
    const stageTotal = report.stages.reduce((s, st) => s + st.count, 0)
    // stages exclude 'lost' — we subtract those
    const lostCount = leads.filter(l => l.status === 'lost').length
    expect(stageTotal + lostCount).toBe(5000)
  })
})
