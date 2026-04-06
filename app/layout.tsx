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
        <meta name="color-scheme" content="light dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body className="min-h-screen bg-vemo-dark-50 text-vemo-dark-900">
        <nav className="border-b border-vemo-dark-200 bg-white/95 backdrop-blur sticky top-0 z-50 h-16">
          <div className="max-w-6xl mx-auto px-4 h-full flex items-center gap-8">
            <a href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-75 transition-opacity flex-shrink-0">
              <span className="w-8 h-8 bg-vemo-green-500 rounded-sm flex items-center justify-center text-white font-bold text-xs">v</span>
              <span className="text-vemo-dark-900">Automationszentrale</span>
            </a>
            <NavLinks />
          </div>
        </nav>
        <main className="min-h-[calc(100vh-4rem)] bg-vemo-dark-50">
          <div className="w-full px-3 md:px-4 py-6 md:py-8 md:max-w-6xl md:mx-auto">
            <QueryProvider>{children}</QueryProvider>
          </div>
        </main>
      </body>
    </html>
  )
}
