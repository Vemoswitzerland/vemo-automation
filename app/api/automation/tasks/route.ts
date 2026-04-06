import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

// GET /api/automation/tasks — list all tasks (optional ?status= filter)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')
    const agentId = searchParams.get('agentId')
    const type = searchParams.get('type')

    const tasks = await prisma.automationTask.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(agentId ? { agentId } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    const parsed = tasks.map((t) => ({
      ...t,
      input: t.input ? JSON.parse(t.input) : null,
      output: t.output ? JSON.parse(t.output) : null,
    }))

    return NextResponse.json({ tasks: parsed })
  } catch (err) {
    console.error('[GET /api/automation/tasks]', err)
    return NextResponse.json({ error: 'Fehler beim Laden der Tasks' }, { status: 500 })
  }
}

// POST /api/automation/tasks — create a new automation task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, input, agentId, status } = body

    if (!type) {
      return NextResponse.json({ error: 'type ist erforderlich' }, { status: 400 })
    }

    const validStatuses = ['pending', 'running', 'preview', 'waiting_approval', 'done', 'failed']
    const taskStatus = status && validStatuses.includes(status) ? status : 'pending'

    const task = await prisma.automationTask.create({
      data: {
        type,
        status: taskStatus,
        input: input ? JSON.stringify(input) : null,
        agentId: agentId ?? null,
      },
    })

    return NextResponse.json({
      task: {
        ...task,
        input: task.input ? JSON.parse(task.input) : null,
        output: null,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/automation/tasks]', err)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Tasks' }, { status: 500 })
  }
}
