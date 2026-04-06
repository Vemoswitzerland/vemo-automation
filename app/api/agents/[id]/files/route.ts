import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET — List files for an agent
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const files = await prisma.agentFile.findMany({
      where: { agentId: id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(files)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — Create a new file for an agent
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, content, type } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const file = await prisma.agentFile.create({
      data: {
        agentId: id,
        name,
        content: content || '',
        type: type || 'text',
      },
    })
    return NextResponse.json(file, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE — Delete a file by fileId query param
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const fileId = url.searchParams.get('fileId')
    if (!fileId) {
      return NextResponse.json({ error: 'fileId query param required' }, { status: 400 })
    }
    await prisma.agentFile.delete({ where: { id: fileId } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
