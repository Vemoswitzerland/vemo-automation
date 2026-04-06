import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export interface EmailTemplate {
  id: string
  name: string
  category: string
  subject: string
  body: string
  tone: string
  usageCount: number
  createdAt: string
  updatedAt: string
}

const DEFAULT_TEMPLATES: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Erstgespräch anbieten',
    category: 'Sales',
    subject: 'Re: {{subject}}',
    body: 'Guten Tag {{name}}\n\nVielen Dank für Ihr Interesse. Gerne würden wir Ihnen in einem persönlichen Gespräch mehr über unsere Dienstleistungen erzählen.\n\nBitte buchen Sie hier Ihr kostenloses 30-Minuten-Erstgespräch: [Kalender-Link]\n\nWir freuen uns auf den Austausch!\n\nFreundliche Grüsse\nVemo Team',
    tone: 'formal',
    usageCount: 0,
  },
  {
    name: 'FAQ – ETF Portfolio',
    category: 'Support',
    subject: 'Re: {{subject}}',
    body: 'Hallo {{name}}\n\nDanke für deine Frage zu ETF-Portfolios! Hier die wichtigsten Punkte:\n\n1. **Portfolio-Zusammensetzung:** Globale ETFs auf Aktien, Anleihen und Immobilien\n2. **Kosten:** All-in-Fee von 0.5–0.8% p.a.\n3. **Mindestanlage:** Ab CHF 10\'000\n4. **Rebalancing:** Automatisch quartalsweise\n\nBei weiteren Fragen stehen wir jederzeit zur Verfügung!\n\nBeste Grüsse\nVemo Team',
    tone: 'freundlich',
    usageCount: 0,
  },
  {
    name: 'Newsletter Abmeldung',
    category: 'Administration',
    subject: 'Abmeldung bestätigt',
    body: 'Guten Tag {{name}}\n\nIhre Abmeldung vom Vemo Newsletter wurde erfolgreich verarbeitet. Sie erhalten keine weiteren Newsletter-E-Mails von uns.\n\nSollten Sie sich in Zukunft wieder anmelden möchten, können Sie dies jederzeit auf unserer Website tun.\n\nFreundliche Grüsse\nVemo Team',
    tone: 'formal',
    usageCount: 0,
  },
  {
    name: 'Partnerschaftsanfrage – Prüfung',
    category: 'Partnerships',
    subject: 'Re: {{subject}}',
    body: 'Guten Tag {{name}}\n\nVielen Dank für Ihre Kooperationsanfrage. Wir prüfen aktuell Partnerschaftsanfragen und werden Ihre Unterlagen intern besprechen.\n\nFür eine erste Einschätzung bitten wir Sie, folgende Dokumente einzureichen:\n- Unternehmensübersicht (1-2 Seiten)\n- Technische Schnittstellenbeschreibung\n- Referenzliste bestehender Partner\n\nNach Eingang der Unterlagen melden wir uns innerhalb von 5 Werktagen.\n\nFreundliche Grüsse\nVemo Team',
    tone: 'formal',
    usageCount: 0,
  },
  {
    name: 'Beschwerdebehandlung – Empathisch',
    category: 'Support',
    subject: 'Re: {{subject}}',
    body: 'Guten Tag {{name}}\n\nVielen Dank, dass Sie sich die Zeit genommen haben, uns über Ihre Erfahrung zu informieren. Wir nehmen Ihr Feedback sehr ernst und bedauern aufrichtig, dass wir Ihre Erwartungen nicht erfüllen konnten.\n\nWir haben Ihr Anliegen aufgenommen und werden es intern prioritär prüfen. Sie erhalten innerhalb von 24 Stunden eine detaillierte Rückmeldung.\n\nFür Rückfragen stehen wir Ihnen jederzeit unter info@vemo.ch zur Verfügung.\n\nMit freundlichen Grüssen\nVemo Team',
    tone: 'formal',
    usageCount: 0,
  },
]

async function getTemplates(): Promise<EmailTemplate[]> {
  const setting = await prisma.appSettings.findUnique({ where: { key: 'email_templates' } })
  if (!setting) {
    // Initialize with defaults
    const now = new Date().toISOString()
    const templates: EmailTemplate[] = DEFAULT_TEMPLATES.map((t, i) => ({
      ...t,
      id: `template-${i + 1}`,
      createdAt: now,
      updatedAt: now,
    }))
    await prisma.appSettings.create({
      data: { key: 'email_templates', value: JSON.stringify(templates) },
    })
    return templates
  }
  return JSON.parse(setting.value) as EmailTemplate[]
}

async function saveTemplates(templates: EmailTemplate[]): Promise<void> {
  await prisma.appSettings.upsert({
    where: { key: 'email_templates' },
    create: { key: 'email_templates', value: JSON.stringify(templates) },
    update: { value: JSON.stringify(templates) },
  })
}

export async function GET() {
  const templates = await getTemplates()
  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, category, subject, body: templateBody, tone } = body as any
  if (!name || !subject || !templateBody) {
    return NextResponse.json({ error: 'name, subject, body required' }, { status: 400 })
  }

  const templates = await getTemplates()
  const now = new Date().toISOString()
  const newTemplate: EmailTemplate = {
    id: `template-${Date.now()}`,
    name,
    category: category || 'Allgemein',
    subject,
    body: templateBody,
    tone: tone || 'formal',
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  templates.push(newTemplate)
  await saveTemplates(templates)

  return NextResponse.json(newTemplate, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const templates = await getTemplates()
  const filtered = templates.filter(t => t.id !== id)
  await saveTemplates(filtered)

  return NextResponse.json({ ok: true })
}
