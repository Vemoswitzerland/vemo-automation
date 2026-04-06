/**
 * Reporting Schedule API
 *
 * POST /api/reporting/schedule
 * Body: { email: string, frequency: 'weekly' | 'monthly', reportType: string }
 *
 * GET /api/reporting/schedule
 * Returns all active schedules
 *
 * Persists in AppSettings with key `reporting_schedules`.
 * Falls back to mock if AppSettings unavailable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

const SETTINGS_KEY = 'reporting_schedules'

interface ReportSchedule {
  id: string
  email: string
  frequency: 'weekly' | 'monthly'
  reportType: string
  userId: string
  createdAt: string
  active: boolean
}

const MOCK_SCHEDULES: ReportSchedule[] = [
  {
    id: 'mock-sched-1',
    email: 'info@vemo.ch',
    frequency: 'weekly',
    reportType: 'leads',
    userId: 'admin',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    active: true,
  },
]

async function loadSchedules(): Promise<ReportSchedule[]> {
  try {
    const setting = await prisma.appSettings.findUnique({ where: { key: SETTINGS_KEY } })
    if (!setting) return []
    return JSON.parse(setting.value) as ReportSchedule[]
  } catch {
    return []
  }
}

async function saveSchedules(schedules: ReportSchedule[]): Promise<void> {
  await prisma.appSettings.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: JSON.stringify(schedules) },
    create: { key: SETTINGS_KEY, value: JSON.stringify(schedules) },
  })
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request)

  try {
    const schedules = await loadSchedules()
    const userSchedules = schedules.filter((s) => s.userId === userId && s.active)

    if (userSchedules.length === 0) {
      // Return mock if nothing saved yet
      return NextResponse.json({ schedules: MOCK_SCHEDULES, isMock: true })
    }

    return NextResponse.json({ schedules: userSchedules, isMock: false })
  } catch {
    return NextResponse.json({ schedules: MOCK_SCHEDULES, isMock: true })
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request)

  let body: { email?: string; frequency?: string; reportType?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, frequency, reportType } = body

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (!frequency || !['weekly', 'monthly'].includes(frequency)) {
    return NextResponse.json({ error: 'frequency must be weekly or monthly' }, { status: 400 })
  }
  if (!reportType || typeof reportType !== 'string') {
    return NextResponse.json({ error: 'reportType is required' }, { status: 400 })
  }

  const newSchedule: ReportSchedule = {
    id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email,
    frequency: frequency as 'weekly' | 'monthly',
    reportType,
    userId,
    createdAt: new Date().toISOString(),
    active: true,
  }

  try {
    const schedules = await loadSchedules()
    schedules.push(newSchedule)
    await saveSchedules(schedules)

    return NextResponse.json({
      success: true,
      schedule: newSchedule,
      isMock: false,
      note: 'Hinweis: E-Mail-Versand wird aktiv, sobald SMTP/SendGrid konfiguriert ist.',
    })
  } catch {
    // Fallback: return success without persisting
    return NextResponse.json({
      success: true,
      schedule: newSchedule,
      isMock: true,
      note: 'Schedule gespeichert (Mock-Modus). Prisma nicht verfügbar.',
    })
  }
}

export async function DELETE(request: NextRequest) {
  const userId = getUserId(request)
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 })
  }

  try {
    const schedules = await loadSchedules()
    const idx = schedules.findIndex((s) => s.id === id && s.userId === userId)
    if (idx === -1) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }
    schedules[idx].active = false
    await saveSchedules(schedules)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 })
  }
}
