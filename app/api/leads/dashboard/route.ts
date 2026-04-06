/**
 * Leads Dashboard API
 *
 * Returns aggregated stats for the dashboard UI.
 * Falls back to mock data when the DB is empty or unavailable.
 * Supports `dateRange` query param: 7d | 30d | all
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

export interface DashboardData {
  totalLeads: number
  newToday: number
  hotLeads: number
  atRisk: number
  conversionRate: number
  pendingActions: number
  scoreDistribution: { green: number; yellow: number; red: number }
  topChannels: Array<{ source: string; count: number; percentage: number }>
  weeklyTrend: Array<{ day: string; leads: number }>
  isMock: boolean
}

// Reuse the same mock data set as the leads route so numbers are consistent
const MOCK_LEADS = [
  { id: 'mock-1', status: 'new',       source: 'instagram',  score: 62, lastContact: new Date(Date.now() - 2   * 86400000).toISOString(), createdAt: new Date(Date.now() - 5  * 86400000).toISOString() },
  { id: 'mock-2', status: 'qualified', source: 'facebook',   score: 78, lastContact: new Date(Date.now() - 1   * 86400000).toISOString(), createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'mock-3', status: 'contacted', source: 'google_ads', score: 45, lastContact: new Date(Date.now() - 3   * 86400000).toISOString(), createdAt: new Date(Date.now() - 7  * 86400000).toISOString() },
  { id: 'mock-4', status: 'converted', source: 'referral',   score: 95, lastContact: new Date(Date.now() - 0.5 * 86400000).toISOString(), createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'mock-5', status: 'new',       source: 'instagram',  score: 32, lastContact: new Date(Date.now() - 7   * 86400000).toISOString(), createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: 'mock-6', status: 'qualified', source: 'referral',   score: 88, lastContact: new Date(Date.now() - 1   * 86400000).toISOString(), createdAt: new Date(Date.now() - 3  * 86400000).toISOString() },
  { id: 'mock-7', status: 'lost',      source: 'google_ads', score: 18, lastContact: new Date(Date.now() - 15  * 86400000).toISOString(), createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'mock-8', status: 'contacted', source: 'facebook',   score: 56, lastContact: new Date(Date.now() - 2   * 86400000).toISOString(), createdAt: new Date(Date.now() - 8  * 86400000).toISOString() },
  { id: 'mock-9', status: 'new',       source: 'instagram',  score: 41, lastContact: new Date(Date.now() - 1   * 86400000).toISOString(), createdAt: new Date(Date.now() - 1  * 86400000).toISOString() },
  { id: 'mock-10', status: 'converted', source: 'manual',    score: 90, lastContact: new Date(Date.now() - 0   * 86400000).toISOString(), createdAt: new Date(Date.now() - 0  * 86400000).toISOString() },
]

function computeScore(status: string): number {
  const base: Record<string, number> = { new: 20, qualified: 55, contacted: 40, converted: 90, lost: 10 }
  return base[status] ?? 25
}

function getDateCutoff(dateRange: string): Date | null {
  const now = new Date()
  if (dateRange === '7d') return new Date(now.getTime() - 7 * 86400000)
  if (dateRange === '30d') return new Date(now.getTime() - 30 * 86400000)
  return null
}

function buildWeeklyTrend(leads: Array<{ createdAt: string | Date }>): Array<{ day: string; leads: number }> {
  const days: Array<{ day: string; leads: number }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const count = leads.filter((l) => {
      const t = new Date(l.createdAt).getTime()
      return t >= d.getTime() && t < next.getTime()
    }).length
    days.push({
      day: d.toLocaleDateString('de-CH', { weekday: 'short' }),
      leads: count,
    })
  }
  return days
}

function buildTopChannels(leads: Array<{ source: string }>): Array<{ source: string; count: number; percentage: number }> {
  const counts: Record<string, number> = {}
  for (const l of leads) {
    counts[l.source] = (counts[l.source] ?? 0) + 1
  }
  const total = leads.length || 1
  return Object.entries(counts)
    .map(([source, count]) => ({ source, count, percentage: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function computeDashboard(
  leads: Array<{ status: string; source: string; score: number; createdAt: string | Date; lastContact: string | Date | null }>,
  isMock: boolean,
): DashboardData {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const total = leads.length
  const newToday = leads.filter((l) => new Date(l.createdAt).getTime() >= todayStart.getTime()).length
  const hotLeads = leads.filter((l) => l.score > 80).length
  const atRisk = leads.filter((l) => l.score < 40).length

  const converted = leads.filter((l) => l.status === 'converted').length
  const conversionRate = total > 0 ? Math.round((converted / total) * 100 * 10) / 10 : 0

  // Pending: contacted or qualified without recent contact (>= 3 days ago)
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000)
  const pendingActions = leads.filter((l) => {
    if (l.status !== 'contacted' && l.status !== 'qualified') return false
    if (!l.lastContact) return true
    return new Date(l.lastContact).getTime() < threeDaysAgo.getTime()
  }).length

  const green = leads.filter((l) => l.score >= 70).length
  const yellow = leads.filter((l) => l.score >= 40 && l.score < 70).length
  const red = leads.filter((l) => l.score < 40).length

  return {
    totalLeads: total,
    newToday,
    hotLeads,
    atRisk,
    conversionRate,
    pendingActions,
    scoreDistribution: { green, yellow, red },
    topChannels: buildTopChannels(leads),
    weeklyTrend: buildWeeklyTrend(leads),
    isMock,
  }
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const { searchParams } = new URL(request.url)
  const dateRange = searchParams.get('dateRange') ?? '30d'
  const cutoff = getDateCutoff(dateRange)

  try {
    const where: Record<string, unknown> = { userId }
    if (cutoff) where.createdAt = { gte: cutoff }

    const dbLeads = await prisma.lead.findMany({ where })

    if (dbLeads.length === 0) {
      // Filter mock data by date range too
      let mockFiltered = MOCK_LEADS
      if (cutoff) mockFiltered = MOCK_LEADS.filter((l) => new Date(l.createdAt).getTime() >= cutoff.getTime())
      const mockWithScores = mockFiltered.map((l) => ({ ...l, score: l.score }))
      return NextResponse.json(computeDashboard(mockWithScores, true))
    }

    const scored = dbLeads.map((l) => ({
      status: l.status,
      source: l.source,
      score: computeScore(l.status),
      createdAt: l.createdAt,
      lastContact: l.updatedAt,
    }))

    return NextResponse.json(computeDashboard(scored, false))
  } catch (err) {
    console.error('[dashboard] DB error, falling back to mock:', err)
    let mockFiltered = MOCK_LEADS
    if (cutoff) mockFiltered = MOCK_LEADS.filter((l) => new Date(l.createdAt).getTime() >= cutoff.getTime())
    return NextResponse.json(computeDashboard(mockFiltered, true))
  }
}
