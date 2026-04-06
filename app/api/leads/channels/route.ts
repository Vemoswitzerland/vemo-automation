/**
 * Channel Attribution API — /api/leads/channels
 *
 * GET — returns per-channel metrics (Lead-Count, Conversion-Rate, Avg-Deal-Value,
 *         Cost-per-Lead, ROI) + Top-3 Widget + Week-over-Week Trend.
 *
 * Falls back to rich mock data when DB is empty or unavailable.
 * Supports `dateRange` query param: 7d | 30d | all
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChannelMetrics {
  source: string
  label: string
  icon: string
  leadCount: number
  conversionRate: number      // %
  avgDealValue: number        // CHF
  costPerLead: number         // CHF (estimated from mock ad spend data)
  roi: number                 // % return on investment
  thisWeek: number            // leads this week
  lastWeek: number            // leads last week
  weeklyTrend: number         // % change
  utmExample: string          // example UTM source value
}

export interface ChannelsData {
  channels: ChannelMetrics[]
  top3: ChannelMetrics[]
  totalLeads: number
  isMock: boolean
}

// ─── Channel Config ────────────────────────────────────────────────────────────

const CHANNEL_CONFIG: Record<string, {
  label: string
  icon: string
  utmExample: string
  mockCostPerLead: number    // CHF
  mockAdSpend: number        // CHF/Monat
}> = {
  google_ads: {
    label: 'Google Ads',
    icon: '🔍',
    utmExample: 'utm_source=google&utm_medium=cpc',
    mockCostPerLead: 45,
    mockAdSpend: 1200,
  },
  instagram: {
    label: 'Instagram',
    icon: '📸',
    utmExample: 'utm_source=instagram&utm_medium=social',
    mockCostPerLead: 28,
    mockAdSpend: 800,
  },
  facebook: {
    label: 'Facebook',
    icon: '📘',
    utmExample: 'utm_source=facebook&utm_medium=social',
    mockCostPerLead: 32,
    mockAdSpend: 600,
  },
  referral: {
    label: 'Empfehlung',
    icon: '👥',
    utmExample: 'utm_source=referral',
    mockCostPerLead: 0,
    mockAdSpend: 0,
  },
  email: {
    label: 'E-Mail',
    icon: '📧',
    utmExample: 'utm_source=email&utm_medium=newsletter',
    mockCostPerLead: 8,
    mockAdSpend: 150,
  },
  event: {
    label: 'Event',
    icon: '🎪',
    utmExample: 'utm_source=event&utm_medium=offline',
    mockCostPerLead: 65,
    mockAdSpend: 2000,
  },
  direct: {
    label: 'Direkt',
    icon: '🌐',
    utmExample: '(kein UTM)',
    mockCostPerLead: 0,
    mockAdSpend: 0,
  },
  manual: {
    label: 'Manuell',
    icon: '✏️',
    utmExample: 'utm_source=manual',
    mockCostPerLead: 0,
    mockAdSpend: 0,
  },
  unknown: {
    label: 'Unbekannt',
    icon: '❓',
    utmExample: '(kein UTM)',
    mockCostPerLead: 0,
    mockAdSpend: 0,
  },
}

// ─── Mock Leads ───────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000)
}

const MOCK_LEADS = [
  // Google Ads – 6 leads, 2 converted
  { id: 'c-1',  source: 'google_ads', status: 'converted', value: 3200, createdAt: daysAgo(3)  },
  { id: 'c-2',  source: 'google_ads', status: 'qualified', value: 2800, createdAt: daysAgo(8)  },
  { id: 'c-3',  source: 'google_ads', status: 'converted', value: 3600, createdAt: daysAgo(12) },
  { id: 'c-4',  source: 'google_ads', status: 'new',       value: null, createdAt: daysAgo(2)  },
  { id: 'c-5',  source: 'google_ads', status: 'lost',      value: null, createdAt: daysAgo(20) },
  { id: 'c-6',  source: 'google_ads', status: 'contacted', value: 1800, createdAt: daysAgo(5)  },
  // Instagram – 8 leads, 2 converted
  { id: 'c-7',  source: 'instagram',  status: 'new',       value: null, createdAt: daysAgo(1)  },
  { id: 'c-8',  source: 'instagram',  status: 'converted', value: 2400, createdAt: daysAgo(9)  },
  { id: 'c-9',  source: 'instagram',  status: 'qualified', value: 1900, createdAt: daysAgo(4)  },
  { id: 'c-10', source: 'instagram',  status: 'new',       value: null, createdAt: daysAgo(6)  },
  { id: 'c-11', source: 'instagram',  status: 'contacted', value: null, createdAt: daysAgo(3)  },
  { id: 'c-12', source: 'instagram',  status: 'converted', value: 2100, createdAt: daysAgo(14) },
  { id: 'c-13', source: 'instagram',  status: 'lost',      value: null, createdAt: daysAgo(22) },
  { id: 'c-14', source: 'instagram',  status: 'new',       value: null, createdAt: daysAgo(1)  },
  // Referral – 4 leads, 3 converted (highest ROI)
  { id: 'c-15', source: 'referral',   status: 'converted', value: 4200, createdAt: daysAgo(7)  },
  { id: 'c-16', source: 'referral',   status: 'converted', value: 3800, createdAt: daysAgo(11) },
  { id: 'c-17', source: 'referral',   status: 'converted', value: 5100, createdAt: daysAgo(2)  },
  { id: 'c-18', source: 'referral',   status: 'qualified', value: 3200, createdAt: daysAgo(5)  },
  // Facebook – 5 leads, 1 converted
  { id: 'c-19', source: 'facebook',   status: 'new',       value: null, createdAt: daysAgo(3)  },
  { id: 'c-20', source: 'facebook',   status: 'converted', value: 2200, createdAt: daysAgo(16) },
  { id: 'c-21', source: 'facebook',   status: 'contacted', value: null, createdAt: daysAgo(6)  },
  { id: 'c-22', source: 'facebook',   status: 'qualified', value: 1700, createdAt: daysAgo(8)  },
  { id: 'c-23', source: 'facebook',   status: 'lost',      value: null, createdAt: daysAgo(25) },
  // Email – 3 leads, 2 converted
  { id: 'c-24', source: 'email',      status: 'converted', value: 1800, createdAt: daysAgo(4)  },
  { id: 'c-25', source: 'email',      status: 'converted', value: 2400, createdAt: daysAgo(10) },
  { id: 'c-26', source: 'email',      status: 'new',       value: null, createdAt: daysAgo(2)  },
  // Event – 2 leads, 1 converted
  { id: 'c-27', source: 'event',      status: 'converted', value: 6500, createdAt: daysAgo(18) },
  { id: 'c-28', source: 'event',      status: 'qualified', value: 4800, createdAt: daysAgo(9)  },
]

// ─── Computation ──────────────────────────────────────────────────────────────

function computeChannels(
  leads: Array<{ source: string; status: string; value: number | null; createdAt: Date | string }>,
  isMock: boolean,
): ChannelsData {
  const now = Date.now()
  const thisWeekCutoff = now - 7 * 86400000
  const lastWeekCutoff = now - 14 * 86400000

  // Group by source
  const bySource: Record<string, typeof leads> = {}
  for (const l of leads) {
    const src = l.source || 'unknown'
    if (!bySource[src]) bySource[src] = []
    bySource[src].push(l)
  }

  const channels: ChannelMetrics[] = Object.entries(bySource).map(([source, group]) => {
    const cfg = CHANNEL_CONFIG[source] ?? CHANNEL_CONFIG['unknown']

    const total = group.length
    const converted = group.filter((l) => l.status === 'converted')
    const conversionRate = total > 0 ? Math.round((converted.length / total) * 1000) / 10 : 0

    const valuedConverted = converted.filter((l) => l.value != null)
    const avgDealValue = valuedConverted.length > 0
      ? Math.round(valuedConverted.reduce((s, l) => s + (l.value ?? 0), 0) / valuedConverted.length)
      : 0

    const totalRevenue = converted.reduce((s, l) => s + (l.value ?? avgDealValue), 0)
    const costPerLead = isMock ? cfg.mockCostPerLead : 0
    const totalCost = costPerLead * total
    const roi = totalCost > 0 ? Math.round(((totalRevenue - totalCost) / totalCost) * 100) : 0

    const thisWeek = group.filter((l) => new Date(l.createdAt).getTime() >= thisWeekCutoff).length
    const lastWeek = group.filter((l) => {
      const t = new Date(l.createdAt).getTime()
      return t >= lastWeekCutoff && t < thisWeekCutoff
    }).length

    const weeklyTrend = lastWeek > 0
      ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
      : thisWeek > 0 ? 100 : 0

    return {
      source,
      label: cfg.label,
      icon: cfg.icon,
      leadCount: total,
      conversionRate,
      avgDealValue,
      costPerLead,
      roi,
      thisWeek,
      lastWeek,
      weeklyTrend,
      utmExample: cfg.utmExample,
    }
  })

  // Sort by lead count descending
  channels.sort((a, b) => b.leadCount - a.leadCount)

  // Top-3 by ROI (then by conversion rate as tiebreaker)
  const ranked = [...channels].sort((a, b) => {
    if (b.roi !== a.roi) return b.roi - a.roi
    return b.conversionRate - a.conversionRate
  })
  const top3 = ranked.slice(0, 3)

  return {
    channels,
    top3,
    totalLeads: leads.length,
    isMock,
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const { searchParams } = new URL(request.url)
  const dateRange = searchParams.get('dateRange') ?? '30d'

  const now = new Date()
  let cutoff: Date | null = null
  if (dateRange === '7d') cutoff = new Date(now.getTime() - 7 * 86400000)
  else if (dateRange === '30d') cutoff = new Date(now.getTime() - 30 * 86400000)

  try {
    const where: Record<string, unknown> = { userId }
    if (cutoff) where.createdAt = { gte: cutoff }
    const dbLeads = await prisma.lead.findMany({ where })

    if (dbLeads.length > 0) {
      const shaped = dbLeads.map((l) => ({
        source: l.source,
        status: l.status,
        value: l.value,
        createdAt: l.createdAt,
      }))
      return NextResponse.json(computeChannels(shaped, false))
    }
  } catch (err) {
    console.error('[channels] DB error, falling back to mock:', err)
  }

  // Mock fallback
  let mockFiltered = MOCK_LEADS
  if (cutoff) {
    mockFiltered = MOCK_LEADS.filter((l) => l.createdAt.getTime() >= cutoff!.getTime())
  }

  return NextResponse.json(
    computeChannels(
      mockFiltered.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
      true,
    ),
  )
}
