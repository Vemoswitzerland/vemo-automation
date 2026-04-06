import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isMock = searchParams.get('mock') === 'true'

  if (isMock) {
    return NextResponse.json({
      totalProcessed: 48,
      autoReplied: 20,
      queued: 25,
      labelled: 3,
      autoReplyQuote: 41.7,
      avgResponseTimeMs: 1090,
      topRules: [
        { name: 'Newsletter-Abmeldung', count: 12 },
        { name: 'Spam-Label', count: 23 },
        { name: 'FAQ: Preisanfrage', count: 8 },
      ],
      last7Days: [
        { date: '2026-03-31', total: 5, autoReplied: 2 },
        { date: '2026-04-01', total: 8, autoReplied: 3 },
        { date: '2026-04-02', total: 6, autoReplied: 2 },
        { date: '2026-04-03', total: 9, autoReplied: 4 },
        { date: '2026-04-04', total: 7, autoReplied: 3 },
        { date: '2026-04-05', total: 8, autoReplied: 3 },
        { date: '2026-04-06', total: 5, autoReplied: 3 },
      ],
    })
  }

  const [total, autoReplied, fallback, labelled] = await Promise.all([
    prisma.automationLog.count(),
    prisma.automationLog.count({ where: { wasAutoReplied: true } }),
    prisma.automationLog.count({ where: { action: 'fallback' } }),
    prisma.automationLog.count({ where: { action: 'labelled' } }),
  ])

  const queued = total - autoReplied - labelled

  // Average response time (only for auto-replied)
  const avgResult = await prisma.automationLog.aggregate({
    where: { wasAutoReplied: true, responseTimeMs: { not: null } },
    _avg: { responseTimeMs: true },
  })

  // Top rules
  const ruleStats = await prisma.automationRule.findMany({
    where: { triggerCount: { gt: 0 } },
    orderBy: { triggerCount: 'desc' },
    take: 5,
    select: { name: true, triggerCount: true },
  })

  // Last 7 days breakdown
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentLogs = await prisma.automationLog.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, wasAutoReplied: true },
    orderBy: { createdAt: 'asc' },
  })

  // Group by date
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
    queued: queued < 0 ? 0 : queued,
    labelled,
    autoReplyQuote: total > 0 ? Math.round((autoReplied / total) * 1000) / 10 : 0,
    avgResponseTimeMs: Math.round(avgResult._avg.responseTimeMs ?? 0),
    topRules: ruleStats.map((r) => ({ name: r.name, count: r.triggerCount })),
    last7Days,
  })
}
