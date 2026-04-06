import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()

  try {
    const rule = await prisma.automationRule.update({
      where: { id: params.id },
      data: body,
    })
    return NextResponse.json(rule)
  } catch {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Delete logs first (FK constraint)
    await prisma.automationLog.deleteMany({ where: { ruleId: params.id } })
    await prisma.automationRule.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
  }
}
