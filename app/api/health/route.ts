import { NextResponse } from 'next/server'
import { buildHealthStatus } from '@/lib/monitoring'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, { ok: boolean; message?: string }> = {}

  // DB check
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { ok: true }
  } catch (err) {
    checks.database = { ok: false, message: err instanceof Error ? err.message : 'DB error' }
  }

  // Required env vars
  const requiredEnvVars = ['ANTHROPIC_API_KEY', 'ENCRYPTION_KEY', 'API_SECRET']
  const missingEnv = requiredEnvVars.filter((v) => !process.env[v])
  checks.config = {
    ok: missingEnv.length === 0,
    message: missingEnv.length > 0 ? `Missing: ${missingEnv.join(', ')}` : undefined,
  }

  // Connector keys (optional – just report presence)
  checks.instagram = { ok: !!process.env.INSTAGRAM_ACCESS_TOKEN }
  checks.telegram = { ok: !!process.env.TELEGRAM_BOT_TOKEN }
  checks.gmail = { ok: !!(process.env.GMAIL_CLIENT_ID || process.env.GMAIL_APP_PASSWORD) }
  checks.whatsapp = { ok: !!process.env.WHATSAPP_API_TOKEN }

  const health = buildHealthStatus(checks)
  const statusCode = health.status === 'down' ? 503 : 200

  return NextResponse.json(health, { status: statusCode })
}
