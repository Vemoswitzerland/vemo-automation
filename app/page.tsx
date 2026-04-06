import Link from 'next/link'
import { prisma } from '@/lib/db'
import { CONNECTORS } from '@/lib/connectors/registry'

async function getStats() {
  try {
    const [totalEmails, pendingDrafts, instagramPosts, connectorStates] = await Promise.all([
      prisma.email.count(),
      prisma.emailDraft.count({ where: { status: 'pending' } }),
      prisma.instagramPost.count(),
      prisma.connector.findMany({ select: { status: true } }),
    ])
    const connectedCount = connectorStates.filter((c) => c.status === 'connected').length
    return { totalEmails, pendingDrafts, instagramPosts, connectedCount, totalConnectors: CONNECTORS.length }
  } catch {
    return { totalEmails: 0, pendingDrafts: 0, instagramPosts: 0, connectedCount: 0, totalConnectors: CONNECTORS.length }
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  const modules = [
    {
      href: '/emails',
      icon: '📧',
      title: 'E-Mail-Automation',
      description: 'KI-Vorbeantwortung + User-Approval',
      stat: stats.pendingDrafts,
      statLabel: 'ausstehende Entwürfe',
      badge: stats.pendingDrafts > 0 ? stats.pendingDrafts : null,
    },
    {
      href: '/instagram',
      icon: '📸',
      title: 'Instagram-Pipeline',
      description: 'Bild, Skript, Video, Posting',
      stat: stats.instagramPosts,
      statLabel: 'geplante Posts',
      badge: null,
    },
    {
      href: '/connectors',
      icon: '🔌',
      title: 'Connector Hub',
      description: 'Alle Integrationen verwalten: Social Media, E-Mail, KI, CRM',
      stat: stats.connectedCount,
      statLabel: `von ${stats.totalConnectors} verbunden`,
      badge: null,
    },
    {
      href: '/flows',
      icon: '⚡',
      title: 'Flow Dashboard',
      description: 'Alle Verbindungen und aktive Flows visualisiert',
      stat: null,
      statLabel: '',
      badge: null,
    },
    {
      href: '/settings',
      icon: '⚙️',
      title: 'Einstellungen',
      description: 'E-Mail-Konten, API-Keys, Konfiguration',
      stat: null,
      statLabel: '',
      badge: null,
    },
  ]

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-vemo-dark-900">Dashboard</h1>
        <p className="text-vemo-dark-600">Automationszentrale – alles auf einen Blick</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="text-4xl font-bold text-vemo-green-600">{stats.totalEmails}</div>
          <div className="text-sm text-vemo-dark-600 mt-2">E-Mails gesamt</div>
        </div>
        <div className="card">
          <div className="text-4xl font-bold text-vemo-green-600">{stats.pendingDrafts}</div>
          <div className="text-sm text-vemo-dark-600 mt-2">Entwürfe ausstehend</div>
        </div>
        <div className="card">
          <div className="text-4xl font-bold text-vemo-green-600">{stats.instagramPosts}</div>
          <div className="text-sm text-vemo-dark-600 mt-2">Instagram-Posts</div>
        </div>
        <div className="card">
          <div className="text-4xl font-bold text-vemo-green-600">{stats.connectedCount}<span className="text-2xl text-vemo-dark-400">/{stats.totalConnectors}</span></div>
          <div className="text-sm text-vemo-dark-600 mt-2">Connectors verbunden</div>
        </div>
      </div>

      {/* Modules Grid */}
      <div>
        <h2 className="text-lg font-semibold text-vemo-dark-900 mb-4">Funktionen</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="card group relative block hover:shadow-lg transition-shadow duration-200"
            >
              {m.badge && (
                <span className="absolute top-4 right-4 bg-vemo-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {m.badge} neu
                </span>
              )}
              <div className="text-4xl mb-4">{m.icon}</div>
              <h3 className="font-semibold text-vemo-dark-900 group-hover:text-vemo-green-600 transition-colors text-lg">
                {m.title}
              </h3>
              <p className="text-sm text-vemo-dark-600 mt-2">{m.description}</p>
              {m.stat !== null && (
                <div className="mt-4 pt-4 border-t border-vemo-dark-200 text-xs text-vemo-dark-600">
                  <span className="font-semibold text-vemo-green-600">{m.stat}</span> {m.statLabel}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
