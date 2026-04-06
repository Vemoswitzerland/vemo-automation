import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MOCK_AUTOMATION_LOGS } from '@/lib/email/automation'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isMock = searchParams.get('mock') === 'true'
  const limit = parseInt(searchParams.get('limit') || '50')

  if (isMock) {
    return NextResponse.json(MOCK_AUTOMATION_LOGS)
  }

  const logs = await prisma.automationLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { rule: { select: { name: true } } },
  })
  return NextResponse.json(logs)
}
