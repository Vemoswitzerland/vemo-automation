/**
 * Leads Funnel API — /api/leads/funnel
 *
 * GET — returns funnel stage data, month-over-month trend, drop-off reasons
 *
 * Funnel stages: new → contacted → qualified → proposal → converted / lost
 * Falls back to rich mock data when DB is empty or unavailable.
 * Supports `dateRange` query param: 7d | 30d | all
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FunnelStage {
  key: string
  label: string
  count: number
  conversionFromPrev: number | null // % of previous stage that reached this one
  dropRate: number | null // % that dropped off after this stage
  avgDaysInStage: number | null
  leads: Array<{ id: string; name: string; score: number; source: string }>
}

export interface FunnelTrend {
  thisMonth: { total: number; converted: number; conversionRate: number }
  lastMonth: { total: number; converted: number; conversionRate: number }
  change: number // percentage point diff
}

export interface DropoffReason {
  reason: string
  count: number
  percentage: number
}

export interface FunnelData {
  stages: FunnelStage[]
  trend: FunnelTrend
  dropoffReasons: DropoffReason[]
  isMock: boolean
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_LEADS_FULL = [
  // This month leads
  { id: 'f-1',  name: 'Anna Meier',     status: 'new',       source: 'instagram',  score: 62, createdAt: new Date(Date.now() - 2  * 86400000), daysInStage: 2  },
  { id: 'f-2',  name: 'Beat Müller',    status: 'contacted', source: 'facebook',   score: 55, createdAt: new Date(Date.now() - 5  * 86400000), daysInStage: 3  },
  { id: 'f-3',  name: 'Claudia Huber',  status: 'qualified', source: 'google_ads', score: 74, createdAt: new Date(Date.now() - 8  * 86400000), daysInStage: 4  },
  { id: 'f-4',  name: 'Daniel Schmid',  status: 'converted', source: 'referral',   score: 95, createdAt: new Date(Date.now() - 15 * 86400000), daysInStage: 2  },
  { id: 'f-5',  name: 'Eva Zimmermann', status: 'new',       source: 'instagram',  score: 32, createdAt: new Date(Date.now() - 1  * 86400000), daysInStage: 1  },
  { id: 'f-6',  name: 'Felix Baumann',  status: 'qualified', source: 'referral',   score: 88, createdAt: new Date(Date.now() - 10 * 86400000), daysInStage: 5  },
  { id: 'f-7',  name: 'Gabi Wolf',      status: 'lost',      source: 'google_ads', score: 18, createdAt: new Date(Date.now() - 20 * 86400000), daysInStage: 1  },
  { id: 'f-8',  name: 'Hans Keller',    status: 'contacted', source: 'facebook',   score: 56, createdAt: new Date(Date.now() - 6  * 86400000), daysInStage: 4  },
  { id: 'f-9',  name: 'Irene Braun',    status: 'new',       source: 'instagram',  score: 41, createdAt: new Date(Date.now() - 3  * 86400000), daysInStage: 3  },
  { id: 'f-10', name: 'Jonas Fischer',  status: 'converted', source: 'manual',     score: 90, createdAt: new Date(Date.now() - 12 * 86400000), daysInStage: 3  },
  { id: 'f-11', name: 'Karin Lüthi',    status: 'proposal',  source: 'instagram',  score: 81, createdAt: new Date(Date.now() - 9  * 86400000), daysInStage: 3  },
  { id: 'f-12', name: 'Lars Nussbaum',  status: 'proposal',  source: 'facebook',   score: 76, createdAt: new Date(Date.now() - 7  * 86400000), daysInStage: 2  },
  { id: 'f-13', name: 'Marie Egger',    status: 'qualified', source: 'google_ads', score: 69, createdAt: new Date(Date.now() - 11 * 86400000), daysInStage: 6  },
  { id: 'f-14', name: 'Nico Brunner',   status: 'contacted', source: 'referral',   score: 48, createdAt: new Date(Date.now() - 4  * 86400000), daysInStage: 4  },
  { id: 'f-15', name: 'Olivia Steiner', status: 'lost',      source: 'instagram',  score: 22, createdAt: new Date(Date.now() - 18 * 86400000), daysInStage: 1  },
  { id: 'f-16', name: 'Peter Gerber',   status: 'converted', source: 'facebook',   score: 93, createdAt: new Date(Date.now() - 22 * 86400000), daysInStage: 4  },
  { id: 'f-17', name: 'Quin Wenger',    status: 'new',       source: 'google_ads', score: 37, createdAt: new Date(Date.now() - 1  * 86400000), daysInStage: 1  },
  { id: 'f-18', name: 'Rita Aebischer', status: 'qualified', source: 'manual',     score: 72, createdAt: new Date(Date.now() - 13 * 86400000), daysInStage: 5  },
  { id: 'f-19', name: 'Samuel Burri',   status: 'proposal',  source: 'referral',   score: 84, createdAt: new Date(Date.now() - 16 * 86400000), daysInStage: 3  },
  { id: 'f-20', name: 'Tanja Hofer',    status: 'contacted', source: 'instagram',  score: 51, createdAt: new Date(Date.now() - 5  * 86400000), daysInStage: 5  },
]

const MOCK_DROPOFF_REASONS: DropoffReason[] = [
  { reason: 'Preis zu hoch', count: 8, percentage: 35 },
  { reason: 'Kein Bedarf im Moment', count: 5, percentage: 22 },
  { reason: 'Mitbewerber gewählt', count: 4, percentage: 17 },
  { reason: 'Keine Antwort mehr', count: 3, percentage: 13 },
  { reason: 'Anderes', count: 3, percentage: 13 },
]

// ─── Funnel Logic ─────────────────────────────────────────────────────────────

const FUNNEL_ORDER = ['new', 'contacted', 'qualified', 'proposal', 'converted']
const FUNNEL_LABELS: Record<string, string> = {
  new:       'Neuer Lead',
  contacted: 'Kontaktiert',
  qualified: 'Qualifiziert',
  proposal:  'Angebot',
  converted: 'Gewonnen',
}

function buildFunnelStages(
  leads: Array<{ id: string; name: string; status: string; source: string; score: number; daysInStage?: number }>,
): FunnelStage[] {
  const stages: FunnelStage[] = []

  // Count all non-lost leads for funnel (including converted)
  const totalEntered = leads.filter((l) => l.status !== 'lost').length || leads.length

  for (let i = 0; i < FUNNEL_ORDER.length; i++) {
    const key = FUNNEL_ORDER[i]
    // A lead "reached" a stage if it is at or past that stage
    const reached = leads.filter((l) => {
      if (l.status === 'lost') return false
      const idx = FUNNEL_ORDER.indexOf(l.status)
      return idx >= i
    })

    const inStage = leads.filter((l) => l.status === key)
    const prevCount = i === 0 ? totalEntered : stages[i - 1].count
    const conversionFromPrev = i === 0 ? null : prevCount > 0 ? Math.round((reached.length / prevCount) * 100) : 0

    // Average days in stage from mock daysInStage field
    const withDays = inStage.filter((l) => (l as typeof MOCK_LEADS_FULL[0]).daysInStage != null)
    const avgDays =
      withDays.length > 0
        ? Math.round(withDays.reduce((s, l) => s + ((l as typeof MOCK_LEADS_FULL[0]).daysInStage ?? 0), 0) / withDays.length * 10) / 10
        : null

    stages.push({
      key,
      label: FUNNEL_LABELS[key],
      count: reached.length,
      conversionFromPrev,
      dropRate: null, // filled after all stages computed
      avgDaysInStage: avgDays,
      leads: inStage.map((l) => ({ id: l.id, name: l.name, score: l.score, source: l.source })),
    })
  }

  // Fill drop rates
  for (let i = 0; i < stages.length - 1; i++) {
    const curr = stages[i].count
    const next = stages[i + 1].count
    stages[i].dropRate = curr > 0 ? Math.round(((curr - next) / curr) * 100) : 0
  }
  stages[stages.length - 1].dropRate = null

  return stages
}

function buildTrend(
  leads: Array<{ status: string; createdAt: Date | string }>,
): FunnelTrend {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const thisMonth = leads.filter((l) => new Date(l.createdAt) >= thisMonthStart)
  const lastMonth = leads.filter((l) => {
    const d = new Date(l.createdAt)
    return d >= lastMonthStart && d < thisMonthStart
  })

  function stats(group: typeof leads) {
    const total = group.length
    const converted = group.filter((l) => l.status === 'converted').length
    return { total, converted, conversionRate: total > 0 ? Math.round((converted / total) * 100 * 10) / 10 : 0 }
  }

  const tm = stats(thisMonth)
  const lm = stats(lastMonth)

  return {
    thisMonth: tm,
    lastMonth: lm,
    change: Math.round((tm.conversionRate - lm.conversionRate) * 10) / 10,
  }
}

// ─── GET ─────────────────────────────────────────────────────────────────────

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
      const statusScoreMap: Record<string, number> = { new: 20, contacted: 45, qualified: 65, proposal: 80, converted: 95, lost: 10 }
      const shaped = dbLeads.map((l) => ({
        id: l.id,
        name: l.name,
        status: l.status,
        source: l.source,
        score: statusScoreMap[l.status] ?? 50,
        createdAt: l.createdAt,
      }))

      return NextResponse.json({
        stages: buildFunnelStages(shaped),
        trend: buildTrend(shaped),
        dropoffReasons: [],
        isMock: false,
      } satisfies FunnelData)
    }
  } catch (err) {
    console.error('[funnel] DB error, falling back to mock:', err)
  }

  // Mock fallback
  let mockFiltered = MOCK_LEADS_FULL
  if (cutoff) mockFiltered = MOCK_LEADS_FULL.filter((l) => l.createdAt.getTime() >= cutoff!.getTime())

  return NextResponse.json({
    stages: buildFunnelStages(mockFiltered),
    trend: buildTrend(mockFiltered.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))),
    dropoffReasons: MOCK_DROPOFF_REASONS,
    isMock: true,
  } satisfies FunnelData)
}
