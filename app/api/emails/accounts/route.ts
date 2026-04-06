import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
  const data = await req.json()
  const account = await prisma.emailAccount.create({ data })
  return NextResponse.json({ ...account, password: '***' })
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json()
  const account = await prisma.emailAccount.update({ where: { id }, data })
  return NextResponse.json({ ...account, password: '***' })
}
