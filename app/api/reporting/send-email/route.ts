/**
 * Report Email Send API
 *
 * POST /api/reporting/send-email
 * Body: { to: string, reportType: 'leads' | 'funnel' | 'channels', dateRange: '7d' | '30d' | 'all', format: 'csv' | 'pdf' }
 *
 * Sends a report via SMTP using nodemailer.
 * Requires env vars: REPORT_SMTP_HOST, REPORT_SMTP_PORT, REPORT_SMTP_USER, REPORT_SMTP_PASS, REPORT_FROM_EMAIL, REPORT_FROM_NAME
 * Falls back to mock mode if env vars are missing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/user-context'
import nodemailer from 'nodemailer'

const SMTP_HOST  = process.env.REPORT_SMTP_HOST  ?? ''
const SMTP_PORT  = parseInt(process.env.REPORT_SMTP_PORT ?? '587', 10)
const SMTP_USER  = process.env.REPORT_SMTP_USER  ?? ''
const SMTP_PASS  = process.env.REPORT_SMTP_PASS  ?? ''
const FROM_EMAIL = process.env.REPORT_FROM_EMAIL ?? 'reports@vemo.ch'
const FROM_NAME  = process.env.REPORT_FROM_NAME  ?? 'VEMO Automationszentrale'

function isSmtpConfigured(): boolean {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)
}

async function fetchReportBuffer(reportType: string, dateRange: string, format: string, baseUrl: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const res = await fetch(`${baseUrl}/api/reporting/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, reportType, dateRange }),
  })
  if (!res.ok) throw new Error(`Export API returned ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const ext = format === 'pdf' ? 'pdf' : 'csv'
  const dateStr = new Date().toISOString().slice(0, 10)
  return {
    buffer:      buf,
    contentType: format === 'pdf' ? 'application/pdf' : 'text/csv',
    filename:    `vemo-report-${reportType}-${dateRange}-${dateStr}.${ext}`,
  }
}

function buildHtmlBody(reportType: string, dateRange: string, format: string): string {
  const rangeLabel = dateRange === '7d' ? 'letzte 7 Tage' : dateRange === '30d' ? 'letzte 30 Tage' : 'alle Daten'
  const typeLabel  = reportType === 'leads' ? 'Lead-Report' : reportType === 'funnel' ? 'Funnel-Report' : 'Kanal-Report'
  const dateStr    = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>VEMO Report</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:32px 0;">
    <tr><td>
      <table width="600" cellpadding="0" cellspacing="0" align="center" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#282f47;padding:28px 36px;">
          <span style="color:#7ed957;font-size:24px;font-weight:bold;letter-spacing:-0.5px;">VEMO</span>
          <span style="color:white;font-size:13px;margin-left:10px;opacity:0.8;">Automationszentrale</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#282f47;">${typeLabel}</h1>
          <p style="margin:0 0 24px;color:#666;font-size:14px;">Zeitraum: ${rangeLabel}  •  Erstellt am ${dateStr}</p>
          <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Im Anhang findest du deinen automatisch generierten <strong>${typeLabel}</strong> als ${format.toUpperCase()}-Datei.<br>
            Der Report enthält Executive-Summary, Top-Leads, Funnel-Analyse, Channel-ROI und Revenue-Forecast.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td style="background:#7ed957;border-radius:6px;padding:12px 24px;">
            <a href="https://app.vemo.ch/reports" style="color:#282f47;font-weight:bold;font-size:14px;text-decoration:none;">📊 Reports öffnen</a>
          </td></tr></table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#282f47;padding:18px 36px;text-align:center;">
          <p style="margin:0;color:#7ed957;font-size:11px;font-weight:bold;">VEMO Automationszentrale</p>
          <p style="margin:4px 0 0;color:#888;font-size:10px;">app.vemo.ch  •  Automatischer Report-Service</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request)
  void userId

  let body: { to?: string; reportType?: string; dateRange?: string; format?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const to         = body.to         ?? ''
  const reportType = body.reportType ?? 'leads'
  const dateRange  = body.dateRange  ?? '30d'
  const format     = body.format     ?? 'pdf'

  if (!to || !to.includes('@'))
    return NextResponse.json({ error: 'Gültige E-Mail-Adresse erforderlich' }, { status: 400 })
  if (!['leads', 'funnel', 'channels'].includes(reportType))
    return NextResponse.json({ error: 'reportType must be leads, funnel or channels' }, { status: 400 })
  if (!['7d', '30d', 'all'].includes(dateRange))
    return NextResponse.json({ error: 'dateRange must be 7d, 30d or all' }, { status: 400 })
  if (!['csv', 'pdf'].includes(format))
    return NextResponse.json({ error: 'format must be csv or pdf' }, { status: 400 })

  // Mock mode — SMTP not configured
  if (!isSmtpConfigured()) {
    return NextResponse.json({
      success:  true,
      isMock:   true,
      to,
      message:  'E-Mail-Versand im Mock-Modus. Konfiguriere REPORT_SMTP_HOST, REPORT_SMTP_USER und REPORT_SMTP_PASS in den Umgebungsvariablen.',
    })
  }

  // Fetch report attachment
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`
  let attachment: { buffer: Buffer; contentType: string; filename: string }
  try {
    attachment = await fetchReportBuffer(reportType, dateRange, format, baseUrl)
  } catch (err) {
    console.error('Report fetch error:', err)
    return NextResponse.json({ error: 'Report konnte nicht generiert werden' }, { status: 500 })
  }

  // Send email
  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  })

  const typeLabel = reportType === 'leads' ? 'Lead-Report' : reportType === 'funnel' ? 'Funnel-Report' : 'Kanal-Report'
  const dateLabel = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })

  try {
    const info = await transporter.sendMail({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject: `📊 ${typeLabel} — ${dateLabel}`,
      html:    buildHtmlBody(reportType, dateRange, format),
      attachments: [{
        filename: attachment.filename,
        content:  attachment.buffer,
        contentType: attachment.contentType,
      }],
    })

    return NextResponse.json({ success: true, isMock: false, messageId: info.messageId, to })
  } catch (err) {
    console.error('SMTP send error:', err)
    return NextResponse.json({ error: 'E-Mail-Versand fehlgeschlagen. SMTP-Verbindung prüfen.' }, { status: 500 })
  }
}
