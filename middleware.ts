import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  // API_SECRET takes precedence; AUTOMATION_API_KEY kept for backwards compat
  const expectedKey = process.env.API_SECRET || process.env.AUTOMATION_API_KEY

  // If no key is configured (initial setup), allow all requests through
  if (!expectedKey) return NextResponse.next()

  const apiKey =
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  if (apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
