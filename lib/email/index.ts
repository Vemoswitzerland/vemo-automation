/**
 * Email Interface Layer — lib/email/index.ts
 *
 * Abstraction over IMAP/SMTP email access.
 * When no email accounts are configured (no DB accounts AND no GMAIL_USER env var),
 * this module returns pre-defined mock emails for demo purposes.
 *
 * Real credentials: add an EmailAccount via Settings, or set GMAIL_USER + GMAIL_APP_PASSWORD
 * in .env.local → no code changes needed.
 */

export type { FetchedEmail } from './imap'

// ---------------------------------------------------------------------------
// Mock detection helper (server-side only)
// ---------------------------------------------------------------------------

/**
 * Returns true when no email credentials are configured at all.
 * Note: this only checks env vars. For a definitive check (including DB accounts),
 * query prisma.emailAccount.count({ where: { isActive: true } }) in your API route.
 */
export const isMockEmail = !process.env.GMAIL_USER && !process.env.IMAP_HOST

// ---------------------------------------------------------------------------
// Mock email data — realistic demo dataset
// ---------------------------------------------------------------------------

export const MOCK_EMAILS = [
  {
    uid: 'mock-email-001',
    messageId: '<mock001@example.com>',
    from: 'max.mustermann@example.com',
    fromName: 'Max Mustermann',
    to: 'info@vemo.ch',
    subject: 'Anfrage zu euren Finanzdienstleistungen',
    body: 'Guten Tag\n\nIch habe Ihre Website besucht und bin sehr interessiert an Ihren Finanzberatungsdienstleistungen. Könnten Sie mir mehr Informationen zu Ihren Paketen und Preisen zukommen lassen?\n\nIch würde mich über einen Termin für ein erstes Gespräch freuen.\n\nMit freundlichen Grüssen\nMax Mustermann',
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    uid: 'mock-email-002',
    messageId: '<mock002@example.com>',
    from: 'sarah.meier@startup.ch',
    fromName: 'Sarah Meier',
    to: 'info@vemo.ch',
    subject: 'Partnerschaftsanfrage – FinTech Startup',
    body: 'Hallo Vemo Team\n\nWir sind ein junges FinTech-Startup aus Zürich und suchen nach Kooperationspartnern im Bereich Finanzberatung. Unser Produkt ergänzt Ihr Angebot perfekt.\n\nWäre ein 30-minütiges Gespräch möglich?\n\nBeste Grüsse\nSarah Meier\nCEO, FinStart AG',
    receivedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    uid: 'mock-email-003',
    messageId: '<mock003@example.com>',
    from: 'thomas.keller@gmail.com',
    fromName: 'Thomas Keller',
    to: 'info@vemo.ch',
    subject: 'Frage zu ETF-Portfolios',
    body: 'Liebe Vemo-Experten\n\nIch beschäftige mich schon länger mit dem Thema passives Investieren und ETFs. Ich hätte einige Fragen zu Ihrer Dienstleistung:\n\n1. Wie sieht ein typisches ETF-Portfolio bei Ihnen aus?\n2. Welche Kosten entstehen?\n3. Ab welchem Betrag lohnt es sich?\n\nVielen Dank im Voraus!\nThomas',
    receivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    uid: 'mock-email-004',
    messageId: '<mock004@example.com>',
    from: 'newsletter@finance-weekly.ch',
    fromName: 'Finance Weekly',
    to: 'info@vemo.ch',
    subject: 'Ihr Newsletter-Abonnement wurde verlängert',
    body: 'Sehr geehrte Damen und Herren\n\nIhr Abonnement des Finance Weekly Newsletters wurde automatisch um ein Jahr verlängert.\n\nBesten Dank für Ihr Vertrauen.\nFinance Weekly Team',
    receivedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
  {
    uid: 'mock-email-005',
    messageId: '<mock005@example.com>',
    from: 'anna.huber@corporatebank.ch',
    fromName: 'Anna Huber',
    to: 'info@vemo.ch',
    subject: 'DRINGEND: Kooperationsangebot läuft ab',
    body: 'Sehr geehrtes Vemo-Team\n\nUnser Exklusivangebot für eine strategische Partnerschaft läuft am Freitag ab. Bitte melden Sie sich noch heute.\n\nFreundliche Grüsse\nAnna Huber\nCorporate Bank',
    receivedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
  },
]

// ---------------------------------------------------------------------------
// Mock draft responses paired with the mock emails
// ---------------------------------------------------------------------------

export const MOCK_DRAFTS: Record<string, { subject: string; body: string }> = {
  'mock-email-001': {
    subject: 'Re: Anfrage zu euren Finanzdienstleistungen',
    body: 'Guten Tag Herr Mustermann\n\nVielen Dank für Ihr Interesse an unseren Finanzdienstleistungen. Gerne sende ich Ihnen unsere Unterlagen zu und würde mich über ein Erstgespräch freuen.\n\nBitte teilen Sie mir Ihre bevorzugten Termine mit – ich melde mich umgehend.\n\nFreundliche Grüsse\nVemo Team',
  },
  'mock-email-002': {
    subject: 'Re: Partnerschaftsanfrage – FinTech Startup',
    body: 'Hallo Frau Meier\n\nDanke für Ihre Anfrage! Kooperationen mit innovativen FinTech-Unternehmen sind für uns sehr interessant.\n\nEin 30-minütiges Gespräch ist gerne möglich. Ich schlage folgende Termine vor:\n- Dienstag, 14:00-14:30 Uhr\n- Donnerstag, 10:00-10:30 Uhr\n\nFreundliche Grüsse\nVemo Team',
  },
  'mock-email-003': {
    subject: 'Re: Frage zu ETF-Portfolios',
    body: 'Hallo Thomas\n\nSuper, dass du dich für passives Investieren interessierst! Kurz zu deinen Fragen:\n\n1. Wir setzen auf diversifizierte ETF-Portfolios mit Fokus auf globale Aktien und Anleihen\n2. Unsere All-in-One-Gebühr beträgt 0.5-0.8% p.a.\n3. Ab CHF 10\'000 lohnt es sich definitiv\n\nBuch gerne ein kostenloses Erstgespräch – ohne Verpflichtung!\n\nBeste Grüsse\nVemo Team',
  },
  'mock-email-005': {
    subject: 'Re: DRINGEND: Kooperationsangebot läuft ab',
    body: 'Guten Tag Frau Huber\n\nVielen Dank für Ihre Nachricht. Wir prüfen Ihr Angebot intern und melden uns noch vor Freitag bei Ihnen.\n\nFreundliche Grüsse\nVemo Team',
  },
}
