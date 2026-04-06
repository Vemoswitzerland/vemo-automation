/**
 * GET /api/gmail/auth?accountId=<optional>
 *
 * Initiates the Gmail OAuth2 flow. Redirects the user to Google's
 * authorization page. After approval, Google redirects to /api/gmail/callback.
 *
 * Query params:
 *   accountId  — (optional) existing EmailAccount ID to re-authorize
 */
import { NextRequest, NextResponse } from 'next/server'
import { buildAuthUrl, isGmailOAuthConfigured } from '@/lib/email/gmail-oauth'

export async function GET(req: NextRequest) {
  if (!isGmailOAuthConfigured()) {
    return NextResponse.json(
      {
        error: 'Gmail OAuth not configured',
        hint: 'Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env.local',
        docs: 'https://console.cloud.google.com/apis/credentials',
      },
      { status: 501 }
    )
  }

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId') || 'new'

  // Use accountId as OAuth state for correlation in callback
  const authUrl = buildAuthUrl(accountId)

  return NextResponse.redirect(authUrl)
}
