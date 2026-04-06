import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// GET /api/automation/tasks/:id — fetch a single task
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const task = await prisma.automationTask.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: 'Task nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json({
      task: {
        ...task,
        input: task.input ? JSON.parse(task.input) : null,
        output: task.output ? JSON.parse(task.output) : null,
      },
    })
  } catch (err) {
    console.error('[GET /api/automation/tasks/:id]', err)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

// PATCH /api/automation/tasks/:id — update status, output, or error
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, output, error, input, agentId } = body

    const existing = await prisma.automationTask.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Task nicht gefunden' }, { status: 404 })
    }

    const validStatuses = ['pending', 'running', 'preview', 'waiting_approval', 'done', 'failed']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Ungültiger Status. Erlaubt: ${validStatuses.join(' | ')}` },
        { status: 400 }
      )
    }

    const updated = await prisma.automationTask.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(output !== undefined ? { output: output ? JSON.stringify(output) : null } : {}),
        ...(error !== undefined ? { error: error ?? null } : {}),
        ...(input !== undefined ? { input: input ? JSON.stringify(input) : null } : {}),
        ...(agentId !== undefined ? { agentId: agentId ?? null } : {}),
      },
    })

    return NextResponse.json({
      task: {
        ...updated,
        input: updated.input ? JSON.parse(updated.input) : null,
        output: updated.output ? JSON.parse(updated.output) : null,
      },
    })
  } catch (err) {
    console.error('[PATCH /api/automation/tasks/:id]', err)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}
