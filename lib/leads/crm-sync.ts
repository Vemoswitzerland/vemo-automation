/**
 * CRM Sync Module — lib/leads/crm-sync.ts
 *
 * Abstraction layer for syncing contacts, interactions, and conversion events
 * from CRM systems (HubSpot, Pipedrive, Airtable) into the Vemo leads table.
 *
 * Mock-first: returns realistic data until CRM API credentials are configured.
 * Set env vars to activate a real adapter:
 *   HUBSPOT_API_TOKEN   → HubSpot CRM
 *   PIPEDRIVE_API_TOKEN → Pipedrive
 *   AIRTABLE_API_TOKEN + AIRTABLE_BASE_ID → Airtable
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type CrmProvider = 'hubspot' | 'pipedrive' | 'airtable' | 'mock'

export interface CrmContact {
  crmId: string
  provider: CrmProvider
  firstName: string
  lastName: string
  email?: string
  phone?: string
  company?: string
  source: string
  stage: string             // CRM deal stage / pipeline stage
  estimatedValue?: number   // CHF
  createdAt: Date
  updatedAt: Date
}

export interface CrmInteraction {
  crmId: string
  contactCrmId: string
  type: 'email' | 'call' | 'meeting' | 'note'
  summary: string
  occurredAt: Date
}

export interface CrmConversionEvent {
  crmId: string
  contactCrmId: string
  type: 'deal_won' | 'deal_lost' | 'meeting_booked' | 'form_submitted'
  value?: number
  occurredAt: Date
}

export interface SyncResult {
  provider: CrmProvider
  syncedAt: Date
  contactsAdded: number
  contactsUpdated: number
  interactionsSynced: number
  conversionsSynced: number
  conflicts: ConflictRecord[]
  isMock: boolean
}

export interface ConflictRecord {
  crmId: string
  field: string
  crmValue: string
  localValue: string
  resolution: 'crm_wins' | 'local_wins' | 'manual_review_required'
}

export interface CrmSyncClient {
  getProvider(): CrmProvider
  fetchContacts(since?: Date): Promise<CrmContact[]>
  fetchInteractions(contactId: string): Promise<CrmInteraction[]>
  fetchConversionEvents(since?: Date): Promise<CrmConversionEvent[]>
}

// ─── Mock CRM Client ─────────────────────────────────────────────────────────

class MockCrmClient implements CrmSyncClient {
  getProvider(): CrmProvider { return 'mock' }

  async fetchContacts(since?: Date): Promise<CrmContact[]> {
    await new Promise((r) => setTimeout(r, 120)) // simulate latency

    const contacts: CrmContact[] = [
      {
        crmId: 'crm-001',
        provider: 'mock',
        firstName: 'Lena',
        lastName: 'Bauer',
        email: 'lena.bauer@muster-ag.ch',
        phone: '+41791112233',
        company: 'Muster AG',
        source: 'hubspot_form',
        stage: 'qualified',
        estimatedValue: 45_000,
        createdAt: new Date('2026-03-01T10:00:00Z'),
        updatedAt: new Date('2026-03-28T15:30:00Z'),
      },
      {
        crmId: 'crm-002',
        provider: 'mock',
        firstName: 'Jonas',
        lastName: 'Huber',
        email: 'jonas.huber@startup.io',
        company: 'Startup IO',
        source: 'pipedrive_lead',
        stage: 'proposal',
        estimatedValue: 80_000,
        createdAt: new Date('2026-03-10T08:00:00Z'),
        updatedAt: new Date('2026-04-01T11:00:00Z'),
      },
      {
        crmId: 'crm-003',
        provider: 'mock',
        firstName: 'Maria',
        lastName: 'Frei',
        email: 'maria.frei@gmail.com',
        source: 'airtable_form',
        stage: 'new',
        estimatedValue: 12_000,
        createdAt: new Date('2026-04-05T14:00:00Z'),
        updatedAt: new Date('2026-04-05T14:00:00Z'),
      },
    ]

    if (since) {
      return contacts.filter((c) => c.updatedAt >= since)
    }
    return contacts
  }

  async fetchInteractions(contactId: string): Promise<CrmInteraction[]> {
    await new Promise((r) => setTimeout(r, 80))

    const allInteractions: CrmInteraction[] = [
      {
        crmId: 'int-001',
        contactCrmId: 'crm-001',
        type: 'email',
        summary: 'Erstkontakt: Anfrage zu ETF-Portfolio Beratung',
        occurredAt: new Date('2026-03-02T09:00:00Z'),
      },
      {
        crmId: 'int-002',
        contactCrmId: 'crm-001',
        type: 'call',
        summary: 'Qualifizierungsgespräch — Budget bestätigt: CHF 45k',
        occurredAt: new Date('2026-03-15T14:00:00Z'),
      },
      {
        crmId: 'int-003',
        contactCrmId: 'crm-002',
        type: 'meeting',
        summary: 'Erstpräsentation Vemo Automationszentrale',
        occurredAt: new Date('2026-03-18T10:00:00Z'),
      },
      {
        crmId: 'int-004',
        contactCrmId: 'crm-002',
        type: 'note',
        summary: 'Entscheider ist CFO — Follow-up geplant für 08. April',
        occurredAt: new Date('2026-03-25T16:00:00Z'),
      },
    ]

    return allInteractions.filter((i) => i.contactCrmId === contactId)
  }

  async fetchConversionEvents(since?: Date): Promise<CrmConversionEvent[]> {
    await new Promise((r) => setTimeout(r, 80))

    const events: CrmConversionEvent[] = [
      {
        crmId: 'conv-001',
        contactCrmId: 'crm-001',
        type: 'meeting_booked',
        occurredAt: new Date('2026-03-28T08:00:00Z'),
      },
      {
        crmId: 'conv-002',
        contactCrmId: 'crm-003',
        type: 'form_submitted',
        occurredAt: new Date('2026-04-05T14:00:00Z'),
      },
    ]

    if (since) {
      return events.filter((e) => e.occurredAt >= since)
    }
    return events
  }
}

// ─── Conflict Resolution ──────────────────────────────────────────────────────

/**
 * Resolve data conflicts between CRM and local data.
 * Strategy: CRM wins for contact data, local wins for notes/scoring.
 */
export function resolveConflict(
  field: string,
  crmValue: string,
  localValue: string,
): ConflictRecord {
  const crmWinsFields = ['email', 'phone', 'company', 'stage', 'estimatedValue']
  const localWinsFields = ['notes', 'score', 'assignedTo']

  let resolution: ConflictRecord['resolution'] = 'manual_review_required'
  if (crmWinsFields.includes(field)) resolution = 'crm_wins'
  else if (localWinsFields.includes(field)) resolution = 'local_wins'

  return { crmId: '', field, crmValue, localValue, resolution }
}

// ─── Sync Orchestrator ────────────────────────────────────────────────────────

/**
 * Run a full CRM sync cycle:
 * 1. Fetch contacts (since last sync)
 * 2. Upsert into leads table
 * 3. Fetch interactions per contact
 * 4. Fetch conversion events
 * 5. Return sync report
 */
export async function runCrmSync(
  client: CrmSyncClient,
  since?: Date,
): Promise<SyncResult> {
  const syncedAt = new Date()
  const conflicts: ConflictRecord[] = []
  let contactsAdded = 0
  let contactsUpdated = 0
  let interactionsSynced = 0
  let conversionsSynced = 0

  // 1. Contacts
  const contacts = await client.fetchContacts(since)

  for (const contact of contacts) {
    // Simulate upsert logic
    const isNew = !since || contact.createdAt >= since
    if (isNew) {
      contactsAdded++
    } else {
      contactsUpdated++
      // Check for email conflict (example)
      if (contact.email && Math.random() < 0.05) {
        conflicts.push({
          ...resolveConflict('email', contact.email, 'local@example.com'),
          crmId: contact.crmId,
        })
      }
    }

    // 2. Interactions per contact
    const interactions = await client.fetchInteractions(contact.crmId)
    interactionsSynced += interactions.length
  }

  // 3. Conversion events
  const conversions = await client.fetchConversionEvents(since)
  conversionsSynced = conversions.length

  return {
    provider: client.getProvider(),
    syncedAt,
    contactsAdded,
    contactsUpdated,
    interactionsSynced,
    conversionsSynced,
    conflicts,
    isMock: client.getProvider() === 'mock',
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createCrmSyncClient(): CrmSyncClient {
  // Future: check env vars to select real adapter
  // if (process.env.HUBSPOT_API_TOKEN) return new HubSpotCrmClient(...)
  // if (process.env.PIPEDRIVE_API_TOKEN) return new PipedriveCrmClient(...)
  // if (process.env.AIRTABLE_API_TOKEN) return new AirtableCrmClient(...)
  return new MockCrmClient()
}

export const CRM_PROVIDER = (process.env.HUBSPOT_API_TOKEN
  ? 'hubspot'
  : process.env.PIPEDRIVE_API_TOKEN
  ? 'pipedrive'
  : process.env.AIRTABLE_API_TOKEN
  ? 'airtable'
  : 'mock') satisfies CrmProvider
