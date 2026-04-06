/**
 * Reporting Export API
 *
 * POST /api/reporting/export
 * Body: { format: 'csv' | 'pdf', reportType: 'leads' | 'funnel' | 'channels', dateRange: '7d' | '30d' | 'all' }
 *
 * CSV: Real data from Prisma Lead table with mock fallback
 * PDF: Mock response (no PDF library installed)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

const MOCK_LEADS = [
  { id: 'mock-1', name: 'Anna Müller', email: 'anna@beispiel.ch', phone: '+41 79 123 45 67', source: 'instagram', status: 'new', value: 490, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'mock-2', name: 'Thomas Keller', email: 'thomas@beispiel.ch', phone: '+41 78 987 65 43', source: 'facebook', status: 'qualified', value: 890, createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'mock-3', name: 'Sara Meier', email: 'sara@beispiel.ch', phone: null, source: 'google_ads', status: 'contacted', value: 290, createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: 'mock-4', name: 'Martin Weber', email: 'martin@beispiel.ch', phone: '+41 76 555 12 34', source: 'referral', status: 'converted', value: 1290, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'mock-5', name: 'Lisa Brunner', email: 'lisa@beispiel.ch', phone: '+41 79 444 56 78', source: 'instagram', status: 'new', value: 390, createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: 'mock-6', name: 'Lukas Zimmermann', email: 'lukas@firma.ch', phone: '+41 77 321 09 87', source: 'referral', status: 'qualified', value: 2490, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'mock-7', name: 'Maria Schneider', email: 'maria@beispiel.ch', phone: null, source: 'google_ads', status: 'lost', value: 190, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'mock-8', name: 'Peter Huber', email: 'peter@beispiel.ch', phone: '+41 76 111 22 33', source: 'facebook', status: 'contacted', value: 690, createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
]

function getDateCutoff(dateRange: string): Date | null {
  if (dateRange === '7d') return new Date(Date.now() - 7 * 86400000)
  if (dateRange === '30d') return new Date(Date.now() - 30 * 86400000)
  return null
}

function escapeCsvField(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildLeadsCsv(leads: Array<{ id: string; name: string; email: string | null; phone: string | null; source: string; status: string; value: number | null; createdAt: string | Date }>): string {
  const headers = ['ID', 'Name', 'E-Mail', 'Telefon', 'Quelle', 'Status', 'Wert (CHF)', 'Erstellt am']
  const rows = leads.map((l) => [
    escapeCsvField(l.id),
    escapeCsvField(l.name),
    escapeCsvField(l.email),
    escapeCsvField(l.phone),
    escapeCsvField(l.source),
    escapeCsvField(l.status),
    escapeCsvField(l.value != null ? String(l.value) : ''),
    escapeCsvField(new Date(l.createdAt).toLocaleDateString('de-CH')),
  ])
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
}

function buildFunnelCsv(leads: Array<{ status: string; value: number | null }>): string {
  const stages = ['new', 'qualified', 'contacted', 'converted', 'lost']
  const headers = ['Status', 'Anzahl Leads', 'Gesamtwert (CHF)']
  const rows = stages.map((stage) => {
    const stageleads = leads.filter((l) => l.status === stage)
    const total = stageleads.reduce((sum, l) => sum + (l.value ?? 0), 0)
    return [escapeCsvField(stage), String(stageleads.length), String(total)]
  })
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
}

function buildChannelsCsv(leads: Array<{ source: string; value: number | null; status: string }>): string {
  const sources = ['instagram', 'facebook', 'google_ads', 'referral', 'unknown']
  const headers = ['Kanal', 'Anzahl Leads', 'Konvertiert', 'Gesamtwert (CHF)']
  const rows = sources.map((src) => {
    const srcLeads = leads.filter((l) => l.source === src)
    if (srcLeads.length === 0) return null
    const converted = srcLeads.filter((l) => l.status === 'converted').length
    const total = srcLeads.reduce((sum, l) => sum + (l.value ?? 0), 0)
    return [escapeCsvField(src), String(srcLeads.length), String(converted), String(total)]
  }).filter(Boolean) as string[][]
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request)

  let body: { format?: string; reportType?: string; dateRange?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const format = body.format ?? 'csv'
  const reportType = body.reportType ?? 'leads'
  const dateRange = body.dateRange ?? '30d'

  if (!['csv', 'pdf'].includes(format)) {
    return NextResponse.json({ error: 'format must be csv or pdf' }, { status: 400 })
  }
  if (!['leads', 'funnel', 'channels'].includes(reportType)) {
    return NextResponse.json({ error: 'reportType must be leads, funnel or channels' }, { status: 400 })
  }
  if (!['7d', '30d', 'all'].includes(dateRange)) {
    return NextResponse.json({ error: 'dateRange must be 7d, 30d or all' }, { status: 400 })
  }

  // PDF mock response
  if (format === 'pdf') {
    return NextResponse.json({
      isMockPdf: true,
      message: 'PDF-Export: Wird nach jsPDF-Integration verfügbar',
      reportType,
      dateRange,
    })
  }

  // CSV generation
  const cutoff = getDateCutoff(dateRange)

  let rawLeads: Array<{ id: string; name: string; email: string | null; phone: string | null; source: string; status: string; value: number | null; createdAt: Date | string }>

  try {
    const where: Record<string, unknown> = { userId }
    if (cutoff) {
      where.createdAt = { gte: cutoff }
    }
    const dbLeads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, phone: true, source: true, status: true, value: true, createdAt: true },
    })

    if (dbLeads.length > 0) {
      rawLeads = dbLeads
    } else {
      // Mock fallback
      rawLeads = cutoff
        ? MOCK_LEADS.filter((l) => new Date(l.createdAt) >= cutoff)
        : MOCK_LEADS
    }
  } catch {
    rawLeads = cutoff
      ? MOCK_LEADS.filter((l) => new Date(l.createdAt) >= cutoff)
      : MOCK_LEADS
  }

  let csvContent: string
  let filename: string

  if (reportType === 'leads') {
    csvContent = buildLeadsCsv(rawLeads)
    filename = `leads-export-${dateRange}.csv`
  } else if (reportType === 'funnel') {
    csvContent = buildFunnelCsv(rawLeads)
    filename = `funnel-export-${dateRange}.csv`
  } else {
    csvContent = buildChannelsCsv(rawLeads)
    filename = `channels-export-${dateRange}.csv`
  }

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=${filename}`,
    },
  })
}
