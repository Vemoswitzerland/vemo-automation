import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/boards/[userId]/executions — list executions triggered by userId
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

    // Find boards where user is a member
    const memberships = await prisma.boardMember.findMany({
      where: { userId },
      select: { boardId: true },
    })
    const boardIds = memberships.map((m) => m.boardId)

    const executions = await prisma.execution.findMany({
      where: {
        OR: [
          { triggeredBy: userId },
          { boardId: { in: boardIds } },
        ],
      },
      include: {
        flow: { select: { id: true, name: true, status: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(executions)
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden der Executions' }, { status: 500 })
  }
}
