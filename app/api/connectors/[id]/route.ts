import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getConnectorById } from '@/lib/connectors/registry'
import { encrypt } from '@/lib/crypto'

type Params = { params: Promise<{ id: string }> }

// GET /api/connectors/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const def = getConnectorById(id)
  if (!def) return NextResponse.json({ error: 'Connector nicht gefunden' }, { status: 404 })

  const state = await prisma.connector.findUnique({ where: { id } })
  return NextResponse.json({
    ...def,
    state: state
      ? {
          id: state.id,
          status: state.status,
          lastTestedAt: state.lastTestedAt?.toISOString() ?? null,
          errorMessage: state.errorMessage,
          createdAt: state.createdAt.toISOString(),
          updatedAt: state.updatedAt.toISOString(),
        }
      : null,
  })
}

// POST /api/connectors/[id] — save credentials and mark as connected
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const def = getConnectorById(id)
  if (!def) return NextResponse.json({ error: 'Connector nicht gefunden' }, { status: 404 })

  const body = await req.json()
  const credentials = body.credentials as Record<string, string>

  // Encrypt each credential value before persisting
  const encryptedCredentials = Object.fromEntries(
    Object.entries(credentials).map(([k, v]) => [k, v ? encrypt(v) : v])
  )

  const state = await prisma.connector.upsert({
    where: { id },
    update: {
      credentials: JSON.stringify(encryptedCredentials),
      status: 'connected',
      errorMessage: null,
      lastTestedAt: new Date(),
    },
    create: {
      id,
      credentials: JSON.stringify(encryptedCredentials),
      status: 'connected',
      lastTestedAt: new Date(),
    },
  })

  return NextResponse.json({
    id: state.id,
    status: state.status,
    lastTestedAt: state.lastTestedAt?.toISOString() ?? null,
    updatedAt: state.updatedAt.toISOString(),
  })
}

// DELETE /api/connectors/[id] — disconnect and remove credentials
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const def = getConnectorById(id)
  if (!def) return NextResponse.json({ error: 'Connector nicht gefunden' }, { status: 404 })

  await prisma.connector.upsert({
    where: { id },
    update: { credentials: null, status: 'disconnected', errorMessage: null, lastTestedAt: null },
    create: { id, status: 'disconnected' },
  })

  return NextResponse.json({ id, status: 'disconnected' })
}
