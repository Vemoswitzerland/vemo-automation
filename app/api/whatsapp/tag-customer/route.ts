import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const VALID_TAGS = ['hot-lead', 'vip', 'support', 'prospect', 'converted', 'inactive', 'newsletter']

// POST /api/whatsapp/tag-customer
// body: { phone: string, tags: string[], mode: "replace" | "append" }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { phone, tags, mode = 'append' } = body

  if (!phone || !Array.isArray(tags)) {
    return NextResponse.json({ error: 'phone and tags[] required' }, { status: 400 })
  }

  const normalized = phone.replace(/[^\d+]/g, '').startsWith('+')
    ? phone.replace(/[^\d+]/g, '')
    : `+${phone.replace(/[^\d+]/g, '')}`

  const customer = await prisma.whatsAppCustomer.findUnique({ where: { phone: normalized } })
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found. Load profile first.' }, { status: 404 })
  }

  let currentTags: string[] = []
  try { currentTags = JSON.parse(customer.tags) } catch { currentTags = [] }

  const newTags = mode === 'replace'
    ? tags
    : Array.from(new Set([...currentTags, ...tags]))

  const updated = await prisma.whatsAppCustomer.update({
    where: { phone: normalized },
    data: { tags: JSON.stringify(newTags) },
  })

  return NextResponse.json({
    phone: updated.phone,
    tags: newTags,
    validTags: VALID_TAGS,
  })
}
