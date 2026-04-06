import EmailTemplateLibrary from '@/components/email/EmailTemplateLibrary'

export default function EmailTemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <a href="/emails" className="text-sm text-vemo-dark-500 hover:text-vemo-dark-900 transition-colors">← E-Mails</a>
            <span className="text-vemo-dark-300">/</span>
            <h1 className="text-2xl font-bold text-vemo-dark-900">Template-Library</h1>
          </div>
          <p className="text-vemo-dark-600 text-sm">Vorlagen für häufige Anfragen — direkt in Reply-Suggestions verwendbar</p>
        </div>
      </div>

      <EmailTemplateLibrary />
    </div>
  )
}
