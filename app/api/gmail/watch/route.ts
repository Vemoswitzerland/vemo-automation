/**
 * POST /api/gmail/watch
 * DELETE /api/gmail/watch
 *
 * Manage Gmail push notification watches for OAuth2 accounts.
 * Gmail watches expire every 7 days — this route handles renewal.
 *
 * POST body: { accountId: string }  — register or renew watch
 * DELETE body: { accountId: string } — stop watch
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  registerGmailWatch,
  stopGmailWatch,
  getValidAccessToken,
  isGmailOAuthConfigured,
} from '@/lib/email/gmail-oauth'

export async function POST(req: NextRequest) {
  if (!isGmailOAuthConfigured()) {
    return NextResponse.json({ error: 'Gmail OAuth not configured' }, { status: 501 })
  }

  const { accountId } = await req.json().catch(() => ({}))
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 })
  }

  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  if (!account || account.authType !== 'oauth2') {
    return NextResponse.json({ error: 'OAuth2 account not found' }, { status: 404 })
  }

  try {
    const accessToken = await getValidAccessToken(account)
    const watch = await registerGmailWatch(accessToken)

    await prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        gmailHistoryId: watch.historyId,
        gmailWatchExpiry: new Date(watch.expiryMs),
      },
    })

    return NextResponse.json({
      ok: true,
      historyId: watch.historyId,
      expiresAt: new Date(watch.expiryMs).toISOString(),
    })
  } catch (err) {
    console.error('[gmail/watch] Register error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { accountId } = await req.json().catch(() => ({}))
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 })
  }

  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  if (!account || account.authType !== 'oauth2') {
    return NextResponse.json({ error: 'OAuth2 account not found' }, { status: 404 })
  }

  try {
    const accessToken = await getValidAccessToken(account)
    await stopGmailWatch(accessToken)

    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { gmailHistoryId: null, gmailWatchExpiry: null },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[gmail/watch] Stop error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
