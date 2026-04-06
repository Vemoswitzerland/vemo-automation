import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/boards/[userId] — list boards where user is owner or collaborator
export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    const memberships = await prisma.boardMember.findMany({
      where: { userId },
      include: {
        board: {
          include: {
            members: true,
            _count: { select: { flows: true, executions: true } },
          },
        },
      },
    })

    const boards = memberships.map((m) => ({
      ...m.board,
      role: m.role,
    }))

    return NextResponse.json(boards)
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden der Boards' }, { status: 500 })
  }
}

// POST /api/boards/[userId] — create a new board for userId (as owner)
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const body = await req.json()

    const board = await prisma.board.create({
      data: {
        name: body.name ?? 'Mein Board',
        description: body.description ?? null,
        members: {
          create: { userId, role: 'owner' },
        },
      },
      include: { members: true },
    })

    return NextResponse.json(board, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Erstellen des Boards' }, { status: 500 })
  }
}
