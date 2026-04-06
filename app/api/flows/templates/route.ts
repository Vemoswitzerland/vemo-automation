import { NextResponse } from 'next/server'

const templates = [
  {
    id: 'tpl-email-automation',
    name: 'E-Mail Automation',
    description: 'Eingehende E-Mails automatisch analysieren, Entwurf erstellen und nach Freigabe versenden.',
    icon: 'Mail',
    category: 'E-Mail',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 80, y: 200 },
        data: { label: 'Gmail Trigger', type: 'gmail', description: 'Neue E-Mail empfangen' },
      },
      {
        id: 'ai-1',
        type: 'ai',
        position: { x: 340, y: 200 },
        data: { label: 'KI-Analyse', type: 'openai', description: 'E-Mail analysieren & klassifizieren' },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 600, y: 200 },
        data: { label: 'Entwurf erstellen', type: 'gmail_draft', description: 'Antwort-Entwurf generieren' },
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 860, y: 200 },
        data: { label: 'Telegram Approval', type: 'telegram', description: 'Freigabe per Telegram anfordern' },
      },
      {
        id: 'action-3',
        type: 'action',
        position: { x: 1120, y: 200 },
        data: { label: 'E-Mail senden', type: 'gmail_send', description: 'Freigegebene Antwort versenden' },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'ai-1', animated: true },
      { id: 'e2-3', source: 'ai-1', target: 'action-1' },
      { id: 'e3-4', source: 'action-1', target: 'action-2' },
      { id: 'e4-5', source: 'action-2', target: 'action-3' },
    ],
  },
  {
    id: 'tpl-instagram-pipeline',
    name: 'Instagram Pipeline',
    description: 'Geplanter Content wird per KI erstellt, Bilder generiert und nach Freigabe auf Instagram gepostet.',
    icon: 'Instagram',
    category: 'Social Media',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 80, y: 200 },
        data: { label: 'Schedule Trigger', type: 'schedule', description: 'Taeglich um 09:00' },
      },
      {
        id: 'ai-1',
        type: 'ai',
        position: { x: 340, y: 200 },
        data: { label: 'Content AI', type: 'openai', description: 'Caption & Hashtags generieren' },
      },
      {
        id: 'ai-2',
        type: 'ai',
        position: { x: 600, y: 200 },
        data: { label: 'Bildgenerierung', type: 'dalle', description: 'Bild mit DALL-E erstellen' },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 860, y: 200 },
        data: { label: 'Approval', type: 'telegram', description: 'Bild & Text zur Freigabe senden' },
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 1120, y: 200 },
        data: { label: 'Instagram Post', type: 'instagram', description: 'Auf Instagram veroeffentlichen' },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'ai-1', animated: true },
      { id: 'e2-3', source: 'ai-1', target: 'ai-2' },
      { id: 'e3-4', source: 'ai-2', target: 'action-1' },
      { id: 'e4-5', source: 'action-1', target: 'action-2' },
    ],
  },
  {
    id: 'tpl-whatsapp-bot',
    name: 'WhatsApp Bot',
    description: 'Eingehende WhatsApp-Nachrichten per KI klassifizieren und automatisch beantworten oder weiterleiten.',
    icon: 'MessageCircle',
    category: 'Messaging',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 80, y: 250 },
        data: { label: 'WhatsApp Incoming', type: 'whatsapp', description: 'Neue WhatsApp-Nachricht' },
      },
      {
        id: 'ai-1',
        type: 'ai',
        position: { x: 380, y: 250 },
        data: { label: 'KI-Klassifizierung', type: 'openai', description: 'Nachricht analysieren & kategorisieren' },
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 680, y: 250 },
        data: { label: 'If/Then', type: 'condition', description: 'Auto-Reply oder Weiterleitung?' },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 980, y: 120 },
        data: { label: 'Auto-Reply', type: 'whatsapp_send', description: 'Automatische Antwort senden' },
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 980, y: 380 },
        data: { label: 'Weiterleiten', type: 'telegram', description: 'An Team via Telegram weiterleiten' },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'ai-1', animated: true },
      { id: 'e2-3', source: 'ai-1', target: 'condition-1' },
      { id: 'e3-4a', source: 'condition-1', target: 'action-1', sourceHandle: 'true', label: 'Auto' },
      { id: 'e3-4b', source: 'condition-1', target: 'action-2', sourceHandle: 'false', label: 'Weiterleiten' },
    ],
  },
  {
    id: 'tpl-daily-report',
    name: 'Daily Report',
    description: 'Taeglich Daten aus verschiedenen Quellen sammeln, Report generieren und per Telegram versenden.',
    icon: 'BarChart3',
    category: 'Reporting',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 80, y: 200 },
        data: { label: 'Schedule Trigger', type: 'schedule', description: 'Taeglich um 18:00' },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 380, y: 200 },
        data: { label: 'Daten sammeln', type: 'http', description: 'KPIs aus APIs abrufen' },
      },
      {
        id: 'ai-1',
        type: 'ai',
        position: { x: 680, y: 200 },
        data: { label: 'Report generieren', type: 'openai', description: 'Zusammenfassung mit KI erstellen' },
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 980, y: 200 },
        data: { label: 'Telegram senden', type: 'telegram', description: 'Report an Telegram-Gruppe senden' },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'action-1', animated: true },
      { id: 'e2-3', source: 'action-1', target: 'ai-1' },
      { id: 'e3-4', source: 'ai-1', target: 'action-2' },
    ],
  },
  {
    id: 'tpl-marketing-campaign',
    name: 'Marketing Campaign',
    description: 'Webhook-gesteuerte Kampagne: KI-CEO plant, Multi-Channel-Verteilung nach Freigabe.',
    icon: 'Megaphone',
    category: 'Marketing',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 80, y: 200 },
        data: { label: 'Webhook Trigger', type: 'webhook', description: 'Kampagnen-Start per Webhook' },
      },
      {
        id: 'ai-1',
        type: 'ai',
        position: { x: 340, y: 200 },
        data: { label: 'PaperClip CEO', type: 'openai', description: 'Kampagnen-Strategie & Content planen' },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 600, y: 200 },
        data: { label: 'Multi-Channel', type: 'multi_channel', description: 'Content fuer alle Kanaele aufbereiten' },
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 860, y: 200 },
        data: { label: 'Approval', type: 'telegram', description: 'Finale Freigabe einholen' },
      },
      {
        id: 'action-3',
        type: 'action',
        position: { x: 1120, y: 200 },
        data: { label: 'Publish', type: 'publish', description: 'Auf allen Kanaelen veroeffentlichen' },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'ai-1', animated: true },
      { id: 'e2-3', source: 'ai-1', target: 'action-1' },
      { id: 'e3-4', source: 'action-1', target: 'action-2' },
      { id: 'e4-5', source: 'action-2', target: 'action-3' },
    ],
  },
  {
    id: 'tpl-lead-nurturing',
    name: 'Lead Nurturing',
    description: 'Neue Leads automatisch analysieren, erste E-Mail senden und nach Verzoegerung Follow-up auslösen.',
    icon: 'UserPlus',
    category: 'Sales',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 80, y: 200 },
        data: { label: 'Lead Incoming', type: 'webhook', description: 'Neuer Lead via Webhook/Formular' },
      },
      {
        id: 'ai-1',
        type: 'ai',
        position: { x: 340, y: 200 },
        data: { label: 'KI-Analyse', type: 'openai', description: 'Lead bewerten & personalisieren' },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 600, y: 200 },
        data: { label: 'E-Mail senden', type: 'gmail_send', description: 'Personalisierte Willkommens-Mail' },
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 860, y: 200 },
        data: { label: 'Delay', type: 'delay', description: '3 Tage warten' },
      },
      {
        id: 'action-3',
        type: 'action',
        position: { x: 1120, y: 200 },
        data: { label: 'Follow-up', type: 'gmail_send', description: 'Follow-up E-Mail senden' },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'ai-1', animated: true },
      { id: 'e2-3', source: 'ai-1', target: 'action-1' },
      { id: 'e3-4', source: 'action-1', target: 'action-2' },
      { id: 'e4-5', source: 'action-2', target: 'action-3' },
    ],
  },
]

export async function GET() {
  return NextResponse.json(templates)
}
