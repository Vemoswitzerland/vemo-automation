import { ConnectorDefinition } from './types'

export const CONNECTORS: ConnectorDefinition[] = [
  // ─── Social Media ───────────────────────────────────────────────────────────
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    category: 'social_media',
    authType: 'api_key',
    description: 'Posts, Stories und Reels über die Graph API veröffentlichen',
    color: 'from-pink-500 to-purple-600',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'IGQV...', required: true, helpText: 'Meta Business Manager → Graph API Explorer' },
      { key: 'business_account_id', label: 'Business Account ID', type: 'text', placeholder: '12345678', required: true },
    ],
    actions: ['Post Bild', 'Post Reel', 'Post Story', 'Post planen', 'Analytics abrufen'],
    triggers: ['Neuer Kommentar', 'Neue Mention', 'Post veröffentlicht'],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    category: 'social_media',
    authType: 'oauth2',
    description: 'Beiträge auf LinkedIn-Profil und Unternehmensseiten teilen',
    color: 'from-blue-600 to-blue-700',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: '86abc...', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'xxxxx...', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'AQV...', required: false, helpText: 'Nach OAuth-Flow generiert' },
    ],
    actions: ['Beitrag erstellen', 'Artikel publizieren', 'Bild posten', 'Analytics abrufen'],
    triggers: ['Neuer Like', 'Neuer Kommentar', 'Neue Verbindungsanfrage'],
  },
  {
    id: 'twitter_x',
    name: 'Twitter / X',
    icon: '🐦',
    category: 'social_media',
    authType: 'api_key',
    description: 'Tweets, Threads und Antworten automatisiert posten',
    color: 'from-gray-800 to-gray-900',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxx...', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'xxxxx...', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'xxxxx...', required: true },
      { key: 'access_token_secret', label: 'Access Token Secret', type: 'password', placeholder: 'xxxxx...', required: true },
    ],
    actions: ['Tweet posten', 'Thread starten', 'Antworten', 'Retweet', 'Like'],
    triggers: ['Neue Mention', 'Neuer Follower', 'Neuer DM'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    category: 'social_media',
    authType: 'oauth2',
    description: 'Videos auf TikTok über die Creator API hochladen',
    color: 'from-red-500 to-pink-600',
    fields: [
      { key: 'client_key', label: 'Client Key', type: 'text', placeholder: 'aw...', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'xxxxx...', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'act...', required: false },
    ],
    actions: ['Video hochladen', 'Video planen', 'Analytics abrufen'],
    triggers: ['Neues Kommentar', 'Neue Mention', 'Video veröffentlicht'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    category: 'social_media',
    authType: 'api_key',
    description: 'Posts, Bilder und Videos auf Facebook-Seiten publizieren',
    color: 'from-blue-500 to-blue-600',
    fields: [
      { key: 'page_access_token', label: 'Page Access Token', type: 'password', placeholder: 'EAAx...', required: true },
      { key: 'page_id', label: 'Page ID', type: 'text', placeholder: '12345678', required: true },
    ],
    actions: ['Post erstellen', 'Bild posten', 'Video posten', 'Story erstellen', 'Analytics abrufen'],
    triggers: ['Neuer Kommentar', 'Neue Reaction', 'Neuer Follower'],
  },

  // ─── E-Mail ──────────────────────────────────────────────────────────────────
  {
    id: 'gmail',
    name: 'Gmail',
    icon: '📧',
    category: 'email',
    authType: 'credentials',
    description: 'E-Mails lesen, KI-Antworten generieren und versenden',
    color: 'from-red-400 to-red-500',
    fields: [
      { key: 'email', label: 'E-Mail Adresse', type: 'text', placeholder: 'du@gmail.com', required: true },
      { key: 'password', label: 'App-Passwort', type: 'password', placeholder: 'xxxx xxxx xxxx xxxx', required: true, helpText: 'Google → Konto → Sicherheit → App-Passwörter' },
    ],
    actions: ['E-Mails abrufen', 'E-Mail senden', 'E-Mail beantworten', 'Label setzen', 'Archivieren'],
    triggers: ['Neue E-Mail', 'E-Mail mit Keyword', 'E-Mail von Absender'],
  },
  {
    id: 'outlook',
    name: 'Outlook / Microsoft 365',
    icon: '📨',
    category: 'email',
    authType: 'oauth2',
    description: 'Microsoft 365 E-Mails über die Graph API verwalten',
    color: 'from-blue-500 to-blue-600',
    fields: [
      { key: 'client_id', label: 'Client ID (App Registration)', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-...', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'xxxxx...', required: true },
      { key: 'tenant_id', label: 'Tenant ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-...', required: true },
    ],
    actions: ['E-Mails abrufen', 'E-Mail senden', 'Kalender lesen', 'Meeting erstellen'],
    triggers: ['Neue E-Mail', 'Neues Kalender-Event', 'E-Mail mit Flag'],
  },

  // ─── Messaging ───────────────────────────────────────────────────────────────
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    category: 'messaging',
    authType: 'api_key',
    description: 'Nachrichten und Medien über Telegram Bots senden',
    color: 'from-sky-400 to-sky-500',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: '123456:ABC...', required: true, helpText: 'Von @BotFather erstellt' },
      { key: 'chat_id', label: 'Standard Chat ID', type: 'text', placeholder: '-100123456', required: false },
    ],
    actions: ['Nachricht senden', 'Bild senden', 'Dokument senden', 'Broadcast an Kanal'],
    triggers: ['Neue Nachricht', 'Neuer Befehl', 'Neues Channel-Event'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    icon: '💬',
    category: 'messaging',
    authType: 'api_key',
    description: 'WhatsApp Business API für automatisierte Kundenkommunikation',
    color: 'from-green-500 to-green-600',
    fields: [
      { key: 'access_token', label: 'Permanent Access Token', type: 'password', placeholder: 'EAAx...', required: true },
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', placeholder: '12345678', required: true },
      { key: 'business_account_id', label: 'WhatsApp Business Account ID', type: 'text', placeholder: '12345678', required: true },
    ],
    actions: ['Textnachricht senden', 'Template senden', 'Medien senden', 'Broadcast'],
    triggers: ['Neue Nachricht', 'Nachricht gelesen', 'Status-Update'],
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '💼',
    category: 'messaging',
    authType: 'api_key',
    description: 'Nachrichten in Slack-Channels und DMs senden',
    color: 'from-purple-500 to-purple-600',
    fields: [
      { key: 'bot_token', label: 'Bot OAuth Token', type: 'password', placeholder: 'xoxb-...', required: true, helpText: 'Slack App → OAuth & Permissions' },
      { key: 'default_channel', label: 'Standard Channel', type: 'text', placeholder: '#general', required: false },
    ],
    actions: ['Nachricht posten', 'Block Message senden', 'File uploaden', 'Reaction hinzufügen'],
    triggers: ['Neue Nachricht', 'Neue Mention', 'Neuer Befehl', 'Reaction hinzugefügt'],
  },

  // ─── KI & Content ────────────────────────────────────────────────────────────
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    category: 'ai_content',
    authType: 'api_key',
    description: 'GPT-4, DALL-E und Whisper für Content-Generierung nutzen',
    color: 'from-emerald-500 to-teal-600',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true, helpText: 'platform.openai.com → API Keys' },
      { key: 'organization_id', label: 'Organization ID (optional)', type: 'text', placeholder: 'org-...', required: false },
    ],
    actions: ['Text generieren (GPT-4)', 'Bild generieren (DALL-E)', 'Audio transkribieren (Whisper)', 'Embedding erstellen'],
    triggers: [],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    icon: '🧠',
    category: 'ai_content',
    authType: 'api_key',
    description: 'Claude für intelligente Texte, Analysen und Code nutzen',
    color: 'from-orange-400 to-amber-500',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-...', required: true, helpText: 'console.anthropic.com → API Keys' },
    ],
    actions: ['Text generieren', 'Analyse durchführen', 'Code schreiben', 'E-Mail vorbeantworten'],
    triggers: [],
  },
  {
    id: 'stable_diffusion',
    name: 'Stable Diffusion',
    icon: '🎨',
    category: 'ai_content',
    authType: 'api_key',
    description: 'Bilder mit Stable Diffusion API (Stability AI) generieren',
    color: 'from-violet-500 to-purple-600',
    fields: [
      { key: 'api_key', label: 'Stability API Key', type: 'password', placeholder: 'sk-...', required: true, helpText: 'platform.stability.ai → API Keys' },
    ],
    actions: ['Bild generieren', 'Bild variieren', 'Upscaling', 'Inpainting'],
    triggers: [],
  },

  // ─── Speicher ────────────────────────────────────────────────────────────────
  {
    id: 'google_drive',
    name: 'Google Drive',
    icon: '📁',
    category: 'storage',
    authType: 'oauth2',
    description: 'Dateien in Google Drive hochladen, lesen und organisieren',
    color: 'from-yellow-500 to-green-500',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'xxxxx.apps.googleusercontent.com', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'GOCSPX-...', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', placeholder: '1//...', required: false, helpText: 'Nach OAuth-Flow generiert' },
    ],
    actions: ['Datei hochladen', 'Datei lesen', 'Ordner erstellen', 'Datei teilen', 'In Sheets schreiben'],
    triggers: ['Neue Datei', 'Datei geändert', 'Ordner geändert'],
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: '📦',
    category: 'storage',
    authType: 'oauth2',
    description: 'Dateien über die Dropbox API verwalten und synchronisieren',
    color: 'from-blue-500 to-blue-600',
    fields: [
      { key: 'app_key', label: 'App Key', type: 'text', placeholder: 'xxxxx', required: true },
      { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: 'xxxxx', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'sl.xxx...', required: false },
    ],
    actions: ['Datei hochladen', 'Datei herunterladen', 'Ordner auflisten', 'Link teilen'],
    triggers: ['Neue Datei', 'Datei geändert'],
  },

  // ─── CRM ─────────────────────────────────────────────────────────────────────
  {
    id: 'hubspot',
    name: 'HubSpot',
    icon: '🔶',
    category: 'crm',
    authType: 'api_key',
    description: 'Kontakte, Deals und Marketing in HubSpot CRM verwalten',
    color: 'from-orange-500 to-orange-600',
    fields: [
      { key: 'access_token', label: 'Private App Access Token', type: 'password', placeholder: 'pat-...', required: true, helpText: 'HubSpot → Einstellungen → Integrationen → Private Apps' },
    ],
    actions: ['Kontakt erstellen', 'Deal erstellen', 'Kontakt suchen', 'E-Mail tracken', 'Aktivität loggen'],
    triggers: ['Neuer Kontakt', 'Deal geschlossen', 'Formular ausgefüllt'],
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    icon: '🔵',
    category: 'crm',
    authType: 'api_key',
    description: 'Sales-Pipeline und Kontakte in Pipedrive CRM verwalten',
    color: 'from-green-500 to-teal-500',
    fields: [
      { key: 'api_token', label: 'API Token', type: 'password', placeholder: 'xxxxx...', required: true, helpText: 'Pipedrive → Einstellungen → API' },
    ],
    actions: ['Deal erstellen', 'Person erstellen', 'Deal aktualisieren', 'Aktivität hinzufügen', 'Pipeline abrufen'],
    triggers: ['Neuer Deal', 'Deal gewonnen', 'Deal verloren', 'Neue Person'],
  },

  // ─── Scheduling ──────────────────────────────────────────────────────────────
  {
    id: 'calendly',
    name: 'Calendly',
    icon: '📅',
    category: 'scheduling',
    authType: 'api_key',
    description: 'Buchungen und Termine über Calendly verwalten und reagieren',
    color: 'from-blue-400 to-blue-600',
    fields: [
      { key: 'access_token', label: 'Personal Access Token', type: 'password', placeholder: 'eyJh...', required: true, helpText: 'Calendly → Integrationen → API & Webhooks' },
    ],
    actions: ['Buchungen abrufen', 'Verfügbarkeit prüfen', 'Einladungslink generieren'],
    triggers: ['Neue Buchung', 'Buchung storniert', 'Buchung neu geplant'],
  },

  // ─── Webhooks ────────────────────────────────────────────────────────────────
  {
    id: 'webhook_in',
    name: 'Webhook Eingang',
    icon: '🔌',
    category: 'webhook',
    authType: 'none',
    description: 'Externe Systeme können Events an diese Zentrale senden',
    color: 'from-gray-600 to-gray-700',
    fields: [
      { key: 'secret', label: 'Webhook Secret (optional)', type: 'password', placeholder: 'xxx...', required: false, helpText: 'Zum Validieren eingehender Requests' },
    ],
    actions: [],
    triggers: ['Event empfangen', 'Payload verarbeiten'],
  },
  {
    id: 'webhook_out',
    name: 'Webhook Ausgang',
    icon: '📡',
    category: 'webhook',
    authType: 'credentials',
    description: 'Events an externe URLs senden (HTTP POST)',
    color: 'from-gray-600 to-gray-700',
    fields: [
      { key: 'url', label: 'Ziel-URL', type: 'url', placeholder: 'https://...', required: true },
      { key: 'secret', label: 'Bearer Token / Secret (optional)', type: 'password', placeholder: 'xxxxx', required: false },
    ],
    actions: ['POST senden', 'GET anfragen', 'Payload formatieren'],
    triggers: [],
  },
]

export function getConnectorById(id: string): ConnectorDefinition | undefined {
  return CONNECTORS.find((c) => c.id === id)
}

export function getConnectorsByCategory(category: string): ConnectorDefinition[] {
  return CONNECTORS.filter((c) => c.category === category)
}
