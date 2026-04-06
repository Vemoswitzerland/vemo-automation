import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Automation Center',
  description: 'Lokale Automationszentrale – Instagram, E-Mail, Marketing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-950">
        <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
            <a href="/" className="text-sky-400 font-bold text-lg tracking-tight">
              ⚡ Automation Center
            </a>
            <div className="flex items-center gap-1 ml-4">
              <a href="/" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                Dashboard
              </a>
              <a href="/emails" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                E-Mails
              </a>
              <a href="/instagram" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                Instagram
              </a>
              <a href="/settings" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                Einstellungen
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
