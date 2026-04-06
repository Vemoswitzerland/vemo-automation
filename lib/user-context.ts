import { NextRequest } from 'next/server'

/**
 * Extract the authenticated user ID from request headers.
 * The middleware sets `x-user-id` after validating the API key.
 * Falls back to "admin" for backward compatibility.
 */
export function getUserId(req: NextRequest): string {
  return req.headers.get('x-user-id') ?? 'admin'
}
