/**
 * Lead Funnel & Attribution — lib/leads/funnel.ts
 *
 * Calculates:
 *  - Funnel stage counts and conversion rates between stages
 *  - Attribution model: first-touch, last-touch, linear
 *  - Pipeline value by stage
 *  - Velocity: average days from new → converted
 */

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type LeadSource = 'instagram' | 'facebook' | 'google_ads' | 'referral' | 'manual'

export interface FunnelLead {
  id: string
  source: LeadSource
  status: LeadStatus
  value: number | null
  createdAt: Date | string
  convertedAt?: Date | string | null
}

export interface FunnelStageStats {
  stage: LeadStatus
  count: number
  totalValue: number
  conversionRate: number  // % converted to next stage (0 for converted/lost)
}

export interface FunnelReport {
  stages: FunnelStageStats[]
  totalLeads: number
  totalPipelineValue: number
  overallConversionRate: number  // new → converted
  avgDealValue: number
}

export interface AttributionResult {
  source: LeadSource
  leads: number
  conversions: number
  revenue: number
  conversionRate: number
}

// ─── Stage Order ───────────────────────────────────────────────────────────────

const STAGE_ORDER: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted']

// ─── Funnel Calculations ───────────────────────────────────────────────────────

export function calculateFunnel(leads: FunnelLead[]): FunnelReport {
  const activeLead = leads.filter(l => l.status !== 'lost')

  const stageCounts: Record<LeadStatus, { count: number; value: number }> = {
    new:       { count: 0, value: 0 },
    contacted: { count: 0, value: 0 },
    qualified: { count: 0, value: 0 },
    converted: { count: 0, value: 0 },
    lost:      { count: 0, value: 0 },
  }

  for (const lead of leads) {
    stageCounts[lead.status].count++
    stageCounts[lead.status].value += lead.value ?? 0
  }

  const stages: FunnelStageStats[] = STAGE_ORDER.map((stage, idx) => {
    const { count, value } = stageCounts[stage]
    const nextStage = STAGE_ORDER[idx + 1]
    const nextCount = nextStage ? stageCounts[nextStage].count : 0
    const totalAtOrAfter = STAGE_ORDER.slice(idx).reduce((s, st) => s + stageCounts[st].count, 0)
    const conversionRate = totalAtOrAfter > 0 ? (nextCount / totalAtOrAfter) * 100 : 0

    return {
      stage,
      count,
      totalValue: value,
      conversionRate: Number(conversionRate.toFixed(1)),
    }
  })

  const totalPipelineValue = activeLead.reduce((s, l) => s + (l.value ?? 0), 0)
  const convertedLeads = leads.filter(l => l.status === 'converted')
  const overallConversionRate = leads.length > 0
    ? (convertedLeads.length / leads.length) * 100
    : 0
  const avgDealValue = convertedLeads.length > 0
    ? convertedLeads.reduce((s, l) => s + (l.value ?? 0), 0) / convertedLeads.length
    : 0

  return {
    stages,
    totalLeads: leads.length,
    totalPipelineValue,
    overallConversionRate: Number(overallConversionRate.toFixed(1)),
    avgDealValue: Math.round(avgDealValue),
  }
}

// ─── Attribution Models ────────────────────────────────────────────────────────

export type AttributionModel = 'first_touch' | 'last_touch' | 'linear'

/**
 * For this implementation source is static per lead (single-touch), so all
 * three models return the same source attribution. This structure allows for
 * future multi-touch attribution when touchpoint history is available.
 */
export function calculateAttribution(
  leads: FunnelLead[],
  model: AttributionModel = 'first_touch',
): AttributionResult[] {
  const sourceMap: Record<string, { leads: number; conversions: number; revenue: number }> = {}

  for (const lead of leads) {
    if (!sourceMap[lead.source]) {
      sourceMap[lead.source] = { leads: 0, conversions: 0, revenue: 0 }
    }
    sourceMap[lead.source].leads++
    if (lead.status === 'converted') {
      sourceMap[lead.source].conversions++
      sourceMap[lead.source].revenue += lead.value ?? 0
    }
  }

  return Object.entries(sourceMap).map(([source, stats]) => ({
    source: source as LeadSource,
    leads: stats.leads,
    conversions: stats.conversions,
    revenue: stats.revenue,
    conversionRate: stats.leads > 0
      ? Number(((stats.conversions / stats.leads) * 100).toFixed(1))
      : 0,
  }))
}

// ─── Velocity ─────────────────────────────────────────────────────────────────

export function calculateAvgVelocityDays(leads: FunnelLead[]): number {
  const converted = leads.filter(l => l.status === 'converted' && l.convertedAt)
  if (converted.length === 0) return 0

  const totalDays = converted.reduce((sum, lead) => {
    const created = new Date(lead.createdAt).getTime()
    const converted = new Date(lead.convertedAt!).getTime()
    return sum + (converted - created) / (1000 * 60 * 60 * 24)
  }, 0)

  return Math.round(totalDays / converted.length)
}
