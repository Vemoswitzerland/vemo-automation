import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Rate-Limiting (in-memory sliding window, per IP)
// ---------------------------------------------------------------------------
type WindowEntry = { count: number; windowStart: number }
const rateLimitMap = new Map<string, WindowEntry>()

const RATE_LIMITS: { pattern: RegExp; maxReq: number; windowMs: number }[] = [
  { pattern: /^\/api\/telegram\//, maxReq: 100, windowMs: 60_000 },
  { pattern: /^\/api\/approvals\//, maxReq: 60, windowMs: 60_000 },
  { pattern: /^\/api\/emails\//, maxReq: 30, windowMs: 60_000 },
  { pattern: /^\/api\/instagram\//, maxReq: 10, windowMs: 60_000 },
]

function checkRateLimit(ip: string, pathname: string): boolean {
  const rule = RATE_LIMITS.find(r => r.pattern.test(pathname))
  if (!rule) return true

  const now = Date.now()
  const key = `${ip}:${pathname.split('/').slice(0, 3).join('/')}`
  const entry = rateLimitMap.get(key)

  if (!entry || now - entry.windowStart > rule.windowMs) {
    rateLimitMap.set(key, { count: 1, windowStart: now })
    return true
  }

  entry.count += 1
  if (entry.count > rule.maxReq) return false
  return true
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Telegram webhook uses its own secret token — skip API key check
  if (pathname === '/api/telegram/webhook') {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    if (!checkRateLimit(ip, pathname)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }
    return NextResponse.next()
  }

  // API_SECRET takes precedence; AUTOMATION_API_KEY kept for backwards compat
  const expectedKey = process.env.API_SECRET || process.env.AUTOMATION_API_KEY

  // If no key is configured (initial setup), allow all requests through
  if (!expectedKey) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    if (!checkRateLimit(ip, pathname)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }
    return NextResponse.next()
  }

  const apiKey =
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  if (apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Apply rate limiting after auth passes
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip, pathname)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
