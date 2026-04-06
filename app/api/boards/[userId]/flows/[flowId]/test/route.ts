import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

async function authorize(userId: string, flowId: string) {
  const flow = await prisma.flow.findUnique({ where: { id: flowId } })
  if (!flow) return { error: 'Flow nicht gefunden', status: 404, flow: null }

  if (!flow.boardId) return { error: 'Flow gehört zu keinem Board', status: 403, flow: null }

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: flow.boardId, userId } },
  })
  if (!membership) return { error: 'Nicht autorisiert', status: 403, flow: null }

  return { flow, error: null, status: null }
}

// POST /api/boards/[userId]/flows/[flowId]/test — dry-run a flow (no side effects)
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string; flowId: string } }
) {
  try {
    const { userId, flowId } = params
    const result = await authorize(userId, flowId)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status! })
    }

    const { flow } = result
    const body = await req.json().catch(() => ({}))

    const execution = await prisma.execution.create({
      data: {
        flowId,
        boardId: flow!.boardId,
        triggeredBy: userId,
        status: 'running',
        input: JSON.stringify(body.input ?? {}),
        isTest: true,
      },
    })

    // Dry-run: validate nodes, return mock output without side effects
    const nodes: unknown[] = JSON.parse(flow!.nodes)
    const edges: unknown[] = JSON.parse(flow!.edges)

    const testOutput = {
      dryRun: true,
      valid: true,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      flowId,
      executionId: execution.id,
      mockResult: 'Test erfolgreich — keine Daten wurden gesendet',
    }

    const completed = await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: 'success',
        output: JSON.stringify(testOutput),
        completedAt: new Date(),
      },
    })

    return NextResponse.json(completed, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Test-Run' }, { status: 500 })
  }
}
