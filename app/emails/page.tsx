import EmailInbox from '@/components/email/EmailInbox'
import SyncButton from '@/components/email/SyncButton'

export default function EmailsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-vemo-dark-900">E-Mail-Automation</h1>
          <p className="text-vemo-dark-600 text-sm">KI-Vorbeantwortung mit User-Approval-Flow</p>
        </div>
        <SyncButton />
      </div>

      <EmailInbox />
    </div>
  )
}
