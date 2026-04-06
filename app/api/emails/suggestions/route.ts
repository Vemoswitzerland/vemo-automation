import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateEmailSuggestions, type ToneSetting, type EmailSuggestion } from '@/lib/ai/claude'
import { MOCK_EMAILS } from '@/lib/email/index'

const MOCK_SUGGESTIONS: Record<string, EmailSuggestion[]> = {
  'mock-email-001': [
    {
      id: 's1',
      style: 'hoeflich',
      styleLabel: 'Höflich & Empathisch',
      styleEmoji: '🤝',
      subject: 'Re: Anfrage zu euren Finanzdienstleistungen',
      body: 'Guten Tag Herr Mustermann\n\nVielen herzlichen Dank für Ihr Interesse an unseren Finanzdienstleistungen – es freut uns sehr, dass Sie auf uns aufmerksam geworden sind.\n\nGerne senden wir Ihnen detaillierte Unterlagen zu unseren Paketen zu und würden uns über ein persönliches Erstgespräch freuen, um Ihre individuellen Bedürfnisse besser kennenzulernen.\n\nBitte teilen Sie uns Ihre bevorzugten Terminmöglichkeiten mit – wir melden uns schnellstmöglich.\n\nFreundliche Grüsse\nVemo Team',
    },
    {
      id: 's2',
      style: 'technisch',
      styleLabel: 'Technisch & Sachlich',
      styleEmoji: '🔧',
      subject: 'Re: Anfrage zu euren Finanzdienstleistungen',
      body: 'Guten Tag Herr Mustermann\n\nBesten Dank für Ihre Anfrage. Hier die relevanten Informationen zu unseren Dienstleistungen:\n\n**Unsere Pakete:**\n- Basis: Vermögensverwaltung ab CHF 50\'000\n- Premium: Individuelle Portfolioverwaltung ab CHF 200\'000\n- Enterprise: Family Office Services ab CHF 1 Mio.\n\n**Nächste Schritte:**\n1. Erstgespräch (30 Min., kostenlos)\n2. Bedarfsanalyse und Angebotserstellung\n3. Vertragsunterzeichnung und Onboarding\n\nFür die Terminbuchung stehen wir Ihnen unter info@vemo.ch oder telefonisch zur Verfügung.\n\nFreundliche Grüsse\nVemo Team',
    },
    {
      id: 's3',
      style: 'dringend',
      styleLabel: 'Direkt & Dringend',
      styleEmoji: '⚡',
      subject: 'Re: Anfrage zu euren Finanzdienstleistungen',
      body: 'Guten Tag Herr Mustermann\n\nDanke für Ihre Anfrage!\n\nLassen Sie uns direkt einen Termin vereinbaren: **Buchen Sie hier Ihr kostenloses 30-Minuten-Erstgespräch** → [Kalender-Link]\n\nAlternativ rufen Sie uns an: +41 XX XXX XX XX\n\nWir freuen uns auf das Gespräch.\n\nVemo Team',
    },
  ],
  'mock-email-002': [
    {
      id: 's1',
      style: 'hoeflich',
      styleLabel: 'Höflich & Empathisch',
      styleEmoji: '🤝',
      subject: 'Re: Partnerschaftsanfrage – FinTech Startup',
      body: 'Hallo Frau Meier\n\nVielen Dank für Ihre Nachricht und Ihr Interesse an einer Kooperation mit uns. Es ist schön zu sehen, wie innovative FinTech-Unternehmen wie Ihres die Branche voranbringen.\n\nWir sind grundsätzlich offen für Partnerschaften, die unseren Kunden echten Mehrwert bieten. Gerne würden wir mehr über Ihr Produkt erfahren und mögliche Synergien ausloten.\n\nEin 30-minütiges Gespräch ist sehr gerne möglich. Ich schlage folgende Termine vor:\n- Dienstag, 14:00–14:30 Uhr\n- Donnerstag, 10:00–10:30 Uhr\n\nFreundliche Grüsse\nVemo Team',
    },
    {
      id: 's2',
      style: 'technisch',
      styleLabel: 'Technisch & Sachlich',
      styleEmoji: '🔧',
      subject: 'Re: Partnerschaftsanfrage – FinTech Startup',
      body: 'Hallo Frau Meier\n\nDanke für Ihre Kooperationsanfrage. Für eine erste Einschätzung benötigen wir folgende Informationen:\n\n1. **Technische Integration:** API-Dokumentation oder Schnittstellenbeschreibung\n2. **Regulatorisches:** FINMA-Registrierung und Compliance-Status\n3. **Businessmodell:** Wie genau ergänzt Ihr Produkt unser Angebot?\n4. **Referenzen:** Bestehende Partnerunternehmen\n\nNach Erhalt dieser Unterlagen können wir die technische und geschäftliche Machbarkeit prüfen und einen qualifizierten Gesprächstermin vereinbaren.\n\nFreundliche Grüsse\nVemo Team',
    },
    {
      id: 's3',
      style: 'dringend',
      styleLabel: 'Direkt & Dringend',
      styleEmoji: '⚡',
      subject: 'Re: Partnerschaftsanfrage – FinTech Startup',
      body: 'Hallo Frau Meier\n\nKlingt interessant! Lassen Sie uns das schnell besprechen.\n\n**Nächster Schritt:** Schicken Sie mir eine kurze Produktübersicht (1-2 Seiten) und Ihren Kalenderlink – dann buche ich direkt.\n\nFreue mich auf den Austausch!\n\nVemo Team',
    },
  ],
}

function getMockSuggestionsForEmail(emailId: string): EmailSuggestion[] {
  if (MOCK_SUGGESTIONS[emailId]) return MOCK_SUGGESTIONS[emailId]
  // Generic fallback for other mock emails
  return [
    {
      id: 's1',
      style: 'hoeflich',
      styleLabel: 'Höflich & Empathisch',
      styleEmoji: '🤝',
      subject: 'Re: Ihre Anfrage',
      body: 'Guten Tag\n\nVielen Dank für Ihre Nachricht. Wir haben Ihre Anfrage erhalten und werden uns so schnell wie möglich bei Ihnen melden.\n\nFreundliche Grüsse\nVemo Team',
    },
    {
      id: 's2',
      style: 'technisch',
      styleLabel: 'Technisch & Sachlich',
      styleEmoji: '🔧',
      subject: 'Re: Ihre Anfrage',
      body: 'Guten Tag\n\nDanke für Ihre Anfrage. Wir prüfen Ihr Anliegen und melden uns innerhalb von 1-2 Werktagen mit allen relevanten Informationen.\n\nFreundliche Grüsse\nVemo Team',
    },
    {
      id: 's3',
      style: 'dringend',
      styleLabel: 'Direkt & Dringend',
      styleEmoji: '⚡',
      subject: 'Re: Ihre Anfrage',
      body: 'Guten Tag\n\nNachricht erhalten – wir melden uns umgehend!\n\nVemo Team',
    },
  ]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const emailId = searchParams.get('emailId')
  const tone = (searchParams.get('tone') || 'formal') as ToneSetting
  const isMock = searchParams.get('mock') === 'true'

  if (!emailId) {
    return NextResponse.json({ error: 'emailId required' }, { status: 400 })
  }

  if (isMock) {
    const mockEmail = MOCK_EMAILS.find(e => e.uid === emailId)
    if (!mockEmail) {
      return NextResponse.json({ error: 'Mock email not found' }, { status: 404 })
    }
    const suggestions = getMockSuggestionsForEmail(emailId)
    return NextResponse.json({ suggestions, tone, mock: true })
  }

  const email = await prisma.email.findUnique({ where: { id: emailId } })
  if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 })

  const account = await prisma.emailAccount.findFirst({ where: { isActive: true } })
  const accountName = account?.name || 'Vemo Automationszentrale'
  const accountEmail = account?.email || 'info@vemo.ch'

  const suggestions = await generateEmailSuggestions(
    {
      from: email.from,
      fromName: email.fromName || undefined,
      subject: email.subject,
      body: email.body,
    },
    accountName,
    accountEmail,
    tone
  )

  return NextResponse.json({ suggestions, tone })
}
