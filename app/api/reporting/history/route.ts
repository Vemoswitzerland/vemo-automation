/**
 * Reporting History API
 * GET /api/reporting/history - List stored report exports
 * POST /api/reporting/history - Record a new export event
 *
 * Persists in AppSettings with key `reporting_history`.
 * Falls back to mock if AppSettings unavailable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

const SETTINGS_KEY = 'reporting_history'
const MAX_HISTORY = 50

interface ReportHistoryEntry {
  id: string
  reportType: string
  format: string
  dateRange: string
  generatedAt: string
  rowCount: number
  userId: string
}

const MOCK_HISTORY: ReportHistoryEntry[] = [
  {
    id: 'mock-hist-1',
    reportType: 'leads',
    format: 'csv',
    dateRange: '30d',
    generatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    rowCount: 8,
    userId: 'admin',
  },
  {
    id: 'mock-hist-2',
    reportType: 'funnel',
    format: 'csv',
    dateRange: '7d',
    generatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    rowCount: 5,
    userId: 'admin',
  },
]

async function loadHistory(): Promise<ReportHistoryEntry[]> {
  try {
    const setting = await prisma.appSettings.findUnique({ where: { key: SETTINGS_KEY } })
    if (!setting) return []
    return JSON.parse(setting.value) as ReportHistoryEntry[]
  } catch {
    return []
  }
}

async function saveHistory(entries: ReportHistoryEntry[]): Promise<void> {
  await prisma.appSettings.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: JSON.stringify(entries) },
    create: { key: SETTINGS_KEY, value: JSON.stringify(entries) },
  })
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request)

  try {
    const allEntries = await loadHistory()
    const userEntries = allEntries
      .filter((e) => e.userId === userId)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, MAX_HISTORY)

    if (userEntries.length === 0) {
      return NextResponse.json({ history: MOCK_HISTORY, isMock: true })
    }

    return NextResponse.json({ history: userEntries, isMock: false })
  } catch {
    return NextResponse.json({ history: MOCK_HISTORY, isMock: true })
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request)

  let body: { reportType?: string; format?: string; dateRange?: string; rowCount?: number; generatedAt?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { reportType, format, dateRange, rowCount, generatedAt } = body

  if (!reportType || typeof reportType !== 'string') {
    return NextResponse.json({ error: 'reportType is required' }, { status: 400 })
  }
  if (!format || !['csv', 'pdf'].includes(format)) {
    return NextResponse.json({ error: 'format must be csv or pdf' }, { status: 400 })
  }
  if (!dateRange || !['7d', '30d', 'all'].includes(dateRange)) {
    return NextResponse.json({ error: 'dateRange must be 7d, 30d or all' }, { status: 400 })
  }

  const newEntry: ReportHistoryEntry = {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reportType,
    format,
    dateRange,
    generatedAt: generatedAt ?? new Date().toISOString(),
    rowCount: typeof rowCount === 'number' ? rowCount : 0,
    userId,
  }

  try {
    const allEntries = await loadHistory()
    allEntries.push(newEntry)

    // Keep only the newest MAX_HISTORY entries per user globally
    const trimmed = allEntries
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, MAX_HISTORY * 10) // keep up to 500 total across all users

    await saveHistory(trimmed)

    return NextResponse.json({ success: true, entry: newEntry, isMock: false })
  } catch {
    // Fallback: return success without persisting
    return NextResponse.json({
      success: true,
      entry: newEntry,
      isMock: true,
      note: 'History gespeichert (Mock-Modus). Prisma nicht verfügbar.',
    })
  }
}
