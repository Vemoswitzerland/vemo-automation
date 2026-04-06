/**
 * Leads API — Stub
 *
 * Architecture note: This stub uses the local SQLite DB (Lead model).
 * When a real CRM API (HubSpot, Pipedrive, etc.) is connected, replace
 * the prisma calls below with API client calls.
 * The response shape stays identical so the frontend never needs updating.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

const MOCK_LEADS = [
  { id: 'mock-1', name: 'Anna Müller', email: 'anna@beispiel.ch', phone: '+41 79 123 45 67', source: 'instagram', status: 'new', notes: 'Interesse an Kurs A', value: 490, score: 62, lastContact: new Date(Date.now() - 2 * 86400000).toISOString(), externalId: null, syncedAt: null, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-2', name: 'Thomas Keller', email: 'thomas@beispiel.ch', phone: '+41 78 987 65 43', source: 'facebook', status: 'qualified', notes: 'Sehr interessiert, Follow-up nötig', value: 890, score: 78, lastContact: new Date(Date.now() - 1 * 86400000).toISOString(), externalId: null, syncedAt: null, createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-3', name: 'Sara Meier', email: 'sara@beispiel.ch', phone: null, source: 'google_ads', status: 'contacted', notes: 'Hat Infos angefragt', value: 290, score: 45, lastContact: new Date(Date.now() - 3 * 86400000).toISOString(), externalId: null, syncedAt: null, createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-4', name: 'Martin Weber', email: 'martin@beispiel.ch', phone: '+41 76 555 12 34', source: 'referral', status: 'converted', notes: 'Kauf abgeschlossen', value: 1290, score: 95, lastContact: new Date(Date.now() - 12 * 3600000).toISOString(), externalId: null, syncedAt: null, createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-5', name: 'Lisa Brunner', email: 'lisa@beispiel.ch', phone: '+41 79 444 56 78', source: 'instagram', status: 'new', notes: 'Story Interaction', value: 390, score: 32, lastContact: new Date(Date.now() - 7 * 86400000).toISOString(), externalId: null, syncedAt: null, createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-6', name: 'Lukas Zimmermann', email: 'lukas@firma.ch', phone: '+41 77 321 09 87', source: 'referral', status: 'qualified', notes: 'CEO einer KMU, sehr hohes Budget', value: 2490, score: 88, lastContact: new Date(Date.now() - 1 * 86400000).toISOString(), externalId: null, syncedAt: null, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-7', name: 'Maria Schneider', email: 'maria@beispiel.ch', phone: null, source: 'google_ads', status: 'lost', notes: 'Zu teuer, kein Budget', value: 190, score: 18, lastContact: new Date(Date.now() - 15 * 86400000).toISOString(), externalId: null, syncedAt: null, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-8', name: 'Peter Huber', email: 'peter@beispiel.ch', phone: '+41 76 111 22 33', source: 'facebook', status: 'contacted', notes: 'Demo-Termin vereinbart', value: 690, score: 56, lastContact: new Date(Date.now() - 2 * 86400000).toISOString(), externalId: null, syncedAt: null, createdAt: new Date(Date.now() - 8 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
]

function computeScore(status: string, value: number | null): number {
  const base: Record<string, number> = { new: 20, qualified: 55, contacted: 40, converted: 90, lost: 10 }
  const v = base[status] ?? 25
  const bonus = !value ? 0 : value > 1000 ? 20 : value > 500 ? 10 : value > 200 ? 5 : 0
  return Math.min(100, v + bonus)
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const source = searchParams.get('source')
  const search = searchParams.get('search')
  const scoreMin = searchParams.get('scoreMin')
  const scoreMax = searchParams.get('scoreMax')

  try {
    const where: any = { userId, ...(status ? { status } : {}), ...(source ? { source } : {}) }
    const leads = await prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' } })

    if (leads.length === 0) {
      let filtered = MOCK_LEADS
      if (status) filtered = filtered.filter((l) => l.status === status)
      if (source) filtered = filtered.filter((l) => l.source === source)
      if (search) {
        const q = search.toLowerCase()
        filtered = filtered.filter((l) => l.name.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.includes(q))
      }
      if (scoreMin) filtered = filtered.filter((l) => l.score >= parseInt(scoreMin))
      if (scoreMax) filtered = filtered.filter((l) => l.score <= parseInt(scoreMax))
      return NextResponse.json({ leads: filtered, isMock: true, total: filtered.length })
    }

    const scoredLeads = leads.map((l) => ({ ...l, score: computeScore(l.status, l.value), lastContact: l.updatedAt.toISOString() }))
    return NextResponse.json({ leads: scoredLeads, isMock: false, total: scoredLeads.length })
  } catch {
    return NextResponse.json({ leads: MOCK_LEADS, isMock: true, total: MOCK_LEADS.length })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const body = await request.json()
    const { name, email, phone, source, status, notes, value } = body
    if (!name) return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    const lead = await prisma.lead.create({
      data: { userId, name, email, phone, source: source ?? 'manual', status: status ?? 'new', notes, value },
    })
    return NextResponse.json({ lead })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Erstellen des Leads' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })
    await prisma.lead.updateMany({ where: { id, userId }, data })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })
    await prisma.lead.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
