/**
 * GET /api/gmail/callback?code=<code>&state=<accountId>
 *
 * OAuth2 callback from Google. Exchanges the code for tokens,
 * then creates or updates the EmailAccount in the database.
 *
 * On success: redirects to /settings with success message.
 * On error:   redirects to /settings with error message.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import {
  exchangeCodeForTokens,
  getGmailUserInfo,
  registerGmailWatch,
  isGmailOAuthConfigured,
} from '@/lib/email/gmail-oauth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // accountId or 'new'
  const error = searchParams.get('error')

  const base = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'

  if (error) {
    console.error('[gmail/callback] OAuth error from Google:', error)
    return NextResponse.redirect(`${base}/settings?gmail_error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${base}/settings?gmail_error=no_code`)
  }

  if (!isGmailOAuthConfigured()) {
    return NextResponse.redirect(`${base}/settings?gmail_error=not_configured`)
  }

  try {
    // 1) Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // 2) Fetch Gmail user info
    const userInfo = await getGmailUserInfo(tokens.accessToken)

    // 3) Create or update EmailAccount
    const accountData = {
      authType: 'oauth2',
      email: userInfo.email,
      username: userInfo.email,
      name: userInfo.name,
      // Gmail standard IMAP/SMTP settings
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      password: '', // OAuth accounts don't use password
      oauthAccessToken: encrypt(tokens.accessToken),
      oauthRefreshToken: encrypt(tokens.refreshToken),
      oauthExpiry: tokens.expiry,
      isActive: true,
    }

    let account: { id: string; email: string }

    if (state && state !== 'new') {
      // Update existing account
      account = await prisma.emailAccount.update({
        where: { id: state },
        data: accountData,
      })
    } else {
      // Upsert by email (avoid duplicates)
      const existing = await prisma.emailAccount.findFirst({
        where: { email: userInfo.email },
      })
      if (existing) {
        account = await prisma.emailAccount.update({
          where: { id: existing.id },
          data: accountData,
        })
      } else {
        account = await prisma.emailAccount.create({ data: accountData })
      }
    }

    // 4) Register Gmail push notifications (best-effort — requires Pub/Sub setup)
    try {
      if (process.env.GMAIL_PUBSUB_TOPIC) {
        const watch = await registerGmailWatch(tokens.accessToken)
        await prisma.emailAccount.update({
          where: { id: account.id },
          data: {
            gmailHistoryId: watch.historyId,
            gmailWatchExpiry: new Date(watch.expiryMs),
          },
        })
        console.log(`[gmail/callback] Watch registered for ${userInfo.email}, historyId=${watch.historyId}`)
      }
    } catch (watchErr) {
      console.warn('[gmail/callback] Watch registration skipped:', watchErr)
    }

    console.log(`[gmail/callback] Gmail account connected: ${userInfo.email}`)
    return NextResponse.redirect(
      `${base}/settings?gmail_connected=${encodeURIComponent(userInfo.email)}`
    )
  } catch (err) {
    console.error('[gmail/callback] Error:', err)
    return NextResponse.redirect(
      `${base}/settings?gmail_error=${encodeURIComponent(String(err))}`
    )
  }
}
