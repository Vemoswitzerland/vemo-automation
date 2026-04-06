/**
 * Reporting Export API
 *
 * POST /api/reporting/export
 * Body: { format: 'csv' | 'pdf', reportType: 'leads' | 'funnel' | 'channels', dateRange: '7d' | '30d' | 'all' }
 *
 * CSV: Real data from Prisma Lead table with mock fallback
 * PDF: Full branded PDF with Executive Summary, Top Leads, Funnel, Channel ROI, Forecast
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'
import PDFDocument from 'pdfkit'

// ── Vemo Brand Colors ─────────────────────────────────────────────────
const GRN = [126, 217, 87] as const   // #7ed957
const DRK = [40,  47,  71] as const   // #282f47

// ── Mock Data ─────────────────────────────────────────────────────────
const MOCK_LEADS = [
  { id: 'mock-1', name: 'Anna Müller',      email: 'anna@beispiel.ch',  phone: '+41 79 123 45 67', source: 'instagram',  status: 'new',       value: 490,  createdAt: new Date(Date.now() - 5  * 86400000).toISOString() },
  { id: 'mock-2', name: 'Thomas Keller',    email: 'thomas@beispiel.ch', phone: '+41 78 987 65 43', source: 'facebook',   status: 'qualified', value: 890,  createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'mock-3', name: 'Sara Meier',       email: 'sara@beispiel.ch',  phone: null,               source: 'google_ads', status: 'contacted', value: 290,  createdAt: new Date(Date.now() - 7  * 86400000).toISOString() },
  { id: 'mock-4', name: 'Martin Weber',     email: 'martin@beispiel.ch', phone: '+41 76 555 12 34', source: 'referral',   status: 'converted', value: 1290, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'mock-5', name: 'Lisa Brunner',     email: 'lisa@beispiel.ch',  phone: '+41 79 444 56 78', source: 'instagram',  status: 'new',       value: 390,  createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: 'mock-6', name: 'Lukas Zimmermann', email: 'lukas@firma.ch',    phone: '+41 77 321 09 87', source: 'referral',   status: 'qualified', value: 2490, createdAt: new Date(Date.now() - 3  * 86400000).toISOString() },
  { id: 'mock-7', name: 'Maria Schneider',  email: 'maria@beispiel.ch', phone: null,               source: 'google_ads', status: 'lost',      value: 190,  createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'mock-8', name: 'Peter Huber',      email: 'peter@beispiel.ch', phone: '+41 76 111 22 33', source: 'facebook',   status: 'contacted', value: 690,  createdAt: new Date(Date.now() - 8  * 86400000).toISOString() },
]

type RawLead = { id: string; name: string; email: string | null; phone: string | null; source: string; status: string; value: number | null; createdAt: string | Date }

// ── Helpers ─────────────────────────────────────────────────────────────
function getDateCutoff(dateRange: string): Date | null {
  if (dateRange === '7d')  return new Date(Date.now() - 7  * 86400000)
  if (dateRange === '30d') return new Date(Date.now() - 30 * 86400000)
  return null
}

function escapeCsvField(v: string | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s
}

function buildLeadsCsv(leads: RawLead[]): string {
  const h = ['ID', 'Name', 'E-Mail', 'Telefon', 'Quelle', 'Status', 'Wert (CHF)', 'Erstellt am']
  const r = leads.map((l) => [l.id, l.name, l.email, l.phone, l.source, l.status, l.value ?? '', new Date(l.createdAt).toLocaleDateString('de-CH')].map(v => escapeCsvField(String(v ?? ''))))
  return [h.join(','), ...r.map((row) => row.join(','))].join('\r\n')
}

function buildFunnelCsv(leads: RawLead[]): string {
  const stages = ['new', 'qualified', 'contacted', 'converted', 'lost']
  const h = ['Status', 'Anzahl Leads', 'Gesamtwert (CHF)']
  const r = stages.map((s) => { const sl = leads.filter(l => l.status === s); return [s, sl.length, sl.reduce((sum, l) => sum + (l.value ?? 0), 0)].map(String) })
  return [h.join(','), ...r.map(row => row.join(','))].join('\r\n')
}

function buildChannelsCsv(leads: RawLead[]): string {
  const sources = ['instagram', 'facebook', 'google_ads', 'referral']
  const h = ['Kanal', 'Anzahl Leads', 'Konvertiert', 'Gesamtwert (CHF)']
  const r = sources.map((src) => { const sl = leads.filter(l => l.source === src); if (!sl.length) return null; return [src, sl.length, sl.filter(l => l.status === 'converted').length, sl.reduce((s, l) => s + (l.value ?? 0), 0)].map(String) }).filter(Boolean) as string[][]
  return [h.join(','), ...r.map(row => row.join(','))].join('\r\n')
}

// ── PDF Generator ──────────────────────────────────────────────────────
async function generatePdf(leads: RawLead[], reportType: string, dateRange: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data',  (c: Buffer) => chunks.push(c))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W         = doc.page.width - 100
    const dateLabel = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const rangeLabel = dateRange === '7d' ? 'Letzte 7 Tage' : dateRange === '30d' ? 'Letzte 30 Tage' : 'Alle Daten'
    const rgb        = (c: readonly [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`

    // Header bar
    doc.rect(0, 0, doc.page.width, 78).fill(rgb(DRK))
    doc.fillColor(rgb(GRN)).fontSize(22).font('Helvetica-Bold').text('VEMO', 50, 20)
    doc.fillColor('white').fontSize(10).font('Helvetica').text('Automationszentrale', 50, 46)
    doc.fillColor('white').fontSize(9).text(`Report: ${dateLabel}`, 0, 28, { align: 'right', width: doc.page.width - 50 })
    doc.fillColor('#aed97c').fontSize(9).text(rangeLabel, 0, 42, { align: 'right', width: doc.page.width - 50 })
    doc.y = 100

    // Title
    const titles: Record<string, string> = { leads: 'Lead-Report — Executive Summary', funnel: 'Funnel-Report — Konversionsanalyse', channels: 'Kanal-Report — Channel ROI' }
    doc.fillColor(rgb(DRK)).fontSize(17).font('Helvetica-Bold').text(titles[reportType] ?? 'Report', 50, doc.y, { width: W })
    doc.moveDown(0.3)
    doc.rect(50, doc.y, W, 2).fill(rgb(GRN))
    doc.moveDown(1)

    // KPIs
    const total     = leads.length
    const converted = leads.filter(l => l.status === 'converted').length
    const qualified = leads.filter(l => l.status === 'qualified').length
    const newLeads  = leads.filter(l => l.status === 'new').length
    const convRate  = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0'
    const totalVal  = leads.reduce((s, l) => s + (l.value ?? 0), 0)
    const avgVal    = total > 0 ? Math.round(totalVal / total) : 0

    const kpiY = doc.y
    const kpis = [
      { label: 'Total Leads',    value: String(total) },
      { label: 'Conversion Rate', value: `${convRate}%` },
      { label: 'Gesamtwert',     value: `CHF ${totalVal.toLocaleString('de-CH')}` },
      { label: 'Ø Lead-Wert',    value: `CHF ${avgVal.toLocaleString('de-CH')}` },
    ]
    const cW = (W - 10) / 2, cH = 58
    kpis.forEach((k, i) => {
      const x = 50 + (i % 2) * (cW + 10), y = kpiY + Math.floor(i / 2) * (cH + 8)
      doc.rect(x, y, cW, cH).fill('#f5f7fa')
      doc.rect(x, y, 4, cH).fill(rgb(GRN))
      doc.fillColor('#888').fontSize(8).font('Helvetica').text(k.label.toUpperCase(), x + 10, y + 10, { width: cW - 14 })
      doc.fillColor(rgb(DRK)).fontSize(17).font('Helvetica-Bold').text(k.value, x + 10, y + 24, { width: cW - 14 })
    })
    doc.y = kpiY + 2 * (cH + 8) + 12
    doc.moveDown(0.5)

    // Top Leads table
    const topLeads = [...leads].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 8)
    if (topLeads.length > 0) {
      doc.fillColor(rgb(DRK)).fontSize(12).font('Helvetica-Bold').text('Top Leads', 50, doc.y)
      doc.moveDown(0.4)
      const cws = [165, 90, 80, 90, 80]
      const ths = ['Name', 'Quelle', 'Status', 'Wert (CHF)', 'Erstellt']
      let ty = doc.y
      doc.rect(50, ty, W, 17).fill(rgb(DRK))
      let cx = 56
      ths.forEach((t, i) => { doc.fillColor('white').fontSize(8).font('Helvetica-Bold').text(t, cx, ty + 5, { width: cws[i] - 4, lineBreak: false }); cx += cws[i] })
      ty += 17
      topLeads.forEach((lead, idx) => {
        doc.rect(50, ty, W, 15).fill(idx % 2 === 0 ? 'white' : '#f9fafb')
        const cells = [lead.name, lead.source.replace('_', ' '), lead.status, lead.value != null ? lead.value.toLocaleString('de-CH') : '—', new Date(lead.createdAt).toLocaleDateString('de-CH')]
        cx = 56
        cells.forEach((cell, i) => { doc.fillColor(rgb(DRK)).fontSize(8).font('Helvetica').text(String(cell), cx, ty + 4, { width: cws[i] - 4, lineBreak: false }); cx += cws[i] })
        ty += 15
      })
      doc.y = ty + 12
      doc.moveDown(0.5)
    }

    // Funnel
    const stages = [{ k: 'new', l: 'Neu' }, { k: 'qualified', l: 'Qualifiziert' }, { k: 'contacted', l: 'Kontaktiert' }, { k: 'converted', l: 'Konvertiert' }, { k: 'lost', l: 'Verloren' }]
    const funnelData = stages.map(s => ({ ...s, count: leads.filter(l => l.status === s.k).length, val: leads.filter(l => l.status === s.k).reduce((sum, l) => sum + (l.value ?? 0), 0) }))
    const fMax = Math.max(...funnelData.map(f => f.count), 1)

    doc.fillColor(rgb(DRK)).fontSize(12).font('Helvetica-Bold').text('Sales Funnel', 50, doc.y)
    doc.moveDown(0.4)
    funnelData.forEach(stage => {
      const bW = Math.max((stage.count / fMax) * (W - 130), 4)
      const y  = doc.y
      doc.fillColor('#555').fontSize(8).font('Helvetica').text(stage.l, 50, y + 3, { width: 80 })
      doc.rect(135, y, bW, 13).fill(rgb(GRN))
      doc.fillColor(rgb(DRK)).fontSize(8).text(`${stage.count} Leads  •  CHF ${stage.val.toLocaleString('de-CH')}`, 135 + bW + 6, y + 3)
      doc.y = y + 19
    })
    doc.moveDown(1)

    // Channel ROI
    const channels = ['instagram', 'facebook', 'google_ads', 'referral']
    const chData = channels.map(src => {
      const sl = leads.filter(l => l.source === src), conv = sl.filter(l => l.status === 'converted')
      return { name: src.replace('_', ' '), leads: sl.length, conv: conv.length, rate: sl.length > 0 ? ((conv.length / sl.length) * 100).toFixed(1) : '0.0', rev: conv.reduce((s, l) => s + (l.value ?? 0), 0) }
    }).filter(c => c.leads > 0)

    if (chData.length > 0) {
      doc.fillColor(rgb(DRK)).fontSize(12).font('Helvetica-Bold').text('Channel ROI', 50, doc.y)
      doc.moveDown(0.4)
      const chCols = [120, 65, 65, 80, 100]
      const chHdr  = ['Kanal', 'Leads', 'Konv.', 'Rate', 'Revenue (CHF)']
      let cy = doc.y
      doc.rect(50, cy, W, 16).fill(rgb(DRK))
      let cx2 = 56
      chHdr.forEach((c, i) => { doc.fillColor('white').fontSize(8).font('Helvetica-Bold').text(c, cx2, cy + 4, { width: chCols[i] - 4, lineBreak: false }); cx2 += chCols[i] })
      cy += 16
      chData.forEach((ch, idx) => {
        doc.rect(50, cy, W, 15).fill(idx % 2 === 0 ? 'white' : '#f9fafb')
        const cells = [ch.name, String(ch.leads), String(ch.conv), `${ch.rate}%`, ch.rev.toLocaleString('de-CH')]
        cx2 = 56
        cells.forEach((cell, i) => { doc.fillColor(rgb(DRK)).fontSize(8).font('Helvetica').text(cell, cx2, cy + 4, { width: chCols[i] - 4, lineBreak: false }); cx2 += chCols[i] })
        cy += 15
      })
      doc.y = cy + 12
      doc.moveDown(0.5)
    }

    // Revenue Forecast
    const pipeVal   = leads.filter(l => !['converted', 'lost'].includes(l.status)).reduce((s, l) => s + (l.value ?? 0), 0)
    const winRate   = total > 0 ? converted / total : 0.1
    const fcLo      = Math.round(pipeVal * winRate * 0.8)
    const fcHi      = Math.round(pipeVal * winRate * 1.2)

    doc.fillColor(rgb(DRK)).fontSize(12).font('Helvetica-Bold').text('Revenue Forecast', 50, doc.y)
    doc.moveDown(0.4)
    const fcY  = doc.y
    const fcW2 = (W - 15) / 4
    const fcCards = [
      { label: 'Pipeline-Wert',    value: `CHF ${pipeVal.toLocaleString('de-CH')}` },
      { label: 'Forecast (tief)',  value: `CHF ${fcLo.toLocaleString('de-CH')}` },
      { label: 'Forecast (hoch)',  value: `CHF ${fcHi.toLocaleString('de-CH')}` },
      { label: 'Win-Rate',         value: `${(winRate * 100).toFixed(1)}%` },
    ]
    fcCards.forEach((card, i) => {
      const x = 50 + i * (fcW2 + 5)
      doc.rect(x, fcY, fcW2, 46).fill('#f5f7fa')
      doc.rect(x, fcY, 4, 46).fill(rgb(GRN))
      doc.fillColor('#888').fontSize(7).font('Helvetica').text(card.label.toUpperCase(), x + 8, fcY + 8, { width: fcW2 - 12 })
      doc.fillColor(rgb(DRK)).fontSize(10).font('Helvetica-Bold').text(card.value, x + 8, fcY + 22, { width: fcW2 - 12 })
    })
    doc.y = fcY + 58

    // Summary
    doc.moveDown(1)
    const qR = total > 0 ? ((qualified / total) * 100).toFixed(0) : '0'
    const nR = total > 0 ? ((newLeads  / total) * 100).toFixed(0) : '0'
    doc.fillColor(rgb(DRK)).fontSize(8.5).font('Helvetica')
       .text(`Im Zeitraum "${rangeLabel}" wurden ${total} Leads erfasst. ${newLeads} (${nR}%) sind neu, ${qualified} (${qR}%) qualifiziert und ${converted} konvertiert (${convRate}% Conversion Rate). Revenue-Forecast: CHF ${fcLo.toLocaleString('de-CH')} – CHF ${fcHi.toLocaleString('de-CH')}.`, 50, doc.y, { width: W, lineGap: 2 })

    // Footer
    const fY = doc.page.height - 38
    doc.rect(0, fY, doc.page.width, 38).fill(rgb(DRK))
    doc.fillColor(rgb(GRN)).fontSize(7).font('Helvetica-Bold').text('VEMO Automationszentrale', 50, fY + 9)
    doc.fillColor('white').fontSize(7).font('Helvetica').text(`Erstellt am ${dateLabel}  •  Vertraulich`, 50, fY + 21)
    doc.fillColor('#888').fontSize(7).text('app.vemo.ch', 0, fY + 15, { align: 'right', width: doc.page.width - 50 })

    doc.end()
  })
}

// ── Route Handler ──────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const userId = getUserId(request)

  let body: { format?: string; reportType?: string; dateRange?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const format     = body.format     ?? 'csv'
  const reportType = body.reportType ?? 'leads'
  const dateRange  = body.dateRange  ?? '30d'

  if (!['csv', 'pdf'].includes(format))
    return NextResponse.json({ error: 'format must be csv or pdf' }, { status: 400 })
  if (!['leads', 'funnel', 'channels'].includes(reportType))
    return NextResponse.json({ error: 'reportType must be leads, funnel or channels' }, { status: 400 })
  if (!['7d', '30d', 'all'].includes(dateRange))
    return NextResponse.json({ error: 'dateRange must be 7d, 30d or all' }, { status: 400 })

  const cutoff = getDateCutoff(dateRange)

  let rawLeads: RawLead[]
  try {
    const where: Record<string, unknown> = { userId }
    if (cutoff) where.createdAt = { gte: cutoff }
    const dbLeads = await prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, phone: true, source: true, status: true, value: true, createdAt: true } })
    rawLeads = dbLeads.length > 0 ? dbLeads : (cutoff ? MOCK_LEADS.filter(l => new Date(l.createdAt) >= cutoff) : MOCK_LEADS)
  } catch {
    rawLeads = cutoff ? MOCK_LEADS.filter(l => new Date(l.createdAt) >= cutoff) : MOCK_LEADS
  }

  if (format === 'pdf') {
    try {
      const buf      = await generatePdf(rawLeads, reportType, dateRange)
      const filename = `vemo-report-${reportType}-${dateRange}-${new Date().toISOString().slice(0, 10)}.pdf`
      return new NextResponse(new Uint8Array(buf), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"` } })
    } catch (err) {
      console.error('PDF generation error:', err)
      return NextResponse.json({ error: 'PDF-Generierung fehlgeschlagen' }, { status: 500 })
    }
  }

  let csvContent: string, filename: string
  if (reportType === 'leads') {
    csvContent = buildLeadsCsv(rawLeads); filename = `leads-export-${dateRange}.csv`
  } else if (reportType === 'funnel') {
    csvContent = buildFunnelCsv(rawLeads); filename = `funnel-export-${dateRange}.csv`
  } else {
    csvContent = buildChannelsCsv(rawLeads); filename = `channels-export-${dateRange}.csv`
  }

  return new NextResponse(csvContent, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename=${filename}` } })
}
