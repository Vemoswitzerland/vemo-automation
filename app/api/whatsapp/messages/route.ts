import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/whatsapp/messages?phone=+41791234567&page=1&limit=20
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const phone = searchParams.get('phone')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const skip = (page - 1) * limit

  const where = phone
    ? { from: phone.replace(/[^\d+]/g, '').startsWith('+')
        ? phone.replace(/[^\d+]/g, '')
        : `+${phone.replace(/[^\d+]/g, '')}` }
    : {}

  const [messages, total] = await Promise.all([
    prisma.whatsAppMessage.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      skip,
      take: limit,
      include: {
        drafts: {
          select: { id: true, status: true, body: true },
        },
        customer: {
          select: { id: true, name: true, email: true, tags: true },
        },
      },
    }),
    prisma.whatsAppMessage.count({ where }),
  ])

  const formatted = messages.map((m) => {
    let customerTags: string[] = []
    if (m.customer?.tags) {
      try { customerTags = JSON.parse(m.customer.tags) } catch { customerTags = [] }
    }

    return {
      id: m.id,
      waId: m.waId,
      from: m.from,
      fromName: m.fromName,
      body: m.body,
      direction: m.direction,
      status: m.status,
      receivedAt: m.receivedAt,
      drafts: m.drafts,
      customer: m.customer
        ? { ...m.customer, tags: customerTags }
        : null,
    }
  })

  return NextResponse.json({
    messages: formatted,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
    },
  })
}
