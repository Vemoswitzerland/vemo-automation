import type { Metadata } from 'next'
import './globals.css'
import QueryProvider from '@/components/QueryProvider'

export const metadata: Metadata = {
  title: 'Automationszentrale',
  description: 'Lokale Automationszentrale – Instagram, E-Mail, Marketing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-screen bg-vemo-dark-50 text-vemo-dark-900">
        <nav className="border-b border-vemo-dark-200 bg-white/95 backdrop-blur sticky top-0 z-50 h-16">
          <div className="max-w-6xl mx-auto px-4 h-full flex items-center gap-8">
            <a href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-75 transition-opacity">
              <span className="w-8 h-8 bg-vemo-green-500 rounded-sm flex items-center justify-center text-white font-bold text-sm">v</span>
              <span className="text-vemo-dark-900">Automationszentrale</span>
            </a>
            <div className="flex items-center gap-1 ml-auto">
              <NavLink href="/" label="Dashboard" />
              <NavLink href="/flows" label="Flows" />
              <NavLink href="/emails" label="E-Mails" />
              <NavLink href="/instagram" label="Instagram" />
              <NavLink href="/connectors" label="Connectors" />
              <NavLink href="/settings" label="Einstellungen" />
            </div>
          </div>
        </nav>
        <main className="min-h-[calc(100vh-4rem)] bg-vemo-dark-50">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <QueryProvider>{children}</QueryProvider>
          </div>
        </main>
      </body>
    </html>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="px-3 py-2 text-sm font-normal text-vemo-dark-600 rounded-sm transition-all duration-200 hover:text-vemo-dark-900 hover:bg-vemo-dark-100"
    >
      {label}
    </a>
  )
}
