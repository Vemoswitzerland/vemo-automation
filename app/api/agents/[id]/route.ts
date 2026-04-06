import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET — Single agent by ID
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { _count: { select: { files: true, runs: true } } },
    })
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    return NextResponse.json(agent)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH — Update agent fields
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const allowed = ['name', 'role', 'title', 'description', 'instructions', 'model', 'status', 'heartbeatSec']
    const data: Record<string, any> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key]
    }
    const agent = await prisma.agent.update({ where: { id }, data })
    return NextResponse.json(agent)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE — Delete agent
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.agent.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
