import type { Metadata } from 'next'
import './globals.css'
import QueryProvider from '@/components/QueryProvider'
import NavLinks from '@/components/NavLinks'

export const metadata: Metadata = {
  title: 'Automationszentrale',
  description: 'Vemo Automationszentrale – Flows, Agents, Verbindungen, Einstellungen',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="border-b border-gray-200 bg-white sticky top-0 h-14" style={{ zIndex: 9999 }}>
          <div className="w-full px-4 h-full flex items-center gap-6">
            <a href="/" className="flex items-baseline gap-0 hover:opacity-80 transition-opacity flex-shrink-0">
              <span className="text-xl font-bold tracking-tight text-gray-900">vemo</span>
              <span className="text-xl font-bold text-green-500">.</span>
              <span className="text-xs font-medium text-gray-400 ml-1.5 tracking-wide">automationszentrale</span>
            </a>
            <NavLinks />
          </div>
        </nav>
        <main className="min-h-[calc(100vh-3.5rem)] bg-gray-50">
          <div className="w-full px-3 md:px-4 py-2 md:py-3">
            <QueryProvider>{children}</QueryProvider>
          </div>
        </main>
      </body>
    </html>
  )
}
