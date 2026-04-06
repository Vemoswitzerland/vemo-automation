import Link from 'next/link'
import { prisma } from '@/lib/db'
import { CONNECTORS } from '@/lib/connectors/registry'
import { CATEGORY_LABELS, ConnectorCategory, ConnectorWithState } from '@/lib/connectors/types'

async function getMainboardData() {
  try {
    const [states, totalEmails, pendingDrafts, instagramPosts, lastInstagramPost, sentDrafts] = await Promise.all([
      prisma.connector.findMany(),
      prisma.email.count(),
      prisma.emailDraft.count({ where: { status: 'pending' } }),
      prisma.instagramPost.count(),
      prisma.instagramPost.findFirst({ orderBy: { createdAt: 'desc' } }),
      prisma.emailDraft.count({ where: { status: 'sent' } }),
    ])
    const stateMap = new Map(states.map((s) => [s.id, s]))
    const connectors: ConnectorWithState[] = CONNECTORS.map((def) => {
      const state = stateMap.get(def.id)
      return {
        ...def,
        state: state
          ? {
              id: state.id,
              status: state.status as 'connected' | 'disconnected' | 'error' | 'pending',
              lastTestedAt: state.lastTestedAt?.toISOString(),
              errorMessage: state.errorMessage ?? undefined,
              createdAt: state.createdAt.toISOString(),
              updatedAt: state.updatedAt.toISOString(),
            }
          : undefined,
      }
    })
    const connectedCount = connectors.filter((c) => c.state?.status === 'connected').length
    const dbOnline = true
    return {
      connectors, connectedCount, totalConnectors: CONNECTORS.length,
      totalEmails, pendingDrafts, instagramPosts, lastInstagramPost, sentDrafts, dbOnline,
    }
  } catch {
    return {
      connectors: CONNECTORS.map((def) => ({ ...def, state: undefined })),
      connectedCount: 0,
      totalConnectors: CONNECTORS.length,
      totalEmails: 0,
      pendingDrafts: 0,
      instagramPosts: 0,
      lastInstagramPost: null,
      sentDrafts: 0,
      dbOnline: false,
    }
  }
}

const flows = [
  { icon: '📧', title: 'E-Mail Auto-Response', steps: 'Gmail → KI → Entwurf → Approval', status: 'active' },
  { icon: '📸', title: 'Instagram Pipeline', steps: 'Scheduler → Content → Bild → Publish', status: 'active' },
  { icon: '📊', title: 'Daily Report', steps: 'Scheduler → Daten → Report → Telegram', status: 'paused' },
  { icon: '🎯', title: 'Marketing Campaign', steps: 'Trigger → AI → Multi-Channel', status: 'idle' },
]

function StatusDot({ status }: { status?: string }) {
  if (status === 'connected')
    return <span className="w-2 h-2 rounded-full bg-vemo-green-500 inline-block" title="Verbunden" />
  if (status === 'error')
    return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Fehler" />
  if (status === 'pending')
    return <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block animate-pulse" title="Ausstehend" />
  return <span className="w-2 h-2 rounded-full bg-vemo-dark-300 inline-block" title="Nicht verbunden" />
}

function ConnectionBadge({ status }: { status?: string }) {
  if (status === 'connected')
    return <span className="text-xs px-2 py-0.5 rounded-full bg-vemo-green-100 text-vemo-green-700 font-semibold border border-vemo-green-200">✓ Verbunden</span>
  if (status === 'error')
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold border border-red-200">✗ Fehler</span>
  if (status === 'pending')
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold border border-yellow-200 animate-pulse">⏳ Warte</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-vemo-dark-100 text-vemo-dark-500 font-semibold border border-vemo-dark-200">— Nicht konfiguriert</span>
}

function FlowStatusBadge({ status }: { status: string }) {
  const cfg = {
    active: 'bg-vemo-green-50 text-vemo-green-700 border border-vemo-green-200',
    paused: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    idle: 'bg-vemo-dark-100 text-vemo-dark-500 border border-vemo-dark-200',
  }[status] ?? 'bg-vemo-dark-100 text-vemo-dark-500'
  const label = { active: 'Aktiv', paused: 'Pausiert', idle: 'Idle' }[status] ?? status
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg}`}>{label}</span>
  )
}

export default async function MainboardPage() {
  const {
    connectors, connectedCount, totalConnectors,
    totalEmails, pendingDrafts, instagramPosts, lastInstagramPost, sentDrafts, dbOnline,
  } = await getMainboardData()

  const activeFlows = flows.filter((f) => f.status === 'active').length
  const categories = Object.keys(CATEGORY_LABELS) as ConnectorCategory[]
  const grouped = categories
    .map((cat) => ({
      key: cat,
      label: CATEGORY_LABELS[cat],
      items: connectors.filter((c) => c.category === cat),
    }))
    .filter((g) => g.items.length > 0)

  const instagramConnector = connectors.find((c) => c.id === 'instagram')
  const gmailConnector = connectors.find((c) => c.id === 'gmail')
  const claudeConnector = connectors.find((c) => c.id === 'anthropic')

  return (
    <div className="space-y-8">
      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-vemo-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-vemo-green-600 uppercase tracking-widest">Live</span>
          </div>
          <h1 className="text-3xl font-bold text-vemo-dark-900">Mainboard</h1>
          <p className="text-vemo-dark-500 mt-1">Alle Hauptverbindungen, aktive Flows und Live-Status auf einen Blick</p>
        </div>
        <Link href="/connectors" className="btn-primary text-sm">
          + Connector
        </Link>
      </div>

      {/* ── 4 Featured Connection Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Instagram Card */}
        <div className={`card p-5 flex flex-col gap-3 border-t-4 ${instagramConnector?.state?.status === 'connected' ? 'border-t-pink-500' : 'border-t-vemo-dark-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📸</span>
              <span className="font-bold text-vemo-dark-900 text-sm">Instagram</span>
            </div>
            <ConnectionBadge status={instagramConnector?.state?.status} />
          </div>
          <div className="space-y-1 flex-1">
            <div className="text-2xl font-bold text-vemo-dark-900">{instagramPosts}</div>
            <div className="text-xs text-vemo-dark-500">Posts erstellt</div>
            {lastInstagramPost && (
              <div className="text-xs text-vemo-dark-400 truncate mt-1" title={lastInstagramPost.caption}>
                Letzter: {lastInstagramPost.caption.slice(0, 40)}{lastInstagramPost.caption.length > 40 ? '…' : ''}
              </div>
            )}
            {!lastInstagramPost && (
              <div className="text-xs text-vemo-dark-300 mt-1">Noch kein Post</div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Link href="/instagram" className="btn-primary text-xs py-1.5 px-3 flex-1 text-center">
              Post erstellen
            </Link>
            <Link href="/connectors/instagram" className="btn-outline text-xs py-1.5 px-3">
              ⚙
            </Link>
          </div>
        </div>

        {/* Gmail / E-Mail Card */}
        <div className={`card p-5 flex flex-col gap-3 border-t-4 ${gmailConnector?.state?.status === 'connected' ? 'border-t-red-400' : 'border-t-vemo-dark-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📧</span>
              <span className="font-bold text-vemo-dark-900 text-sm">Gmail</span>
            </div>
            <ConnectionBadge status={gmailConnector?.state?.status} />
          </div>
          <div className="space-y-1 flex-1">
            <div className="text-2xl font-bold text-vemo-dark-900">
              {pendingDrafts}
              {pendingDrafts > 0 && <span className="ml-1 text-sm font-normal text-vemo-green-600 animate-pulse">neu</span>}
            </div>
            <div className="text-xs text-vemo-dark-500">Drafts ausstehend</div>
            <div className="text-xs text-vemo-dark-400 mt-1">
              {totalEmails} E-Mails · {sentDrafts} gesendet
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Link href="/emails" className="btn-primary text-xs py-1.5 px-3 flex-1 text-center">
              {pendingDrafts > 0 ? `${pendingDrafts} Drafts prüfen` : 'E-Mails ansehen'}
            </Link>
            <Link href="/connectors/gmail" className="btn-outline text-xs py-1.5 px-3">
              ⚙
            </Link>
          </div>
        </div>

        {/* Supabase / DB Card */}
        <div className={`card p-5 flex flex-col gap-3 border-t-4 ${dbOnline ? 'border-t-emerald-500' : 'border-t-red-500'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🗄️</span>
              <span className="font-bold text-vemo-dark-900 text-sm">Datenbank</span>
            </div>
            <ConnectionBadge status={dbOnline ? 'connected' : 'error'} />
          </div>
          <div className="space-y-1 flex-1">
            <div className="text-2xl font-bold text-vemo-dark-900">{dbOnline ? 'Online' : 'Offline'}</div>
            <div className="text-xs text-vemo-dark-500">SQLite lokal</div>
            <div className="text-xs text-vemo-dark-400 mt-1 space-y-0.5">
              <div>{totalEmails} E-Mails · {instagramPosts} Posts</div>
              <div>{connectedCount} Connectors aktiv</div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Link href="/settings" className="btn-outline text-xs py-1.5 px-3 flex-1 text-center">
              DB-Einstellungen
            </Link>
          </div>
        </div>

        {/* Claude / AI Card */}
        <div className={`card p-5 flex flex-col gap-3 border-t-4 ${claudeConnector?.state?.status === 'connected' ? 'border-t-orange-400' : 'border-t-vemo-dark-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧠</span>
              <span className="font-bold text-vemo-dark-900 text-sm">Claude AI</span>
            </div>
            <ConnectionBadge status={claudeConnector?.state?.status} />
          </div>
          <div className="space-y-1 flex-1">
            <div className="text-2xl font-bold text-vemo-dark-900">{sentDrafts}</div>
            <div className="text-xs text-vemo-dark-500">KI-Drafts generiert</div>
            <div className="text-xs text-vemo-dark-400 mt-1">
              {claudeConnector?.state?.lastTestedAt
                ? `Zuletzt: ${new Date(claudeConnector.state.lastTestedAt).toLocaleDateString('de-CH')}`
                : 'API-Key konfigurieren'}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Link href="/connectors/anthropic" className="btn-primary text-xs py-1.5 px-3 flex-1 text-center">
              AI konfigurieren
            </Link>
          </div>
        </div>
      </div>

      {/* ── System Overview Bar ─────────────────────────────────────── */}
      <div className="card py-3 px-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-vemo-dark-700">Alle Services</span>
              <span className="text-xs text-vemo-dark-500">
                {connectedCount}/{totalConnectors} verbunden
              </span>
            </div>
            <div className="h-2 bg-vemo-dark-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-vemo-green-500 to-vemo-green-600 rounded-full transition-all duration-500"
                style={{ width: `${totalConnectors > 0 ? (connectedCount / totalConnectors) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs text-vemo-dark-500 shrink-0">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-vemo-green-500 inline-block" /> {connectedCount} aktiv</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> {activeFlows} Flows</span>
            <span className="flex items-center gap-1.5">⚡ {pendingDrafts > 0 ? `${pendingDrafts} Drafts warten` : 'Alles erledigt'}</span>
          </div>
        </div>
      </div>

      {/* ── Main Grid: Connectors + Flows ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connector Hub — 2/3 width */}
        <div className="lg:col-span-2 space-y-8">
          {grouped.map((group) => {
            const groupConnected = group.items.filter((c) => c.state?.status === 'connected').length
            return (
              <section key={group.key}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider">
                    {group.label}
                  </h2>
                  <span className="text-xs text-vemo-dark-500">
                    {groupConnected}/{group.items.length} verbunden
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {group.items.map((connector) => {
                    const isConnected = connector.state?.status === 'connected'
                    return (
                      <Link
                        key={connector.id}
                        href={`/connectors/${connector.id}`}
                        className={`card group p-4 flex items-start gap-3 hover:shadow-md transition-all duration-200 ${
                          isConnected ? 'border-vemo-green-200 bg-vemo-green-50/30' : ''
                        }`}
                      >
                        <div className="relative shrink-0">
                          <span className="text-2xl">{connector.icon}</span>
                          <StatusDot status={connector.state?.status} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-vemo-dark-900 group-hover:text-vemo-green-600 transition-colors truncate">
                            {connector.name}
                          </div>
                          <div className="text-xs text-vemo-dark-400 mt-0.5 capitalize">
                            {connector.state?.status === 'connected'
                              ? 'Verbunden'
                              : connector.state?.status === 'error'
                              ? 'Fehler'
                              : connector.state?.status === 'pending'
                              ? 'Ausstehend'
                              : 'Nicht verbunden'}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        {/* Right Panel: Flows + Quick Actions — 1/3 width */}
        <div className="space-y-6">
          {/* Active Flows */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider">Flows</h2>
              <Link href="/flows" className="text-xs text-vemo-green-600 hover:text-vemo-green-700 font-semibold">
                Alle ansehen →
              </Link>
            </div>
            <div className="space-y-3">
              {flows.map((flow) => (
                <div
                  key={flow.title}
                  className="flex items-start gap-3 p-3 rounded-md bg-vemo-dark-50 hover:bg-vemo-dark-100 transition-colors cursor-pointer"
                >
                  <span className="text-lg mt-0.5 shrink-0">{flow.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-vemo-dark-900 truncate">{flow.title}</span>
                      <FlowStatusBadge status={flow.status} />
                    </div>
                    <p className="text-xs text-vemo-dark-400 mt-0.5 truncate">{flow.steps}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-vemo-dark-200">
              <Link href="/flows" className="btn-outline w-full text-center text-sm py-2">
                + Neuer Flow
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider mb-4">Schnellzugriff</h2>
            <div className="space-y-2">
              <Link
                href="/emails"
                className="flex items-center gap-3 p-3 rounded-md hover:bg-vemo-dark-50 transition-colors group"
              >
                <span className="text-xl">📧</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-vemo-dark-900 group-hover:text-vemo-green-600 transition-colors">
                    E-Mail-Automation
                  </div>
                  {pendingDrafts > 0 && (
                    <div className="text-xs text-vemo-dark-500">{pendingDrafts} Entwürfe warten</div>
                  )}
                </div>
                {pendingDrafts > 0 && (
                  <span className="bg-vemo-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingDrafts}
                  </span>
                )}
              </Link>
              <Link
                href="/instagram"
                className="flex items-center gap-3 p-3 rounded-md hover:bg-vemo-dark-50 transition-colors group"
              >
                <span className="text-xl">📸</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-vemo-dark-900 group-hover:text-vemo-green-600 transition-colors">
                    Instagram Pipeline
                  </div>
                  <div className="text-xs text-vemo-dark-500">{instagramPosts} Posts erstellt</div>
                </div>
              </Link>
              <Link
                href="/connectors"
                className="flex items-center gap-3 p-3 rounded-md hover:bg-vemo-dark-50 transition-colors group"
              >
                <span className="text-xl">🔌</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-vemo-dark-900 group-hover:text-vemo-green-600 transition-colors">
                    Connector Hub
                  </div>
                  <div className="text-xs text-vemo-dark-500">
                    {connectedCount} von {totalConnectors} konfiguriert
                  </div>
                </div>
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 p-3 rounded-md hover:bg-vemo-dark-50 transition-colors group"
              >
                <span className="text-xl">⚙️</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-vemo-dark-900 group-hover:text-vemo-green-600 transition-colors">
                    Einstellungen
                  </div>
                  <div className="text-xs text-vemo-dark-500">API-Keys, E-Mail-Konten</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
