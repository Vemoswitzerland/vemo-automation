import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Mock AI response when no Anthropic key is set
function generateMockResponse(messageBody: string, fromName: string | null): string {
  const name = fromName ? fromName.split(' ')[0] : 'Ihnen'
  const lowerBody = messageBody.toLowerCase()

  if (lowerBody.includes('termin') || lowerBody.includes('gespräch')) {
    return `Hallo ${name}!\n\nVielen Dank für Ihre Nachricht. Gerne können wir einen Termin vereinbaren. Unsere nächsten freien Slots sind:\n\n📅 Dienstag, 08.04. um 10:00 Uhr\n📅 Mittwoch, 09.04. um 14:00 Uhr\n📅 Freitag, 11.04. um 11:00 Uhr\n\nWelcher Termin passt Ihnen am besten?\n\nFreundliche Grüsse,\nVemo Team`
  } else if (lowerBody.includes('information') || lowerBody.includes('mehr') || lowerBody.includes('interessiere')) {
    return `Hallo ${name}!\n\nDanke für Ihr Interesse an unserer Finanzberatung! 🎯\n\nWir bieten folgende Leistungen an:\n• Persönliche Anlageberatung\n• ETF & Aktien Portfolio\n• Vorsorgeplanung (Säule 3a)\n• Budgetoptimierung\n\nGerne schicken wir Ihnen unsere Informationsbroschüre oder vereinbaren ein kostenloses Erstgespräch.\n\nFreundliche Grüsse,\nVemo Team`
  } else if (lowerBody.includes('steuer') || lowerBody.includes('optimierung')) {
    return `Hallo ${name}!\n\nJa, Steueroptimierung ist einer unserer Schwerpunkte! 💡\n\nWir helfen Ihnen bei:\n• Säule 3a Einzahlungen\n• Wertschriftenverzeichnis\n• Liegenschaftskosten\n• Optimaler Deklaration\n\nBuchen Sie hier ein Gespräch: app.vemo.ch/buchung\n\nFreundliche Grüsse,\nVemo Team`
  } else {
    return `Hallo ${name}!\n\nVielen Dank für Ihre Nachricht! Wir haben sie erhalten und melden uns so schnell wie möglich bei Ihnen.\n\nFalls dringend, erreichen Sie uns auch unter: info@vemo.ch\n\nFreundliche Grüsse,\nVemo Team`
  }
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { messageId, instructions } = body as { messageId: string; instructions?: string }
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  const message = await prisma.whatsAppMessage.findUnique({ where: { id: messageId } })
  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  let responseBody: string

  // Try Anthropic if key is available
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey })

      const systemPrompt = `Du bist ein professioneller WhatsApp-Assistent für Vemo Finanzberatung.
Beantworte Kundenanfragen auf WhatsApp höflich, kurz und professionell.
Nutze eine persönliche, aber seriöse Sprache. Halte Antworten auf 3-5 Sätze.
Verwende dezent Emojis wo passend (1-2 pro Nachricht maximal).
${instructions ? `\nSpezielle Anweisungen: ${instructions}` : ''}`

      const userMsg = `Bitte beantworte diese WhatsApp-Nachricht von ${message.fromName || message.from}:\n\n"${message.body}"\n\nSchreibe nur die Antwortnachricht ohne Anführungszeichen.`

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: userMsg }],
        system: systemPrompt,
      })

      const content = response.content[0]
      responseBody = content.type === 'text' ? content.text : generateMockResponse(message.body, message.fromName)
    } catch {
      responseBody = generateMockResponse(message.body, message.fromName)
    }
  } else {
    responseBody = generateMockResponse(message.body, message.fromName)
  }

  // Delete old pending drafts for this message
  await prisma.whatsAppDraft.deleteMany({
    where: { messageId, status: 'pending' },
  })

  const draft = await prisma.whatsAppDraft.create({
    data: {
      messageId,
      body: responseBody,
      status: 'pending',
      aiPrompt: instructions,
    },
  })

  return NextResponse.json(draft)
}
