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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">E-Mail-Automation</h1>
          <p className="text-gray-400 text-sm mt-1">KI-Vorbeantwortung mit User-Approval-Flow</p>
        </div>
        <SyncButton />
      </div>

      {error && (
        <div className="card border-red-900 bg-red-950/30 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <EmailInbox emails={emails} />
    </div>
  )
}
