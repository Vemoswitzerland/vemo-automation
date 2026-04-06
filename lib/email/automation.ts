/**
 * E-Mail Automation Rule-Engine (US3)
 * Evaluates AutomationRules against incoming emails.
 * Supports: auto_reply, queue (fallback), label
 */

import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email/smtp'

interface IncomingEmail {
  id: string
  uid: string
  from: string
  fromName: string | null
  subject: string
  body: string
  receivedAt: Date
  emailAccountId: string | null
}

type MatchMode = 'contains' | 'equals' | 'startsWith' | 'regex'
type TriggerType = 'keyword' | 'sender' | 'subject' | 'category'
type ActionType = 'auto_reply' | 'queue' | 'label'

interface RuleMatch {
  ruleId: string
  ruleName: string
  actionType: ActionType
  replyTemplate: string | null
  replySubject: string | null
  labelValue: string | null
}

function matchesRule(
  email: IncomingEmail,
  triggerType: TriggerType,
  triggerValue: string,
  matchMode: MatchMode
): boolean {
  let target = ''

  switch (triggerType) {
    case 'keyword':
      target = `${email.subject} ${email.body}`.toLowerCase()
      break
    case 'sender':
      target = email.from.toLowerCase()
      break
    case 'subject':
      target = email.subject.toLowerCase()
      break
    case 'category':
      // category matching uses labels field — handled externally if AI-classified
      target = email.subject.toLowerCase()
      break
  }

  const val = triggerValue.toLowerCase()

  switch (matchMode) {
    case 'contains':
      return target.includes(val)
    case 'equals':
      return target === val
    case 'startsWith':
      return target.startsWith(val)
    case 'regex':
      try {
        return new RegExp(triggerValue, 'i').test(target)
      } catch {
        return false
      }
  }
}

function buildReplyBody(template: string, email: IncomingEmail): string {
  return template
    .replace(/\{\{from\}\}/gi, email.fromName ?? email.from)
    .replace(/\{\{subject\}\}/gi, email.subject)
    .replace(/\{\{date\}\}/gi, email.receivedAt.toLocaleDateString('de-CH'))
}

export async function applyAutomationRules(email: IncomingEmail): Promise<{
  action: string
  ruleId: string | null
  ruleName: string | null
  replied: boolean
}> {
  const rules = await prisma.automationRule.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' },
  })

  let matched: RuleMatch | null = null

  for (const rule of rules) {
    if (
      matchesRule(
        email,
        rule.triggerType as TriggerType,
        rule.triggerValue,
        rule.matchMode as MatchMode
      )
    ) {
      matched = {
        ruleId: rule.id,
        ruleName: rule.name,
        actionType: rule.actionType as ActionType,
        replyTemplate: rule.replyTemplate,
        replySubject: rule.replySubject,
        labelValue: rule.labelValue,
      }
      break // first match wins (priority order)
    }
  }

  const startMs = email.receivedAt.getTime()
  const responseTimeMs = Date.now() - startMs

  if (!matched) {
    // Fallback: add to queue (no auto-reply)
    await prisma.automationLog.create({
      data: {
        emailId: email.id,
        action: 'fallback',
        wasAutoReplied: false,
        emailFrom: email.from,
        emailSubject: email.subject,
      },
    })
    return { action: 'fallback', ruleId: null, ruleName: null, replied: false }
  }

  let replied = false
  let replyPreview: string | null = null

  if (matched.actionType === 'auto_reply' && matched.replyTemplate) {
    const replyBody = buildReplyBody(matched.replyTemplate, email)
    const replySubject = matched.replySubject ?? `Re: ${email.subject}`
    replyPreview = replyBody.slice(0, 300)

    // Find email account for SMTP
    if (email.emailAccountId) {
      const account = await prisma.emailAccount.findUnique({
        where: { id: email.emailAccountId },
      })
      if (account) {
        try {
          await sendEmail(account, email.from, replySubject, replyBody)
          replied = true
        } catch (err) {
          console.error('[automation] SMTP send failed:', err)
          // Still log the attempt
        }
      }
    }

    // Save as auto-approved draft
    await prisma.emailDraft.create({
      data: {
        emailId: email.id,
        subject: matched.replySubject ?? `Re: ${email.subject}`,
        body: matched.replyTemplate ? buildReplyBody(matched.replyTemplate, email) : '',
        status: replied ? 'sent' : 'pending',
        aiModel: 'automation-rule',
        sentAt: replied ? new Date() : undefined,
      },
    })
  }

  if (matched.actionType === 'label' && matched.labelValue) {
    // Append label to email
    const emailRecord = await prisma.email.findUnique({ where: { id: email.id } })
    if (emailRecord) {
      const existing = JSON.parse(emailRecord.labels ?? '[]') as string[]
      if (!existing.includes(matched.labelValue)) {
        await prisma.email.update({
          where: { id: email.id },
          data: { labels: JSON.stringify([...existing, matched.labelValue]) },
        })
      }
    }
  }

  // Log
  await prisma.automationLog.create({
    data: {
      emailId: email.id,
      ruleId: matched.ruleId,
      action: matched.actionType === 'auto_reply' ? 'auto_replied' : matched.actionType === 'label' ? 'labelled' : 'queued',
      wasAutoReplied: replied,
      responseTimeMs,
      emailFrom: email.from,
      emailSubject: email.subject,
      matchedRule: matched.ruleName,
      replyPreview,
    },
  })

  // Update rule stats
  await prisma.automationRule.update({
    where: { id: matched.ruleId },
    data: {
      triggerCount: { increment: 1 },
      lastTriggeredAt: new Date(),
    },
  })

  return {
    action: matched.actionType,
    ruleId: matched.ruleId,
    ruleName: matched.ruleName,
    replied,
  }
}

/** Mock rules for demo mode */
export const MOCK_AUTOMATION_RULES = [
  {
    id: 'mock-rule-001',
    name: 'Newsletter-Abmeldung',
    description: 'Automatische Antwort bei Abmelde-Anfragen',
    isActive: true,
    priority: 0,
    triggerType: 'keyword',
    triggerValue: 'abmelden',
    matchMode: 'contains',
    actionType: 'auto_reply',
    replyTemplate: 'Hallo {{from}},\n\nwir haben Ihre Abmelde-Anfrage erhalten und setzen sie sofort um.\n\nMit freundlichen Grüssen\nVemo Team',
    replySubject: 'Abmeldung bestätigt',
    labelValue: null,
    triggerCount: 12,
    lastTriggeredAt: new Date('2026-04-05T10:00:00Z'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-04-01'),
  },
  {
    id: 'mock-rule-002',
    name: 'Out-of-Office',
    description: 'Automatische Abwesenheitsantwort',
    isActive: false,
    priority: 1,
    triggerType: 'keyword',
    triggerValue: 'dringend',
    matchMode: 'contains',
    actionType: 'auto_reply',
    replyTemplate: 'Hallo {{from}},\n\nvielen Dank für Ihre Nachricht. Wir sind derzeit ausser Haus und melden uns am nächsten Werktag.\n\nMit freundlichen Grüssen\nVemo Team',
    replySubject: `Re: {{subject}}`,
    labelValue: null,
    triggerCount: 5,
    lastTriggeredAt: new Date('2026-03-28T08:00:00Z'),
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-03-01'),
  },
  {
    id: 'mock-rule-003',
    name: 'FAQ: Preisanfrage',
    description: 'Automatische Antwort auf Preisfragen',
    isActive: true,
    priority: 2,
    triggerType: 'keyword',
    triggerValue: 'preis',
    matchMode: 'contains',
    actionType: 'auto_reply',
    replyTemplate: 'Hallo {{from}},\n\nvielen Dank für Ihr Interesse. Unsere aktuellen Preise finden Sie auf vemo.ch/preise. Bei weiteren Fragen stehen wir gerne zur Verfügung.\n\nMit freundlichen Grüssen\nVemo Team',
    replySubject: 'Re: Preisanfrage',
    labelValue: null,
    triggerCount: 8,
    lastTriggeredAt: new Date('2026-04-04T14:00:00Z'),
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-04-01'),
  },
  {
    id: 'mock-rule-004',
    name: 'Spam-Label',
    description: 'Spam-E-Mails automatisch kennzeichnen',
    isActive: true,
    priority: 3,
    triggerType: 'subject',
    triggerValue: 'gewonnen',
    matchMode: 'contains',
    actionType: 'label',
    replyTemplate: null,
    replySubject: null,
    labelValue: 'Spam',
    triggerCount: 23,
    lastTriggeredAt: new Date('2026-04-06T09:00:00Z'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-04-01'),
  },
]

/** Mock logs for demo mode */
export const MOCK_AUTOMATION_LOGS = [
  {
    id: 'mock-log-001',
    emailId: 'mock-email-001',
    ruleId: 'mock-rule-001',
    action: 'auto_replied',
    wasAutoReplied: true,
    responseTimeMs: 1200,
    emailFrom: 'kunde@example.com',
    emailSubject: 'Bitte abmelden',
    matchedRule: 'Newsletter-Abmeldung',
    replyPreview: 'Hallo, wir haben Ihre Abmelde-Anfrage erhalten...',
    createdAt: new Date('2026-04-05T10:01:00Z'),
  },
  {
    id: 'mock-log-002',
    emailId: 'mock-email-002',
    ruleId: 'mock-rule-003',
    action: 'auto_replied',
    wasAutoReplied: true,
    responseTimeMs: 980,
    emailFrom: 'interessent@firma.ch',
    emailSubject: 'Was kostet das Paket?',
    matchedRule: 'FAQ: Preisanfrage',
    replyPreview: 'Hallo, vielen Dank für Ihr Interesse...',
    createdAt: new Date('2026-04-04T14:00:30Z'),
  },
  {
    id: 'mock-log-003',
    emailId: 'mock-email-003',
    ruleId: null,
    action: 'fallback',
    wasAutoReplied: false,
    responseTimeMs: null,
    emailFrom: 'unbekannt@domain.de',
    emailSubject: 'Komplexe Anfrage',
    matchedRule: null,
    replyPreview: null,
    createdAt: new Date('2026-04-06T08:30:00Z'),
  },
  {
    id: 'mock-log-004',
    emailId: 'mock-email-004',
    ruleId: 'mock-rule-004',
    action: 'labelled',
    wasAutoReplied: false,
    responseTimeMs: 500,
    emailFrom: 'spam@nowhere.com',
    emailSubject: 'Sie haben gewonnen!',
    matchedRule: 'Spam-Label',
    replyPreview: null,
    createdAt: new Date('2026-04-06T09:00:10Z'),
  },
]
