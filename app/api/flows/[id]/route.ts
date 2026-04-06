import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const flow = await prisma.flow.findUnique({ where: { id: params.id } })
    if (!flow) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    return NextResponse.json(flow)
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
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

    const flow = await prisma.flow.update({ where: { id: params.id }, data })
    return NextResponse.json(flow)
  } catch {
    return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.flow.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
