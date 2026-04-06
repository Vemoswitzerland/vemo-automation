import EmailAccountSettings from '@/components/email/EmailAccountSettings'

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Einstellungen</h1>
        <p className="text-gray-400 text-sm mt-1">E-Mail-Konten, API-Keys und Konfiguration</p>
      </div>

      <div className="space-y-6">
        {/* API Keys */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4">API-Keys</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Anthropic API Key (Claude)</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  defaultValue={process.env.ANTHROPIC_API_KEY ? '••••••••••••••••••••' : ''}
                  placeholder="sk-ant-..."
                  readOnly
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none"
                />
                <span className={`px-3 py-2 rounded-lg text-xs font-medium ${
                  process.env.ANTHROPIC_API_KEY
                    ? 'bg-green-900/50 text-green-300'
                    : 'bg-red-900/50 text-red-300'
                }`}>
                  {process.env.ANTHROPIC_API_KEY ? '✅ Konfiguriert' : '❌ Fehlt'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Setze ANTHROPIC_API_KEY in der .env.local Datei</p>
            </div>
          </div>
        </div>

        {/* Email Accounts */}
        <EmailAccountSettings />
      </div>
    </div>
  )
}
