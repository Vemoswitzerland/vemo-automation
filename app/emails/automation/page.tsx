import AutomationRulesPanel from '@/components/email/AutomationRulesPanel'
import AutomationStats from '@/components/email/AutomationStats'
import { prisma } from '@/lib/db'

async function hasEmailAccounts(): Promise<boolean> {
  try {
    const count = await prisma.emailAccount.count({ where: { isActive: true } })
    return count > 0
  } catch {
    return false
  }
}

export default async function AutomationPage() {
  const hasAccounts = await hasEmailAccounts()
  const isMock = !hasAccounts && !process.env.GMAIL_USER

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vemo-dark-900">E-Mail-Automation</h1>
          <p className="text-vemo-dark-600 text-sm mt-1">
            Rule-Engine · Auto-Replies · Logging · Performance-Dashboard
          </p>
        </div>
        {isMock && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg">
            Demo-Modus — keine echte E-Mail-Verbindung
          </div>
        )}
      </div>

      {/* Performance Dashboard */}
      <section>
        <h2 className="text-lg font-semibold text-vemo-dark-800 mb-3">Performance-Dashboard</h2>
        <AutomationStats isMock={isMock} />
      </section>

      {/* Rules Management */}
      <section>
        <AutomationRulesPanel isMock={isMock} />
      </section>
    </div>
  )
}
