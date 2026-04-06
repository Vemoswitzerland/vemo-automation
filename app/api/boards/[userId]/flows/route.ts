import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

async function getAuthorizedBoard(userId: string) {
  // Find first board where userId is owner or collaborator
  const membership = await prisma.boardMember.findFirst({
    where: { userId },
    include: { board: true },
  })
  return membership
}

// GET /api/boards/[userId]/flows — list all flows on the user's board
export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const membership = await getAuthorizedBoard(userId)
    if (!membership) {
      return NextResponse.json({ error: 'Kein Board gefunden' }, { status: 404 })
    }

    const flows = await prisma.flow.findMany({
      where: { boardId: membership.boardId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(flows)
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden der Flows' }, { status: 500 })
  }
}

// POST /api/boards/[userId]/flows — create a flow on the user's board
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const membership = await getAuthorizedBoard(userId)
    if (!membership) {
      return NextResponse.json({ error: 'Kein Board gefunden' }, { status: 404 })
    }

    const body = await req.json()
    const flow = await prisma.flow.create({
      data: {
        name: body.name ?? 'Unbenannter Flow',
        description: body.description ?? null,
        nodes: JSON.stringify(body.nodes ?? []),
        edges: JSON.stringify(body.edges ?? []),
        status: 'draft',
        boardId: membership.boardId,
      },
    })

    return NextResponse.json(flow, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Erstellen des Flows' }, { status: 500 })
  }
}
