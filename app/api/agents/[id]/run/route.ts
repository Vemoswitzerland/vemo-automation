import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET — List runs for an agent (last 20)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const runs = await prisma.agentRun.findMany({
      where: { agentId: id },
      orderBy: { startedAt: 'desc' },
      take: 20,
    })
    return NextResponse.json(runs)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — Trigger a new run for an agent
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { input, trigger } = body

    // Mark agent as running
    await prisma.agent.update({
      where: { id },
      data: { status: 'running' },
    })

    // Create the run record
    const run = await prisma.agentRun.create({
      data: {
        agentId: id,
        trigger: trigger || 'manual',
        input: input || null,
        status: 'completed',
        durationMs: 0,
        completedAt: new Date(),
      },
    })

    // Update agent stats
    await prisma.agent.update({
      where: { id },
      data: {
        status: 'idle',
        lastRunAt: new Date(),
        runCount: { increment: 1 },
      },
    })

    return NextResponse.json(run, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
