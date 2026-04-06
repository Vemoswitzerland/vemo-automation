import Link from 'next/link'
import EmailInbox from '@/components/email/EmailInbox'
import SyncButton from '@/components/email/SyncButton'
import EmailMockBanner from '@/components/email/EmailMockBanner'
import { prisma } from '@/lib/db'

async function hasEmailAccounts(): Promise<boolean> {
  try {
    const count = await prisma.emailAccount.count({ where: { isActive: true } })
    return count > 0
  } catch {
    return false
  }
}

export default async function EmailsPage() {
  const hasAccounts = await hasEmailAccounts()
  const isMock = !hasAccounts && !process.env.GMAIL_USER

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-vemo-dark-900">E-Mail-Automation</h1>
          <p className="text-vemo-dark-600 text-sm">KI-Vorbeantwortung mit User-Approval-Flow</p>
        </div>
        <div className="flex gap-2">
          <Link href="/emails/templates" className="btn-secondary text-sm">
            📋 Templates
          </Link>
          <Link
            href="/emails/automation"
            className="btn-secondary text-sm"
          >
            ⚡ Automation-Regeln
          </Link>
          <SyncButton isMock={isMock} />
        </div>
      </div>

      {isMock && <EmailMockBanner />}

      <EmailInbox isMock={isMock} />
    </div>
  )
}
