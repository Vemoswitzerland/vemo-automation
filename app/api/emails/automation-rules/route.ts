import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MOCK_AUTOMATION_RULES } from '@/lib/email/automation'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isMock = searchParams.get('mock') === 'true'

  if (isMock) {
    return NextResponse.json(MOCK_AUTOMATION_RULES)
  }

  const rules = await prisma.automationRule.findMany({
    orderBy: { priority: 'asc' },
  })
  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    name,
    description,
    isActive = true,
    priority = 0,
    triggerType,
    triggerValue,
    matchMode = 'contains',
    actionType,
    replyTemplate,
    replySubject,
    labelValue,
  } = body

  if (!name || !triggerType || !triggerValue || !actionType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const rule = await prisma.automationRule.create({
    data: {
      name,
      description,
      isActive,
      priority,
      triggerType,
      triggerValue,
      matchMode,
      actionType,
      replyTemplate,
      replySubject,
      labelValue,
    },
  })
  return NextResponse.json(rule, { status: 201 })
}
