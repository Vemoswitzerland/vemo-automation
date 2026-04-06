import EmailAccountSettings from '@/components/email/EmailAccountSettings'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-vemo-dark-900">Einstellungen</h1>
        <p className="text-vemo-dark-600 text-sm">E-Mail-Konten, API-Keys und Konfiguration</p>
      </div>

      <div className="space-y-6">
        {/* API Keys */}
        <div className="card">
          <h2 className="font-semibold text-vemo-dark-900 mb-4">API-Keys</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-vemo-dark-600 mb-2 block">Anthropic API Key (Claude)</label>
              <div className="flex gap-3">
                <input
                  type="password"
                  defaultValue={process.env.ANTHROPIC_API_KEY ? '••••••••••••••••••••' : ''}
                  placeholder="sk-ant-..."
                  readOnly
                  className="input flex-1"
                />
                <span className={`px-4 py-2.5 rounded-sm text-xs font-semibold whitespace-nowrap ${
                  process.env.ANTHROPIC_API_KEY
                    ? 'bg-vemo-green-50 text-vemo-green-700'
                    : 'bg-error-50 text-error-600'
                }`}>
                  {process.env.ANTHROPIC_API_KEY ? '✅ Konfiguriert' : '❌ Fehlt'}
                </span>
              </div>
              <p className="text-xs text-vemo-dark-600 mt-2">Setze ANTHROPIC_API_KEY in der .env.local Datei</p>
            </div>
          </div>
        </div>

        {/* Email Accounts */}
        <EmailAccountSettings />
      </div>
    </div>
  )
}
