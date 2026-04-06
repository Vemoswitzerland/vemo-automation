import WhatsAppInbox from '@/components/whatsapp/WhatsAppInbox'

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-vemo-dark-900">💬 WhatsApp-Automation</h1>
          <p className="text-vemo-dark-600 text-sm">
            KI-Vorbeantwortung für WhatsApp Business — Inbox, Entwürfe & Freigabe
          </p>
        </div>
      </div>

      <WhatsAppInbox />
    </div>
  )
}
