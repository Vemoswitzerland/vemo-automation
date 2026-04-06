/**
 * E2E Flow Test: Lead Lifecycle
 *
 * Tests the complete flow:
 *   new lead created → scored → appears in funnel → converts → appears in reports
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { scoreLead, getScoreLabel } from '../../lib/leads/scoring'
import { calculateFunnel, calculateAttribution } from '../../lib/leads/funnel'
import { createLeadsClient } from '../../lib/leads/client'

describe('Lead Lifecycle E2E', () => {
  let client: ReturnType<typeof createLeadsClient>

  beforeEach(() => {
    client = createLeadsClient()
  })

  it('Step 1: new lead can be created with required fields', async () => {
    const lead = await client.createLead({
      firstName: 'E2E',
      lastName: 'TestLead',
      email: 'e2e@test.ch',
      phone: '+41 79 000 00 00',
      source: 'google',
      notes: 'E2E test lead',
      value: 1200,
    })

    expect(lead.id).toBeDefined()
    expect(lead.status).toBe('new')
    expect(lead.firstName).toBe('E2E')
    expect(lead.mock).toBe(true)
  })

  it('Step 2: new lead receives a scoreable score', async () => {
    const lead = await client.createLead({
      firstName: 'Score',
      lastName: 'Test',
      email: 'score@test.ch',
      source: 'referral',
      value: 2000,
    })

    const score = scoreLead({
      source: 'referral',
      status: 'new',
      value: lead.value ?? 0,
      hasEmail: !!lead.email,
      hasPhone: !!lead.phone,
      createdAt: lead.createdAt,
      lastContact: null,
    })

    expect(score.total).toBeGreaterThan(0)
    expect(score.total).toBeLessThanOrEqual(100)
    expect(['high', 'medium', 'low']).toContain(getScoreLabel(score.total))
  })

  it('Step 3: new lead appears in mock lead list', async () => {
    const created = await client.createLead({
      firstName: 'Funnel',
      lastName: 'Lead',
      email: 'funnel@test.ch',
      source: 'instagram',
      value: 490,
    })

    const allLeads = await client.getLeads()
    const found = allLeads.find(l => l.id === created.id)
    expect(found).toBeDefined()
    expect(found?.status).toBe('new')
  })

  it('Step 4: lead status can be progressed through funnel stages', async () => {
    const lead = await client.createLead({
      firstName: 'Pipeline',
      lastName: 'Lead',
      email: 'pipeline@test.ch',
      source: 'google',
      value: 890,
    })

    // Qualify
    const qualified = await client.updateLead(lead.id, { status: 'qualified' })
    expect(qualified.status).toBe('qualified')

    // Win (convert)
    const won = await client.updateLead(lead.id, { status: 'won' })
    expect(won.status).toBe('won')
  })

  it('Step 5: converted lead score is highest for same lead', async () => {
    const createdAt = new Date()

    const scoreNew = scoreLead({ source: 'google', status: 'new', value: 1000, hasEmail: true, hasPhone: false, createdAt, lastContact: null })
    const scoreQualified = scoreLead({ source: 'google', status: 'qualified', value: 1000, hasEmail: true, hasPhone: false, createdAt, lastContact: null })
    const scoreConverted = scoreLead({ source: 'google', status: 'converted', value: 1000, hasEmail: true, hasPhone: false, createdAt, lastContact: null })

    expect(scoreConverted.total).toBeGreaterThan(scoreQualified.total)
    expect(scoreQualified.total).toBeGreaterThan(scoreNew.total)
  })

  it('Step 6: converted lead appears in funnel report with revenue', () => {
    const leads = [
      { id: 'e1', source: 'google_ads' as const, status: 'new' as const, value: 490, createdAt: new Date() },
      { id: 'e2', source: 'referral' as const, status: 'converted' as const, value: 2490, createdAt: new Date(Date.now() - 20 * 86400000), convertedAt: new Date() },
    ]

    const report = calculateFunnel(leads)
    expect(report.overallConversionRate).toBe(50)
    expect(report.avgDealValue).toBe(2490)

    const attribution = calculateAttribution(leads)
    const referral = attribution.find(a => a.source === 'referral')!
    expect(referral.conversions).toBe(1)
    expect(referral.revenue).toBe(2490)
  })

  it('Step 7: stats reflect total leads and conversion rate', async () => {
    const stats = await client.getStats()

    expect(stats.total).toBeGreaterThan(0)
    expect(stats.byStatus).toBeDefined()
    expect(stats.conversionRate).toBeGreaterThanOrEqual(0)
    expect(stats.conversionRate).toBeLessThanOrEqual(100)
    expect(stats.mock).toBe(true)
  })
})

// ─── Mock CRM Integration ─────────────────────────────────────────────────────

describe('Mock CRM API', () => {
  it('getLeads returns all leads when no status filter', async () => {
    const client = createLeadsClient()
    const leads = await client.getLeads()
    expect(leads.length).toBeGreaterThan(0)
  })

  it('getLeads filters by status correctly', async () => {
    const client = createLeadsClient()
    const qualified = await client.getLeads('qualified')
    expect(qualified.every(l => l.status === 'qualified')).toBe(true)
  })

  it('getLead returns null for unknown id', async () => {
    const client = createLeadsClient()
    const lead = await client.getLead('does-not-exist-id')
    expect(lead).toBeNull()
  })

  it('updateLead throws for non-existent lead', async () => {
    const client = createLeadsClient()
    await expect(client.updateLead('non-existent', { status: 'won' })).rejects.toThrow()
  })

  it('getStats returns all required fields', async () => {
    const client = createLeadsClient()
    const stats = await client.getStats()

    expect(stats).toHaveProperty('total')
    expect(stats).toHaveProperty('newThisWeek')
    expect(stats).toHaveProperty('byStatus')
    expect(stats).toHaveProperty('bySource')
    expect(stats).toHaveProperty('conversionRate')
    expect(stats).toHaveProperty('avgDealValue')
  })
})
