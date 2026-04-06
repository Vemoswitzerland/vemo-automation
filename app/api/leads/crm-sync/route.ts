/**
 * CRM Sync API — /api/leads/crm-sync
 *
 * GET  → returns last sync status + CRM provider info
 * POST → triggers a manual CRM sync (used by cron + admin UI)
 *
 * Query params for POST:
 *   ?since=ISO8601   — only sync records updated after this timestamp
 *   ?full=true       — full sync (no date filter)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createCrmSyncClient, runCrmSync, CRM_PROVIDER } from '@/lib/leads/crm-sync'

// In-memory last sync state (reset on server restart — use DB in production)
let lastSyncResult: {
  syncedAt: string
  provider: string
  contactsAdded: number
  contactsUpdated: number
  interactionsSynced: number
  conversionsSynced: number
  conflictCount: number
  isMock: boolean
} | null = null

// ─── GET — sync status ───────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    provider: CRM_PROVIDER,
    isMock: CRM_PROVIDER === 'mock',
    lastSync: lastSyncResult ?? null,
    config: {
      hubspot: !!process.env.HUBSPOT_API_TOKEN,
      pipedrive: !!process.env.PIPEDRIVE_API_TOKEN,
      airtable: !!(process.env.AIRTABLE_API_TOKEN && process.env.AIRTABLE_BASE_ID),
    },
    nextScheduledSync: '02:00 UTC (täglich)',
  })
}

// ─── POST — trigger sync ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sinceParam = searchParams.get('since')
  const isFull = searchParams.get('full') === 'true'

  let since: Date | undefined
  if (!isFull && sinceParam) {
    since = new Date(sinceParam)
    if (isNaN(since.getTime())) {
      return NextResponse.json({ error: 'Invalid "since" date' }, { status: 400 })
    }
  } else if (!isFull && lastSyncResult?.syncedAt) {
    since = new Date(lastSyncResult.syncedAt)
  }

  try {
    const client = createCrmSyncClient()
    const result = await runCrmSync(client, since)

    lastSyncResult = {
      syncedAt: result.syncedAt.toISOString(),
      provider: result.provider,
      contactsAdded: result.contactsAdded,
      contactsUpdated: result.contactsUpdated,
      interactionsSynced: result.interactionsSynced,
      conversionsSynced: result.conversionsSynced,
      conflictCount: result.conflicts.length,
      isMock: result.isMock,
    }

    return NextResponse.json({
      ...lastSyncResult,
      conflicts: result.conflicts,
    })
  } catch (err) {
    console.error('[crm-sync] Sync failed:', err)
    return NextResponse.json({ error: 'CRM sync failed', details: String(err) }, { status: 500 })
  }
}
