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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body className="min-h-screen bg-vemo-dark-50 text-vemo-dark-900">
        <nav className="border-b border-vemo-dark-200 bg-white/95 backdrop-blur sticky top-0 z-50 h-auto md:h-16">
          <div className="max-w-full md:max-w-6xl mx-auto px-3 md:px-4 py-3 md:py-0 md:h-full flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
            <a href="/" className="flex items-center gap-2 font-bold text-sm md:text-lg tracking-tight hover:opacity-75 transition-opacity flex-shrink-0">
              <span className="w-8 h-8 bg-vemo-green-500 rounded-sm flex items-center justify-center text-white font-bold text-xs">v</span>
              <span className="text-vemo-dark-900 hidden sm:inline">Automationszentrale</span>
            </a>
            <div className="flex items-center gap-0.5 md:gap-1 ml-auto md:ml-auto overflow-x-auto pb-1 md:pb-0">
              <NavLink href="/" label="Dashboard" />
              <NavLink href="/flows" label="Flows" />
              <NavLink href="/approvals" label="Approvals" />
              <NavLink href="/emails" label="E-Mails" />
              <NavLink href="/instagram" label="Insta" shortLabel />
              <NavLink href="/connectors" label="Connectors" />
              <NavLink href="/settings" label="⚙️" shortLabel />
            </div>
          </div>
        </nav>
        <main className="min-h-[calc(100vh-auto)] bg-vemo-dark-50">
          <div className="w-full px-3 md:px-4 py-6 md:py-8 md:max-w-6xl md:mx-auto">
            <QueryProvider>{children}</QueryProvider>
          </div>
        </main>
      </body>
    </html>
  )
}

function NavLink({ href, label, shortLabel }: { href: string; label: string; shortLabel?: boolean }) {
  return (
    <a
      href={href}
      className="px-2.5 md:px-3 py-2.5 md:py-2 text-xs md:text-sm font-normal text-vemo-dark-600 rounded-sm transition-all duration-200 hover:text-vemo-dark-900 hover:bg-vemo-dark-100 whitespace-nowrap flex-shrink-0 inline-flex items-center justify-center"
      title={label}
    >
      {shortLabel ? (
        <>
          <span className="hidden md:inline">{label}</span>
          <span className="md:hidden">{label.charAt(0).toUpperCase()}</span>
        </>
      ) : (
        <span className="hidden md:inline">{label}</span>
      )}
      {shortLabel && !label.includes('⚙️') && label !== 'Insta' && (
        <span className="md:hidden">{label.substring(0, 3)}</span>
      )}
    </a>
  )
}
