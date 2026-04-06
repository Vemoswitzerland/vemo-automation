export type ConnectorStatus = 'connected' | 'disconnected' | 'error' | 'pending'
export type AuthType = 'oauth2' | 'api_key' | 'credentials' | 'webhook' | 'none'
export type ConnectorCategory =
  | 'social_media'
  | 'email'
  | 'messaging'
  | 'ai_content'
  | 'storage'
  | 'crm'
  | 'scheduling'
  | 'webhook'

export interface ConnectorField {
  key: string
  label: string
  type: 'text' | 'password' | 'url' | 'number'
  placeholder?: string
  required: boolean
  helpText?: string
}

export interface ConnectorDefinition {
  id: string
  name: string
  icon: string
  category: ConnectorCategory
  authType: AuthType
  description: string
  fields: ConnectorField[]
  actions: string[]
  triggers: string[]
  docsUrl?: string
  color: string
}

export interface ConnectorState {
  id: string
  status: ConnectorStatus
  credentials?: Record<string, string>
  lastTestedAt?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface ConnectorWithState extends ConnectorDefinition {
  state?: ConnectorState
}

export const CATEGORY_LABELS: Record<ConnectorCategory, string> = {
  social_media: 'Social Media',
  email: 'E-Mail',
  messaging: 'Messaging',
  ai_content: 'KI & Content',
  storage: 'Speicher',
  crm: 'CRM',
  scheduling: 'Scheduling',
  webhook: 'Webhooks',
}
