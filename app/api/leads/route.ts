/**
 * Leads API — Stub
 *
 * Architecture note: This stub uses the local SQLite DB (Lead model).
 * When a real CRM API (HubSpot, Pipedrive, etc.) is connected, replace
 * the prisma calls below with API client calls.
 * The response shape stays identical so the frontend never needs updating.
 *
 * To connect a real CRM: set CRM_API_KEY in .env and implement syncLeads().
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

const MOCK_LEADS = [
  { id: 'mock-1', name: 'Anna Müller', email: 'anna@beispiel.ch', phone: '+41 79 123 45 67', source: 'instagram', status: 'new', notes: 'Interesse an Kurs A', value: 490, externalId: null, syncedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-2', name: 'Thomas Keller', email: 'thomas@beispiel.ch', phone: '+41 78 987 65 43', source: 'facebook', status: 'qualified', notes: 'Sehr interessiert, Follow-up nötig', value: 890, externalId: null, syncedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-3', name: 'Sara Meier', email: 'sara@beispiel.ch', phone: null, source: 'google_ads', status: 'contacted', notes: 'Hat Infos angefragt', value: 290, externalId: null, syncedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-4', name: 'Martin Weber', email: 'martin@beispiel.ch', phone: '+41 76 555 12 34', source: 'referral', status: 'converted', notes: 'Kauf abgeschlossen', value: 1290, externalId: null, syncedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-5', name: 'Lisa Brunner', email: 'lisa@beispiel.ch', phone: '+41 79 444 56 78', source: 'instagram', status: 'new', notes: 'Story Interaction', value: 390, externalId: null, syncedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  try {
    const where: any = { userId, ...(status ? { status } : {}) }
    const leads = await prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' } })

    // Return real DB data if exists, otherwise serve mock data
    if (leads.length === 0) {
      const filtered = status ? MOCK_LEADS.filter((l) => l.status === status) : MOCK_LEADS
      return NextResponse.json({ leads: filtered, isMock: true, total: filtered.length })
    }

    return NextResponse.json({ leads, isMock: false, total: leads.length })
  } catch {
    return NextResponse.json({ leads: MOCK_LEADS, isMock: true, total: MOCK_LEADS.length })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const body = await request.json()
    const { name, email, phone, source, status, notes, value } = body

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }

    const lead = await prisma.lead.create({
      data: { userId, name, email, phone, source: source ?? 'manual', status: status ?? 'new', notes, value },
    })

    // TODO: Sync to CRM when CRM_API_KEY is configured
    // if (process.env.CRM_API_KEY) { await syncToCRM(lead) }

    return NextResponse.json({ lead })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Erstellen des Leads' }, { status: 500 })
  }
}
