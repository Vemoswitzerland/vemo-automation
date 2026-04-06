'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { href: '/', label: 'Flows' },
  { href: '/connections', label: 'Verbindungen' },
  { href: '/settings', label: 'Einstellungen' },
]

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 ml-auto">
      {navItems.map(({ href, label }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
              isActive
                ? 'bg-vemo-green-500 text-white'
                : 'text-vemo-dark-600 hover:text-vemo-dark-900 hover:bg-vemo-dark-100'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
