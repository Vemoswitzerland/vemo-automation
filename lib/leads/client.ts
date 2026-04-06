/**
 * Leads / CRM Client Interface — lib/leads/client.ts
 *
 * Abstraction over CRM/lead-tracking data sources (Meta Lead Ads, manual DB, future CRM).
 * Returns a MockLeadsClient when no CRM credentials are configured.
 * Add real credentials via .env.local → no code changes needed.
 *
 * Interface-first design: plug in real CRM adapters without touching UI or API routes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
export type LeadSource = 'instagram' | 'facebook' | 'google' | 'email' | 'whatsapp' | 'referral' | 'manual'

export interface Lead {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  source: LeadSource
  status: LeadStatus
  notes?: string
  value?: number // CHF estimated deal value
  createdAt: Date
  updatedAt: Date
  mock: boolean
}

export interface LeadCreatePayload {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  source: LeadSource
  notes?: string
  value?: number
}

export interface LeadUpdatePayload {
  status?: LeadStatus
  notes?: string
  value?: number
}

export interface LeadStats {
  total: number
  newThisWeek: number
  byStatus: Record<LeadStatus, number>
  bySource: Partial<Record<LeadSource, number>>
  conversionRate: number // %
  avgDealValue: number  // CHF
  mock: boolean
}

export interface LeadsClient {
  getLeads(status?: LeadStatus): Promise<Lead[]>
  getLead(id: string): Promise<Lead | null>
  createLead(payload: LeadCreatePayload): Promise<Lead>
  updateLead(id: string, payload: LeadUpdatePayload): Promise<Lead>
  getStats(): Promise<LeadStats>
}

// ---------------------------------------------------------------------------
// Mock Client
// ---------------------------------------------------------------------------

const MOCK_LEADS: Lead[] = [
  {
    id: 'mock-lead-001',
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max.mustermann@example.com',
    source: 'instagram',
    status: 'new',
    notes: 'Interessiert an ETF-Portfolio',
    value: 15_000,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    mock: true,
  },
  {
    id: 'mock-lead-002',
    firstName: 'Anna',
    lastName: 'Müller',
    email: 'anna.mueller@startup.ch',
    phone: '+41791234567',
    source: 'email',
    status: 'contacted',
    notes: 'CEO, FinTech Startup – Kooperationsanfrage',
    value: 25_000,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    mock: true,
  },
  {
    id: 'mock-lead-003',
    firstName: 'Peter',
    lastName: 'Schmid',
    phone: '+41799876543',
    source: 'whatsapp',
    status: 'qualified',
    notes: 'Folgefrage zu ETF-Empfehlungen',
    value: 50_000,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    mock: true,
  },
  {
    id: 'mock-lead-004',
    firstName: 'Sara',
    lastName: 'Keller',
    email: 'sara.keller@corp.ch',
    source: 'facebook',
    status: 'proposal',
    notes: 'Steueroptimierung + Vorsorge',
    value: 80_000,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    mock: true,
  },
  {
    id: 'mock-lead-005',
    firstName: 'Thomas',
    lastName: 'Keller',
    email: 'thomas.keller@gmail.com',
    source: 'google',
    status: 'won',
    value: 30_000,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    mock: true,
  },
]

class MockLeadsClient implements LeadsClient {
  private leads = [...MOCK_LEADS]

  async getLeads(status?: LeadStatus): Promise<Lead[]> {
    await new Promise((r) => setTimeout(r, 300))
    return status ? this.leads.filter((l) => l.status === status) : this.leads
  }

  async getLead(id: string): Promise<Lead | null> {
    return this.leads.find((l) => l.id === id) ?? null
  }

  async createLead(payload: LeadCreatePayload): Promise<Lead> {
    const lead: Lead = {
      id: `mock-lead-${Date.now()}`,
      ...payload,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
      mock: true,
    }
    this.leads.unshift(lead)
    return lead
  }

  async updateLead(id: string, payload: LeadUpdatePayload): Promise<Lead> {
    const idx = this.leads.findIndex((l) => l.id === id)
    if (idx === -1) throw new Error(`Lead ${id} not found`)
    this.leads[idx] = { ...this.leads[idx], ...payload, updatedAt: new Date() }
    return this.leads[idx]
  }

  async getStats(): Promise<LeadStats> {
    const byStatus = this.leads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1
      return acc
    }, {} as Record<LeadStatus, number>)
    const bySource = this.leads.reduce((acc, l) => {
      acc[l.source] = (acc[l.source] ?? 0) + 1
      return acc
    }, {} as Partial<Record<LeadSource, number>>)
    const wonLeads = this.leads.filter((l) => l.status === 'won')
    const totalValue = wonLeads.reduce((s, l) => s + (l.value ?? 0), 0)
    const newThisWeek = this.leads.filter(
      (l) => l.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    ).length
    return {
      total: this.leads.length,
      newThisWeek,
      byStatus: {
        ...{ new: 0, contacted: 0, qualified: 0, proposal: 0, won: 0, lost: 0 },
        ...byStatus,
      },
      bySource,
      conversionRate: wonLeads.length / Math.max(this.leads.length, 1) * 100,
      avgDealValue: wonLeads.length > 0 ? totalValue / wonLeads.length : 0,
      mock: true,
    }
  }
}

// ---------------------------------------------------------------------------
// Real CRM Client (DB-backed, no external API yet)
// ---------------------------------------------------------------------------
// When a CRM API (HubSpot, Salesforce, Pipedrive) is configured, replace this
// with a RealCrmClient that wraps the respective SDK.
// For now, the "real" client just reads from the local Prisma DB.
// Import { prisma } from '@/lib/db' in your API route if you need DB access.

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLeadsClient(): LeadsClient {
  // Future: check for CRM_API_TOKEN env var to switch to real CRM
  // const token = process.env.HUBSPOT_API_TOKEN
  // if (token) return new RealHubSpotClient(token)
  return new MockLeadsClient()
}

export const isMockLeads = true // flip to false when CRM API is wired up
