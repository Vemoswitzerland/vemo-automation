import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// POST /api/automation/tasks/:id/approve — approve a waiting_approval task
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    const task = await prisma.automationTask.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: 'Task nicht gefunden' }, { status: 404 })
    }

    if (task.status !== 'waiting_approval' && task.status !== 'preview') {
      return NextResponse.json(
        { error: `Task kann nicht genehmigt werden. Aktueller Status: ${task.status}` },
        { status: 409 }
      )
    }

    const updated = await prisma.automationTask.update({
      where: { id },
      data: {
        status: 'done',
        approvedAt: new Date(),
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
    console.error('[POST /api/automation/tasks/:id/approve]', err)
    return NextResponse.json({ error: 'Fehler beim Genehmigen' }, { status: 500 })
  }
}
