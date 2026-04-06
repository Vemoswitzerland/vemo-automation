import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function normalizePhone(phone: string): string {
  // Remove all non-digit chars except leading +
  const cleaned = phone.replace(/[^\d+]/g, '')
  // Ensure E.164 format
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`
  }
  return cleaned
}

// GET /api/whatsapp/customer-profile?phone=+41791234567
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) {
    return NextResponse.json({ error: 'phone parameter required' }, { status: 400 })
  }

  const normalized = normalizePhone(phone)

  // Find or create customer
  let customer = await prisma.whatsAppCustomer.findUnique({
    where: { phone: normalized },
    include: {
      messages: {
        orderBy: { receivedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          body: true,
          direction: true,
          status: true,
          receivedAt: true,
        },
      },
    },
  })

  if (!customer) {
    // Auto-create from existing messages or as blank
    const existingMsg = await prisma.whatsAppMessage.findFirst({
      where: { from: normalized },
      orderBy: { receivedAt: 'desc' },
    })

    customer = await prisma.whatsAppCustomer.create({
      data: {
        phone: normalized,
        name: existingMsg?.fromName ?? null,
        messageCount: existingMsg ? 1 : 0,
        lastContactAt: existingMsg?.receivedAt ?? null,
      },
      include: {
        messages: {
          orderBy: { receivedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            body: true,
            direction: true,
            status: true,
            receivedAt: true,
          },
        },
      },
    })

    // Link existing messages to this customer
    if (existingMsg) {
      await prisma.whatsAppMessage.updateMany({
        where: { from: normalized },
        data: { customerId: customer.id },
      })
    }
  }

  // CRM Sync: lookup Lead by phone
  let crmLead = customer.crmLeadId
    ? await prisma.lead.findUnique({ where: { id: customer.crmLeadId } })
    : await prisma.lead.findFirst({ where: { phone: normalized } })

  if (!crmLead) {
    // Auto-create CRM Lead
    crmLead = await prisma.lead.create({
      data: {
        name: customer.name ?? normalized,
        phone: normalized,
        email: customer.email ?? undefined,
        source: 'whatsapp',
        status: 'new',
      },
    })

    // Link customer to lead
    await prisma.whatsAppCustomer.update({
      where: { id: customer.id },
      data: { crmLeadId: crmLead.id },
    })
  }

  // Parse tags
  let tags: string[] = []
  try {
    tags = JSON.parse(customer.tags)
  } catch {
    tags = []
  }

  return NextResponse.json({
    customer: {
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      email: customer.email,
      tags,
      notes: customer.notes,
      messageCount: customer.messageCount,
      lastContactAt: customer.lastContactAt,
      createdAt: customer.createdAt,
    },
    recentMessages: customer.messages,
    crm: {
      leadId: crmLead.id,
      status: crmLead.status,
      source: crmLead.source,
      value: crmLead.value,
      notes: crmLead.notes,
      syncedAt: crmLead.syncedAt,
    },
  })
}

// PATCH /api/whatsapp/customer-profile — update name, email, tags, notes
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { phone, name, email, tags, notes } = body

  if (!phone) {
    return NextResponse.json({ error: 'phone required' }, { status: 400 })
  }

  const normalized = normalizePhone(phone)

  const customer = await prisma.whatsAppCustomer.upsert({
    where: { phone: normalized },
    update: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(tags !== undefined && { tags: JSON.stringify(tags) }),
      ...(notes !== undefined && { notes }),
    },
    create: {
      phone: normalized,
      name: name ?? null,
      email: email ?? null,
      tags: tags ? JSON.stringify(tags) : '[]',
      notes: notes ?? null,
    },
  })

  // Sync email/name back to CRM Lead if linked
  if (customer.crmLeadId) {
    await prisma.lead.update({
      where: { id: customer.crmLeadId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
      },
    })
  }

  let parsedTags: string[] = []
  try {
    parsedTags = JSON.parse(customer.tags)
  } catch {
    parsedTags = []
  }

  return NextResponse.json({ ...customer, tags: parsedTags })
}
