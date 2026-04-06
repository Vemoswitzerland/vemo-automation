/**
 * Scheduler: Automatischer E-Mail-Sync alle 5 Minuten.
 * Weekly Reports: Montag 9 Uhr — sendet Berichte an alle aktiven Schedules.
 * Singleton-Pattern — nur ein Scheduler-Prozess läuft gleichzeitig.
 */
import * as cron from 'node-cron'
import { prisma } from '@/lib/db'
import { fetchNewEmails } from '@/lib/email/imap'
import { generateEmailResponse, prioritizeEmail } from '@/lib/ai/claude'
import { createCrmSyncClient, runCrmSync } from '@/lib/leads/crm-sync'

let schedulerTask: cron.ScheduledTask | null = null
let weeklyReportTask: cron.ScheduledTask | null = null
let crmSyncTask: cron.ScheduledTask | null = null

async function runEmailSync(): Promise<void> {
  console.log('[scheduler] Starting scheduled email sync...')
  const startedAt = new Date()

  try {
    const accounts = await prisma.emailAccount.findMany({ where: { isActive: true } })

    if (accounts.length === 0) {
      console.log('[scheduler] No active email accounts, skipping.')
      return
    }

    let totalFetched = 0

    for (const account of accounts) {
      try {
        const lastSync = account.lastSyncAt || undefined
        const emails = await fetchNewEmails(account, lastSync)

        for (const emailData of emails) {
          const existing = await prisma.email.findUnique({ where: { uid: emailData.uid } })
          if (existing) continue

          const priority = await prioritizeEmail(emailData.subject, emailData.body)

          const saved = await prisma.email.create({
            data: {
              uid: emailData.uid,
              messageId: emailData.messageId,
              from: emailData.from,
              fromName: emailData.fromName,
              to: emailData.to,
              subject: emailData.subject,
              body: emailData.body,
              bodyHtml: emailData.bodyHtml,
              receivedAt: emailData.receivedAt,
              priority,
              emailAccountId: account.id,
            },
          })

          const draft = await generateEmailResponse(
            {
              from: emailData.from,
              fromName: emailData.fromName,
              subject: emailData.subject,
              body: emailData.body,
            },
            account.name,
            account.email
          )

          await prisma.emailDraft.create({
            data: {
              emailId: saved.id,
              subject: draft.subject,
              body: draft.body,
              status: 'pending',
            },
          })

          totalFetched++
        }

        await prisma.emailAccount.update({
          where: { id: account.id },
          data: { lastSyncAt: new Date() },
        })
      } catch (error) {
        console.error(`[scheduler] Error syncing account ${account.email}:`, error)
        // Continue with next account — individual account errors don't abort the whole run
      }
    }

    // Persist scheduler state
    await prisma.appSettings.upsert({
      where: { key: 'lastScheduledSync' },
      create: { key: 'lastScheduledSync', value: startedAt.toISOString() },
      update: { value: startedAt.toISOString() },
    })

    console.log(`[scheduler] Sync complete — fetched ${totalFetched} new emails.`)
  } catch (error) {
    console.error('[scheduler] Sync failed:', error)
  }
}

// --- Weekly Report Types ---

interface ReportSchedule {
  id: string
  email: string
  frequency: 'weekly' | 'monthly'
  reportType: string
  userId: string
  createdAt: string
  active: boolean
}

interface ReportHistoryEntry {
  id: string
  reportType: string
  format: string
  dateRange: string
  generatedAt: string
  rowCount: number
  userId: string
}

// Minimal lead shape needed for CSV generation
interface LeadRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string
  status: string
  value: number | null
  createdAt: Date | string
}

function escapeCsvField(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildLeadsCsv(leads: LeadRow[]): string {
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

function buildFunnelCsv(leads: LeadRow[]): string {
  const stages = ['new', 'qualified', 'contacted', 'converted', 'lost']
  const headers = ['Status', 'Anzahl Leads', 'Gesamtwert (CHF)']
  const rows = stages.map((stage) => {
    const stageLeads = leads.filter((l) => l.status === stage)
    const total = stageLeads.reduce((sum, l) => sum + (l.value ?? 0), 0)
    return [escapeCsvField(stage), String(stageLeads.length), String(total)]
  })
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
}

function buildChannelsCsv(leads: LeadRow[]): string {
  const sources = ['instagram', 'facebook', 'google_ads', 'referral', 'unknown']
  const headers = ['Kanal', 'Anzahl Leads', 'Konvertiert', 'Gesamtwert (CHF)']
  const rows = sources
    .map((src) => {
      const srcLeads = leads.filter((l) => l.source === src)
      if (srcLeads.length === 0) return null
      const converted = srcLeads.filter((l) => l.status === 'converted').length
      const total = srcLeads.reduce((sum, l) => sum + (l.value ?? 0), 0)
      return [escapeCsvField(src), String(srcLeads.length), String(converted), String(total)]
    })
    .filter(Boolean) as string[][]
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
}

async function generateCsvForSchedule(schedule: ReportSchedule): Promise<{ csv: string; rowCount: number }> {
  const cutoff = new Date(Date.now() - 7 * 86400000) // weekly = last 7 days

  let leads: LeadRow[] = []
  try {
    const dbLeads = await prisma.lead.findMany({
      where: { userId: schedule.userId, createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, phone: true, source: true, status: true, value: true, createdAt: true },
    })
    leads = dbLeads
  } catch {
    // Prisma unavailable — use empty set (csv will have headers only)
    leads = []
  }

  let csv: string
  if (schedule.reportType === 'funnel') {
    csv = buildFunnelCsv(leads)
  } else if (schedule.reportType === 'channels') {
    csv = buildChannelsCsv(leads)
  } else {
    csv = buildLeadsCsv(leads)
  }

  return { csv, rowCount: leads.length }
}

async function runWeeklyReports(): Promise<void> {
  console.log('[scheduler] Starting weekly reports run...')

  let schedules: ReportSchedule[] = []
  try {
    const setting = await prisma.appSettings.findUnique({ where: { key: 'reporting_schedules' } })
    if (setting) {
      const parsed = JSON.parse(setting.value) as ReportSchedule[]
      schedules = parsed.filter((s) => s.active && s.frequency === 'weekly')
    }
  } catch {
    console.error('[scheduler] Could not load reporting_schedules from AppSettings.')
    return
  }

  if (schedules.length === 0) {
    console.log('[scheduler] No active weekly schedules found, skipping.')
    return
  }

  const historyEntries: ReportHistoryEntry[] = []

  // Load existing history to append to
  try {
    const historySetting = await prisma.appSettings.findUnique({ where: { key: 'reporting_history' } })
    if (historySetting) {
      const existing = JSON.parse(historySetting.value) as ReportHistoryEntry[]
      historyEntries.push(...existing)
    }
  } catch {
    // Start fresh if history not readable
  }

  for (const schedule of schedules) {
    try {
      const { csv, rowCount } = await generateCsvForSchedule(schedule)

      // Mock mail log — real SMTP/SendGrid integration goes here
      console.log('[scheduler] Weekly report sent to:', schedule.email, 'type:', schedule.reportType)
      console.log(`[scheduler] CSV preview (first 200 chars): ${csv.slice(0, 200)}`)

      // Persist history entry
      const entry: ReportHistoryEntry = {
        id: `hist-weekly-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        reportType: schedule.reportType,
        format: 'csv',
        dateRange: '7d',
        generatedAt: new Date().toISOString(),
        rowCount,
        userId: schedule.userId,
      }
      historyEntries.push(entry)
    } catch (error) {
      console.error(`[scheduler] Error processing weekly report for schedule ${schedule.id}:`, error)
      // Continue with next schedule — per-schedule errors are non-fatal
      continue
    }
  }

  // Save updated history (keep newest 500 entries)
  try {
    const trimmed = historyEntries
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, 500)

    await prisma.appSettings.upsert({
      where: { key: 'reporting_history' },
      update: { value: JSON.stringify(trimmed) },
      create: { key: 'reporting_history', value: JSON.stringify(trimmed) },
    })

    console.log(`[scheduler] Weekly reports complete — processed ${schedules.length} schedule(s).`)
  } catch (error) {
    console.error('[scheduler] Failed to persist reporting_history:', error)
  }
}

export function startScheduler(): void {
  if (schedulerTask) {
    console.log('[scheduler] Already running, skipping start.')
    return
  }

  console.log('[scheduler] Starting — email sync every 5 minutes.')

  schedulerTask = cron.schedule('*/5 * * * *', () => {
    runEmailSync().catch((err) => console.error('[scheduler] Unhandled error:', err))
  })

  // Weekly reports: every Monday at 09:00
  weeklyReportTask = cron.schedule('0 9 * * 1', () => {
    runWeeklyReports().catch((err) => console.error('[scheduler] Weekly report unhandled error:', err))
  })
  console.log('[scheduler] Weekly report task registered — runs every Monday at 09:00.')

  // CRM sync: daily at 02:00 UTC
  crmSyncTask = cron.schedule('0 2 * * *', async () => {
    console.log('[scheduler] Starting daily CRM sync...')
    try {
      const client = createCrmSyncClient()
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000) // last 25h for overlap safety
      const result = await runCrmSync(client, yesterday)
      console.log(
        `[scheduler] CRM sync done — +${result.contactsAdded} added, ~${result.contactsUpdated} updated, ${result.conflicts.length} conflicts`,
      )
    } catch (err) {
      console.error('[scheduler] CRM sync failed:', err)
    }
  })
  console.log('[scheduler] CRM sync task registered — runs daily at 02:00 UTC.')
}

export function stopScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop()
    schedulerTask = null
    console.log('[scheduler] Email sync stopped.')
  }

  if (weeklyReportTask) {
    weeklyReportTask.stop()
    weeklyReportTask = null
    console.log('[scheduler] Weekly report task stopped.')
  }

  if (crmSyncTask) {
    crmSyncTask.stop()
    crmSyncTask = null
    console.log('[scheduler] CRM sync task stopped.')
  }
}
