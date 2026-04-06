import { prisma } from '@/lib/db'
import { CONNECTORS } from '@/lib/connectors/registry'
import { ConnectorWithState } from '@/lib/connectors/types'
import CredentialManager from '@/components/settings/CredentialManager'
import OnboardingWizard from '@/components/settings/OnboardingWizard'
import EmailAccountSettings from '@/components/email/EmailAccountSettings'

async function getConnectorsWithState(): Promise<ConnectorWithState[]> {
  const states = await prisma.connector.findMany()
  const stateMap = new Map(states.map((s) => [s.id, s]))

  return CONNECTORS.map((def) => {
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
}

export default async function SettingsPage() {
  const connectors = await getConnectorsWithState()
  const connectedCount = connectors.filter((c) => c.state?.status === 'connected').length
  const showWizard = connectedCount === 0

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-600 text-sm">
          API-Keys, Credentials und Connector-Konfiguration
        </p>
      </div>

      {/* Onboarding Wizard — only when nothing is configured */}
      {showWizard && (
        <section>
          <OnboardingWizard />
        </section>
      )}

      {/* Connector Credentials */}
      <section>
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">
            Alle Connector Credentials
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Konfiguriere API-Keys für alle Integrationen. Credentials werden verschlüsselt in der Datenbank gespeichert.
          </p>
        </div>
        <CredentialManager connectors={connectors} />
      </section>

      {/* Email Accounts */}
      <section>
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">E-Mail Konten</h2>
          <p className="text-sm text-gray-600 mt-1">
            IMAP/SMTP-Zugänge für automatisiertes E-Mail-Management
          </p>
        </div>
        <EmailAccountSettings />
      </section>
    </div>
  )
}
