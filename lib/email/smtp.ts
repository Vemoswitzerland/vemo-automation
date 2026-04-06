import nodemailer from 'nodemailer'
import type { EmailAccount } from '@prisma/client'
import { decrypt } from '@/lib/crypto'
import { withRetry } from '@/lib/retry'

export async function sendEmail(
  account: EmailAccount,
  to: string,
  subject: string,
  body: string,
  inReplyTo?: string
): Promise<{ messageId: string }> {
  return withRetry(() => sendEmailOnce(account, to, subject, body, inReplyTo), {
    label: `SMTP send (${account.email} → ${to})`,
  })
}

async function sendEmailOnce(
  account: EmailAccount,
  to: string,
  subject: string,
  body: string,
  inReplyTo?: string
): Promise<{ messageId: string }> {
  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpPort === 465,
    auth: {
      user: account.username,
      pass: decrypt(account.password),
    },
  })

  const info = await transporter.sendMail({
    from: `${account.name} <${account.email}>`,
    to,
    subject,
    text: body,
    inReplyTo: inReplyTo,
    references: inReplyTo,
  })

  return { messageId: info.messageId }
}
