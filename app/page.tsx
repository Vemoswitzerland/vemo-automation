import Link from 'next/link'
import { prisma } from '@/lib/db'

async function getStats() {
  try {
    const [totalEmails, pendingDrafts, instagramPosts] = await Promise.all([
      prisma.email.count(),
      prisma.emailDraft.count({ where: { status: 'pending' } }),
      prisma.instagramPost.count(),
    ])
    return { totalEmails, pendingDrafts, instagramPosts }
  } catch {
    return { totalEmails: 0, pendingDrafts: 0, instagramPosts: 0 }
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
      color: 'sky',
      badge: stats.pendingDrafts > 0 ? stats.pendingDrafts : null,
    },
    {
      href: '/instagram',
      icon: '📸',
      title: 'Instagram-Pipeline',
      description: 'Bild, Skript, Video, Posting',
      stat: stats.instagramPosts,
      statLabel: 'geplante Posts',
      color: 'purple',
      badge: null,
    },
    {
      href: '/settings',
      icon: '⚙️',
      title: 'Einstellungen',
      description: 'E-Mail-Konten, API-Keys, Konfiguration',
      stat: null,
      statLabel: '',
      color: 'gray',
      badge: null,
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Automation Center – alles auf einen Blick</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="text-2xl font-bold text-white">{stats.totalEmails}</div>
          <div className="text-sm text-gray-400 mt-1">E-Mails gesamt</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-sky-400">{stats.pendingDrafts}</div>
          <div className="text-sm text-gray-400 mt-1">Entwürfe warten</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-purple-400">{stats.instagramPosts}</div>
          <div className="text-sm text-gray-400 mt-1">Instagram Posts</div>
        </div>
      </div>

      {/* Modules */}
      <div className="grid grid-cols-3 gap-4">
        {modules.map((m) => (
          <Link key={m.href} href={m.href} className="card hover:border-gray-700 transition-colors group relative block">
            {m.badge && (
              <span className="absolute top-4 right-4 bg-sky-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {m.badge}
              </span>
            )}
            <div className="text-3xl mb-3">{m.icon}</div>
            <h2 className="font-semibold text-white group-hover:text-sky-400 transition-colors">{m.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{m.description}</p>
            {m.stat !== null && (
              <div className="mt-3 text-xs text-gray-500">
                <span className="text-white font-medium">{m.stat}</span> {m.statLabel}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
