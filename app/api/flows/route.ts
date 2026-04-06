import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req)
    const flows = await prisma.flow.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(flows)
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden der Flows' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req)
    const body = await req.json()
    const flow = await prisma.flow.create({
      data: {
        userId,
        name: body.name ?? 'Unbenannter Flow',
        description: body.description ?? null,
        nodes: JSON.stringify(body.nodes ?? []),
        edges: JSON.stringify(body.edges ?? []),
        status: 'draft',
      },
    })
    return NextResponse.json(flow, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Erstellen des Flows' }, { status: 500 })
  }
}
