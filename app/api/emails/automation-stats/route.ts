import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type CategoryFilter = 'auto_replied' | 'queued' | 'labelled'

function categoryToAction(cat: CategoryFilter): string {
  if (cat === 'auto_replied') return 'auto_replied'
  if (cat === 'queued') return 'queued'
  return 'labelled'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isMock = searchParams.get('mock') === 'true'
  const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '7', 10) || 7, 1), 90)
  const categoryParam = searchParams.get('category') as CategoryFilter | null

  if (isMock) {
    const allMockDays = [
      { date: '2026-03-08', total: 3, autoReplied: 1 },
      { date: '2026-03-14', total: 5, autoReplied: 2 },
      { date: '2026-03-21', total: 7, autoReplied: 3 },
      { date: '2026-03-28', total: 6, autoReplied: 2 },
      { date: '2026-03-31', total: 5, autoReplied: 2 },
      { date: '2026-04-01', total: 8, autoReplied: 3 },
      { date: '2026-04-02', total: 6, autoReplied: 2 },
      { date: '2026-04-03', total: 9, autoReplied: 4 },
      { date: '2026-04-04', total: 7, autoReplied: 3 },
      { date: '2026-04-05', total: 8, autoReplied: 3 },
      { date: '2026-04-06', total: 5, autoReplied: 3 },
    ]
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const filteredDays = allMockDays.filter(d => new Date(d.date) >= cutoff)

    // Mock totals vary by category filter
    const totals =
      categoryParam === 'auto_replied' ? { total: 20, autoReplied: 20, queued: 0, labelled: 0, quote: 100 } :
      categoryParam === 'queued' ? { total: 25, autoReplied: 0, queued: 25, labelled: 0, quote: 0 } :
      categoryParam === 'labelled' ? { total: 3, autoReplied: 0, queued: 0, labelled: 3, quote: 0 } :
      { total: 48, autoReplied: 20, queued: 25, labelled: 3, quote: 41.7 }

    return NextResponse.json({
      totalProcessed: totals.total,
      autoReplied: totals.autoReplied,
      queued: totals.queued,
      labelled: totals.labelled,
      autoReplyQuote: totals.quote,
      avgResponseTimeMs: 1090,
      topRules: [
        { name: 'Newsletter-Abmeldung', count: 12 },
        { name: 'Spam-Label', count: 23 },
        { name: 'FAQ: Preisanfrage', count: 8 },
      ],
      last7Days: filteredDays,
    })
  }

  // Build base where clause for category filter
  const categoryWhere = categoryParam ? { action: categoryToAction(categoryParam) } : {}

  const [total, autoReplied, labelled] = await Promise.all([
    prisma.automationLog.count({ where: categoryWhere }),
    prisma.automationLog.count({ where: { ...categoryWhere, wasAutoReplied: true } }),
    prisma.automationLog.count({ where: { ...categoryWhere, action: 'labelled' } }),
  ])

  const queued = Math.max(0, total - autoReplied - labelled)

  // Average response time (only for auto-replied)
  const avgResult = await prisma.automationLog.aggregate({
    where: { ...categoryWhere, wasAutoReplied: true, responseTimeMs: { not: null } },
    _avg: { responseTimeMs: true },
  })

  // Top rules (filtered by category if set)
  const ruleWhere = categoryParam
    ? {
        triggerCount: { gt: 0 },
        automationLogs: { some: { action: categoryToAction(categoryParam) } },
      }
    : { triggerCount: { gt: 0 } }

  const ruleStats = await prisma.automationRule.findMany({
    where: ruleWhere,
    orderBy: { triggerCount: 'desc' },
    take: 5,
    select: { name: true, triggerCount: true },
  })

  // Trend by date (last N days)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const recentLogs = await prisma.automationLog.findMany({
    where: { ...categoryWhere, createdAt: { gte: cutoff } },
    select: { createdAt: true, wasAutoReplied: true },
    orderBy: { createdAt: 'asc' },
  })

  const byDate: Record<string, { total: number; autoReplied: number }> = {}
  for (const log of recentLogs) {
    const d = log.createdAt.toISOString().slice(0, 10)
    if (!byDate[d]) byDate[d] = { total: 0, autoReplied: 0 }
    byDate[d].total++
    if (log.wasAutoReplied) byDate[d].autoReplied++
  }

  const last7Days = Object.entries(byDate).map(([date, v]) => ({ date, ...v }))

  return NextResponse.json({
    totalProcessed: total,
    autoReplied,
    queued,
    labelled,
    autoReplyQuote: total > 0 ? Math.round((autoReplied / total) * 1000) / 10 : 0,
    avgResponseTimeMs: Math.round(avgResult._avg.responseTimeMs ?? 0),
    topRules: ruleStats.map((r) => ({ name: r.name, count: r.triggerCount })),
    last7Days,
  })
}
