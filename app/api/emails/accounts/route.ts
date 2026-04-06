import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto'

const AccountCreateSchema = z.object({
  name: z.string().min(1, 'name is required'),
  email: z.string().email('email must be a valid email address'),
  imapHost: z.string().min(1, 'imapHost is required'),
  imapPort: z.number().int().positive().optional(),
  smtpHost: z.string().min(1, 'smtpHost is required'),
  smtpPort: z.number().int().positive().optional(),
  username: z.string().min(1, 'username is required'),
  password: z.string().min(1, 'password is required'),
  isActive: z.boolean().optional(),
})

const AccountUpdateSchema = AccountCreateSchema.partial().extend({
  id: z.string().min(1, 'id is required'),
})

export async function GET() {
  const accounts = await prisma.emailAccount.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      imapHost: true,
      imapPort: true,
      smtpHost: true,
      smtpPort: true,
      username: true,
      isActive: true,
      lastSyncAt: true,
      // Never return password
    }
  })
  return NextResponse.json(accounts)
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = AccountCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 })
  }

  const account = await prisma.emailAccount.create({
    data: { ...parsed.data, password: encrypt(parsed.data.password) },
  })
  return NextResponse.json({ ...account, password: '***' })
}

export async function PUT(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = AccountUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 })
  }

  const { id, ...data } = parsed.data
  if (data.password) {
    data.password = encrypt(data.password)
  }
  const account = await prisma.emailAccount.update({ where: { id }, data })
  return NextResponse.json({ ...account, password: '***' })
}
