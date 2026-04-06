/**
 * AI Interface Layer — lib/ai/index.ts
 *
 * Abstraction over Anthropic Claude API.
 * Falls back to template-based mock responses when ANTHROPIC_API_KEY is not set.
 * All consumers should import from here, never from lib/ai/claude directly.
 */

export type { EmailContext } from './claude'

export const isMockAI = !process.env.ANTHROPIC_API_KEY

// ---------------------------------------------------------------------------
// Mock response templates
// ---------------------------------------------------------------------------

const MOCK_RESPONSES = [
  {
    subject: 'Re: {subject}',
    body: 'Guten Tag\n\nVielen Dank für Ihre Nachricht. Ich habe Ihre Anfrage erhalten und werde mich in Kürze bei Ihnen melden.\n\nFreundliche Grüsse\nVemo Team',
  },
  {
    subject: 'Re: {subject}',
    body: 'Hallo\n\nDanke für Ihre E-Mail. Ich prüfe Ihr Anliegen und komme baldmöglichst auf Sie zurück.\n\nBeste Grüsse\nVemo Team',
  },
  {
    subject: 'Re: {subject}',
    body: 'Sehr geehrte Damen und Herren\n\nIhre Nachricht ist bei uns eingegangen. Wir werden sie sorgfältig prüfen und uns so schnell wie möglich bei Ihnen melden.\n\nMit freundlichen Grüssen\nVemo Team',
  },
]

// ---------------------------------------------------------------------------
// Public API (same signatures as lib/ai/claude.ts)
// ---------------------------------------------------------------------------

export async function generateEmailResponse(
  emailContext: import('./claude').EmailContext,
  accountName: string,
  accountEmail: string,
  customInstructions?: string
): Promise<{ subject: string; body: string }> {
  if (isMockAI) {
    const tpl = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
    return {
      subject: tpl.subject.replace('{subject}', emailContext.subject),
      body: tpl.body,
    }
  }
  const { generateEmailResponse: real } = await import('./claude')
  return real(emailContext, accountName, accountEmail, customInstructions)
}

export async function prioritizeEmail(subject: string, body: string): Promise<number> {
  if (isMockAI) {
    const urgentPattern = /dringend|urgent|wichtig|asap|sofort|deadline|frist/i
    return urgentPattern.test(subject + ' ' + body) ? 8 : 5
  }
  const { prioritizeEmail: real } = await import('./claude')
  return real(subject, body)
}
