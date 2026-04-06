import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
// Mock WhatsApp messages for demo/stub mode
const MOCK_MESSAGES = [
  {
    waId: 'mock-001',
    from: '+41791234567',
    fromName: 'Max Muster',
    body: 'Hallo! Ich interessiere mich für eure Finanzberatung. Könnt ihr mir mehr Informationen schicken?',
    receivedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    waId: 'mock-002',
    from: '+41799876543',
    fromName: 'Anna Müller',
    body: 'Guten Tag, wann ist der nächste verfügbare Termin für ein Erstgespräch?',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    waId: 'mock-003',
    from: '+41781111222',
    fromName: 'Peter Schmid',
    body: 'Danke für das Gespräch letzte Woche! Ich habe noch eine Folgefrage zu den ETF-Empfehlungen.',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    waId: 'mock-004',
    from: '+41762223333',
    fromName: 'Sara Keller',
    body: 'Ich wollte fragen ob ihr auch bei der Steueroptimierung helfen könnt?',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'all'
  const limit = parseInt(searchParams.get('limit') || '50')

  // Check if WhatsApp connector is configured
  const connector = await prisma.connector.findUnique({ where: { id: 'whatsapp' } })
  const isMockMode = !connector || connector.status !== 'connected'

  // Seed mock data if in mock mode and no messages exist yet
  if (isMockMode) {
    const count = await prisma.whatsAppMessage.count()
    if (count === 0) {
      for (const msg of MOCK_MESSAGES) {
        await prisma.whatsAppMessage.upsert({
          where: { waId: msg.waId },
          update: {},
          create: {
            waId: msg.waId,
            from: msg.from,
            fromName: msg.fromName,
            body: msg.body,
            direction: 'inbound',
            status: 'unread',
            receivedAt: msg.receivedAt,
          },
        })
      }
    }
  }

  const where =
    status === 'pending'
      ? { drafts: { some: { status: 'pending' } } }
      : status === 'unread'
      ? { status: 'unread' }
      : {}

  const messages = await prisma.whatsAppMessage.findMany({
    where,
    include: { drafts: true },
    orderBy: { receivedAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({ messages, isMockMode })
}
