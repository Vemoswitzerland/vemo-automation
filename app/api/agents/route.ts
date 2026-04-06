import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET — List all agents (ordered by role, then name)
export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { files: true, runs: true } },
      },
    })
    return NextResponse.json(agents)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — Create new agent
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, role, title, description, instructions, model, heartbeatSec } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const agent = await prisma.agent.create({
      data: {
        name,
        role: role || 'worker',
        title: title || null,
        description: description || null,
        instructions: instructions || '',
        model: model || 'claude-sonnet-4-6',
        heartbeatSec: heartbeatSec || 0,
      },
    })

    return NextResponse.json(agent, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
