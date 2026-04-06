'use client'

export default function EmailMockBanner() {
  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-sm px-4 py-3">
      <span className="text-amber-500 text-lg">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800">Demo-Modus aktiv</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Kein E-Mail-Account verbunden. Beispiel-E-Mails werden angezeigt.{' '}
          <a href="/settings" className="underline font-semibold">
            E-Mail-Account in den Einstellungen konfigurieren →
          </a>
        </p>
      </div>
    </div>
  )
}
