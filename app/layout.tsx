import type { Metadata } from 'next'
import './globals.css'
import QueryProvider from '@/components/QueryProvider'
import NavLinks from '@/components/NavLinks'

export const metadata: Metadata = {
  title: 'Automationszentrale',
  description: 'Vemo Automationszentrale – Flows, Verbindungen, Einstellungen',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body className="min-h-screen bg-vemo-dark-50 text-vemo-dark-900">
        <nav className="border-b border-gray-200 bg-white sticky top-0 h-14" style={{ zIndex: 9999 }}>
          <div className="w-full px-4 h-full flex items-center gap-6">
            <a href="/" className="flex items-center gap-2 font-bold text-base tracking-tight hover:opacity-80 transition-opacity flex-shrink-0">
              <img src="/vemo-logo-180.png" alt="Vemo" className="w-7 h-7 rounded-md" />
              <span className="text-gray-900">Automationszentrale</span>
            </a>
            <NavLinks />
          </div>
        </nav>
        <main className="min-h-[calc(100vh-4rem)] bg-vemo-dark-50">
          <div className="w-full px-3 md:px-4 py-6 md:py-8">
            <QueryProvider>{children}</QueryProvider>
          </div>
        </main>
      </body>
    </html>
  )
}
