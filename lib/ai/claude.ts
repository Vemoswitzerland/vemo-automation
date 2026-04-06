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
