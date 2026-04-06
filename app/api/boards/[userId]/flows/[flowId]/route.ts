import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

async function authorize(userId: string, flowId: string) {
  const flow = await prisma.flow.findUnique({ where: { id: flowId } })
  if (!flow) return { error: 'Flow nicht gefunden', status: 404 }

  if (!flow.boardId) return { error: 'Flow gehört zu keinem Board', status: 403 }

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: flow.boardId, userId } },
  })
  if (!membership) return { error: 'Nicht autorisiert', status: 403 }

  return { flow, membership }
}

// DELETE /api/boards/[userId]/flows/[flowId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string; flowId: string } }
) {
  try {
    const { userId, flowId } = params
    const result = await authorize(userId, flowId)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    await prisma.flow.delete({ where: { id: flowId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Löschen des Flows' }, { status: 500 })
  }
}

// PATCH /api/boards/[userId]/flows/[flowId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string; flowId: string } }
) {
  try {
    const { userId, flowId } = params
    const result = await authorize(userId, flowId)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.description !== undefined) data.description = body.description
    if (body.nodes !== undefined) data.nodes = JSON.stringify(body.nodes)
    if (body.edges !== undefined) data.edges = JSON.stringify(body.edges)
    if (body.status !== undefined) {
      data.status = body.status
      if (body.status === 'active') data.deployedAt = new Date()
    }
    if (body.incrementVersion) data.version = { increment: 1 }

    const flow = await prisma.flow.update({ where: { id: flowId }, data })
    return NextResponse.json(flow)
  } catch {
    return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 })
  }
}
