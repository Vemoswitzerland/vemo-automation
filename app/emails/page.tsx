import { prisma } from '@/lib/db'
import EmailInbox from '@/components/email/EmailInbox'
import SyncButton from '@/components/email/SyncButton'

export default async function EmailsPage() {
  let emails: any[] = []
  let error: string | null = null

  try {
    emails = await prisma.email.findMany({
      include: { drafts: true },
      orderBy: [{ priority: 'desc' }, { receivedAt: 'desc' }],
      take: 50,
    })
  } catch {
    error = 'Datenbank nicht initialisiert. Bitte führe zuerst npm run db:push aus.'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-vemo-dark-900">E-Mail-Automation</h1>
          <p className="text-vemo-dark-600 text-sm">KI-Vorbeantwortung mit User-Approval-Flow</p>
        </div>
        <SyncButton />
      </div>

      {error && (
        <div className="card border-error-500 bg-error-50">
          <p className="text-error-600 text-sm font-medium">{error}</p>
        </div>
      )}

      <EmailInbox emails={emails} />
    </div>
  )
}
