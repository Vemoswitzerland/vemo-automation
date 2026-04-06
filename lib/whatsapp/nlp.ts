/**
 * WhatsApp NLP Intent Classification — lib/whatsapp/nlp.ts
 *
 * Classifies inbound WhatsApp messages into intents using Claude AI.
 * Falls back to keyword-based heuristics when ANTHROPIC_API_KEY is not set.
 *
 * Intents:
 *  - product_info   → questions about services / products
 *  - price          → pricing / cost inquiries
 *  - delivery       → scheduling / delivery / appointment timing
 *  - support        → support issues / complaints / help
 *  - appointment    → booking / calendar requests
 *  - off_topic      → unrelated or unclear messages
 *
 * Handoff rule: confidence < 0.70 → queue to human agent
 */

import Anthropic from '@anthropic-ai/sdk'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Intent =
  | 'product_info'
  | 'price'
  | 'delivery'
  | 'support'
  | 'appointment'
  | 'off_topic'

export interface IntentClassificationResult {
  intent: Intent
  confidence: number // 0.0 – 1.0
  handledBy: 'bot' | 'agent'
  templateKey?: string
  botResponse?: string
}

export interface ClassifyIntentInput {
  messageBody: string
  fromName?: string
  /** Optional conversation history (last 5 messages max) */
  history?: Array<{ role: 'inbound' | 'outbound'; body: string }>
}

// ---------------------------------------------------------------------------
// Response Templates
// ---------------------------------------------------------------------------

const BOT_PERSONA = 'Luca vom Vemo-Team'

const TEMPLATES: Record<Intent, (name: string) => string> = {
  product_info: (name) =>
    `Hallo ${name}! 👋 Gerne erkläre ich dir unser Angebot. Vemo ist eine Finanz- und Automations-Beratungsplattform. Wir helfen dir bei Finanzplanung, ETF-Strategien, Steueroptimierung und automatisierten Geschäftsprozessen. Was interessiert dich genauer?`,
  price: (name) =>
    `Hallo ${name}! 💡 Unsere Preise richten sich nach dem individuellen Beratungsumfang. Ein Erstgespräch (30 Min.) ist kostenlos. Soll ich dir einen Termin für ein unverbindliches Gespräch anbieten?`,
  delivery: (name) =>
    `Hallo ${name}! 📅 Gerne helfen wir dir mit deinem Anliegen. Unsere Termine sind werktags von 8–18 Uhr verfügbar. Wann passt es dir am besten?`,
  support: (name) =>
    `Hallo ${name}! 🛠️ Danke, dass du dich meldest. Ich leite dein Anliegen sofort an unser Support-Team weiter, das sich schnellstmöglich bei dir meldet. Kannst du das Problem kurz beschreiben?`,
  appointment: (name) =>
    `Hallo ${name}! 📆 Super, dass du einen Termin möchtest! Wir haben freie Slots Mo–Fr 8–18 Uhr. Welcher Wochentag und welche Uhrzeit passt dir am besten?`,
  off_topic: (name) =>
    `Hallo ${name}! Ich bin ${BOT_PERSONA} und helfe dir bei Fragen rund um Vemo. Für andere Themen kann ich leider nicht weiterhelfen – aber schreib gerne, wenn du Fragen zu unseren Dienstleistungen hast! 😊`,
}

// ---------------------------------------------------------------------------
// Keyword fallback (no API key)
// ---------------------------------------------------------------------------

const KEYWORD_MAP: Array<{ pattern: RegExp; intent: Intent; confidence: number }> = [
  { pattern: /preis|kosten|gebühr|gebuhren|was kostet|wie viel|how much|chf|franken/i, intent: 'price', confidence: 0.75 },
  { pattern: /termin|buchen|booking|appointment|wann|datum|uhrzeit|slot/i, intent: 'appointment', confidence: 0.78 },
  { pattern: /liefern|lieferung|delivery|wann kommt|versand|shipping/i, intent: 'delivery', confidence: 0.75 },
  { pattern: /problem|fehler|funktioniert nicht|hilfe|support|error|bug|kaputt/i, intent: 'support', confidence: 0.76 },
  { pattern: /informati|was bietet|leistung|service|angebot|produkt|more info|details/i, intent: 'product_info', confidence: 0.72 },
]

function classifyByKeyword(messageBody: string): IntentClassificationResult {
  for (const { pattern, intent, confidence } of KEYWORD_MAP) {
    if (pattern.test(messageBody)) {
      const handledBy: 'bot' | 'agent' = confidence >= 0.7 ? 'bot' : 'agent'
      const templateKey = handledBy === 'bot' ? intent : undefined
      const botResponse = handledBy === 'bot' ? TEMPLATES[intent]('') : undefined
      return { intent, confidence, handledBy, templateKey, botResponse }
    }
  }
  return {
    intent: 'off_topic',
    confidence: 0.55,
    handledBy: 'agent', // off_topic always routes to agent unless confident
    templateKey: undefined,
    botResponse: undefined,
  }
}

// ---------------------------------------------------------------------------
// Claude-based classification
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

const SYSTEM_PROMPT = `Du bist ein Intent-Klassifizierungs-System für eingehende WhatsApp-Nachrichten eines Finanzberatungs-Unternehmens (Vemo).

Klassifiziere jede Nachricht in genau EINE dieser Kategorien:
- product_info: Fragen zu Dienstleistungen, Produkten, Angebot
- price: Preise, Kosten, Gebühren, Budget
- delivery: Lieferung, Termine, Zeitplanung, Verfügbarkeit
- support: Probleme, Fehler, Beschwerden, Hilfe
- appointment: Terminbuchung, Kalender, Meeting-Anfragen
- off_topic: Alles andere, Spam, unklare Anfragen

Antworte NUR mit einem JSON-Objekt, kein anderer Text:
{
  "intent": "<kategorie>",
  "confidence": <0.0-1.0>,
  "reasoning": "<kurze Begründung>"
}`

export async function classifyIntent(input: ClassifyIntentInput): Promise<IntentClassificationResult> {
  const { messageBody, fromName, history = [] } = input

  // Fallback: keyword-based if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    const result = classifyByKeyword(messageBody)
    const displayName = fromName || 'dort'
    if (result.handledBy === 'bot' && result.templateKey) {
      result.botResponse = TEMPLATES[result.intent](displayName)
    }
    return result
  }

  // Build context from history
  const historyContext =
    history.length > 0
      ? '\n\nGesprächsverlauf (letzte Nachrichten):\n' +
        history.map((m) => `${m.role === 'inbound' ? 'Kunde' : 'Bot'}: ${m.body}`).join('\n')
      : ''

  const userMessage = `Nachricht des Kunden: "${messageBody}"${historyContext}`

  try {
    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    const intent: Intent = parsed.intent as Intent
    const confidence: number = Math.min(1, Math.max(0, parseFloat(parsed.confidence) || 0))
    const handledBy: 'bot' | 'agent' = confidence >= 0.7 ? 'bot' : 'agent'
    const displayName = fromName || 'dort'
    const templateKey = handledBy === 'bot' ? intent : undefined
    const botResponse = handledBy === 'bot' ? TEMPLATES[intent](displayName) : undefined

    return { intent, confidence, handledBy, templateKey, botResponse }
  } catch {
    // Fallback to keyword on parse error
    const result = classifyByKeyword(messageBody)
    const displayName = fromName || 'dort'
    if (result.handledBy === 'bot' && result.templateKey) {
      result.botResponse = TEMPLATES[result.intent](displayName)
    }
    return result
  }
}

export { TEMPLATES }
