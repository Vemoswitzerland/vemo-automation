import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface EmailContext {
  from: string
  fromName?: string
  subject: string
  body: string
  previousEmails?: { from: string; subject: string; body: string }[]
}

export type ToneSetting = 'formal' | 'freundlich' | 'juristisch'

export interface EmailSuggestion {
  id: string
  style: 'hoeflich' | 'technisch' | 'dringend'
  styleLabel: string
  styleEmoji: string
  subject: string
  body: string
}

const TONE_INSTRUCTIONS: Record<ToneSetting, string> = {
  formal: 'Schreibe formal und professionell. Verwende "Sie". Kein Slang, keine Emojis.',
  freundlich: 'Schreibe freundlich und zugänglich. Verwende "Du". Positive Sprache, gerne ein Emoji am Schluss.',
  juristisch: 'Schreibe juristisch präzise. Vermeide Zusagen. Verwende "Sie". Füge bei Bedarf Disclaimer hinzu.',
}

const STYLE_INSTRUCTIONS = {
  hoeflich: 'Empathisch und höflich. Zeige Verständnis und Wertschätzung. Ideal für Beschwerden oder sensible Anfragen.',
  technisch: 'Detailliert und sachlich. Gib konkrete Informationen, Schritt-für-Schritt-Anleitungen oder technische Details.',
  dringend: 'Kurz, direkt und handlungsorientiert. Klarer Call-to-Action. Ideal für zeitkritische Sales-Leads.',
}

export async function generateEmailSuggestions(
  emailContext: EmailContext,
  accountName: string,
  accountEmail: string,
  tone: ToneSetting = 'formal'
): Promise<EmailSuggestion[]> {
  const senderName = emailContext.fromName || emailContext.from.split('@')[0]

  const systemPrompt = `Du bist ein professioneller E-Mail-Assistent für ${accountName} (${accountEmail}).
Erstelle 3 verschiedene Antwort-Vorschläge auf eine eingehende E-Mail.

Tonalität für alle Vorschläge: ${TONE_INSTRUCTIONS[tone]}

Erstelle exakt 3 Vorschläge als JSON-Array:
[
  { "style": "hoeflich", "subject": "Re: ...", "body": "..." },
  { "style": "technisch", "subject": "Re: ...", "body": "..." },
  { "style": "dringend", "subject": "Re: ...", "body": "..." }
]

Stile:
- hoeflich: ${STYLE_INSTRUCTIONS.hoeflich}
- technisch: ${STYLE_INSTRUCTIONS.technisch}
- dringend: ${STYLE_INSTRUCTIONS.dringend}

Personalisierung: Verwende den Namen "${senderName}" in der Begrüssung.
Sprache: Deutsch (ausser die E-Mail ist auf Englisch).
Gib NUR das JSON-Array zurück, kein weiterer Text.`

  const userMessage = `E-Mail von ${emailContext.fromName ? `${emailContext.fromName} <${emailContext.from}>` : emailContext.from}:
Betreff: ${emailContext.subject}

${emailContext.body}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: userMessage }],
    system: systemPrompt,
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const arrayMatch = content.text.match(/\[[\s\S]*\]/)
  if (!arrayMatch) throw new Error('Could not parse suggestions array')

  const parsed = JSON.parse(arrayMatch[0])
  const styleLabels: Record<string, { label: string; emoji: string }> = {
    hoeflich: { label: 'Höflich & Empathisch', emoji: '🤝' },
    technisch: { label: 'Technisch & Sachlich', emoji: '🔧' },
    dringend: { label: 'Direkt & Dringend', emoji: '⚡' },
  }

  return parsed.map((s: any, i: number) => ({
    id: `suggestion-${i + 1}`,
    style: s.style,
    styleLabel: styleLabels[s.style]?.label || s.style,
    styleEmoji: styleLabels[s.style]?.emoji || '💬',
    subject: s.subject || `Re: ${emailContext.subject}`,
    body: s.body || '',
  }))
}

export async function generateEmailResponse(
  emailContext: EmailContext,
  accountName: string,
  accountEmail: string,
  customInstructions?: string
): Promise<{ subject: string; body: string }> {
  const systemPrompt = `Du bist ein professioneller E-Mail-Assistent für ${accountName} (${accountEmail}).
Deine Aufgabe ist es, auf eingehende E-Mails höflich, professionell und präzise zu antworten.

Regeln:
- Antworte immer auf Deutsch, es sei denn, die E-Mail ist auf Englisch (dann auf Englisch)
- Sei professionell aber freundlich
- Halte die Antwort prägnant
- Beginne mit einer passenden Begrüssung
- Schliesse mit einer professionellen Grussformel ab
${customInstructions ? `\nSpezielle Anweisungen: ${customInstructions}` : ''}`

  const userMessage = `Bitte antworte auf diese E-Mail:

Von: ${emailContext.fromName ? `${emailContext.fromName} <${emailContext.from}>` : emailContext.from}
Betreff: ${emailContext.subject}

${emailContext.body}

Erstelle eine passende Antwort. Formatiere sie als JSON mit den Feldern "subject" und "body".`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userMessage }],
    system: systemPrompt,
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  // Parse JSON from response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    // Fallback: treat as plain text body
    return {
      subject: `Re: ${emailContext.subject}`,
      body: content.text,
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      subject: parsed.subject || `Re: ${emailContext.subject}`,
      body: parsed.body || content.text,
    }
  } catch {
    return {
      subject: `Re: ${emailContext.subject}`,
      body: content.text,
    }
  }
}

export async function prioritizeEmail(subject: string, body: string): Promise<number> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    messages: [
      {
        role: 'user',
        content: `Bewerte die Priorität dieser E-Mail von 1-10 (10=sehr wichtig, 1=unwichtig/spam).
Betreff: ${subject}
Text (erste 500 Zeichen): ${body.substring(0, 500)}
Antworte NUR mit einer Zahl von 1-10.`,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') return 5
  const num = parseInt(content.text.trim())
  return isNaN(num) ? 5 : Math.min(10, Math.max(1, num))
}
