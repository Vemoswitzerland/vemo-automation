/**
 * POST /api/whatsapp/classify-intent
 *
 * Classifies an inbound WhatsApp message, returns the detected intent,
 * confidence score, handling decision (bot/agent), and optional bot response.
 *
 * Also logs the interaction to WhatsAppBotLog for analytics.
 *
 * Request body:
 * {
 *   messageBody: string         // The inbound message text
 *   from: string                // Sender phone number
 *   fromName?: string           // Sender display name (optional)
 *   messageId?: string          // WhatsAppMessage DB id (optional)
 *   history?: Array<{role: 'inbound'|'outbound', body: string}>  // Last messages (optional)
 * }
 *
 * Response:
 * {
 *   intent: string              // "product_info" | "price" | "delivery" | "support" | "appointment" | "off_topic"
 *   confidence: number          // 0.0 – 1.0
 *   handledBy: "bot" | "agent" // "bot" if confidence >= 0.70, else "agent"
 *   templateKey?: string        // Template key used for bot response
 *   botResponse?: string        // Ready-to-send bot message (only when handledBy = "bot")
 *   logId: string               // WhatsAppBotLog record id
 *   processingMs: number        // Time taken for classification
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { classifyIntent } from '@/lib/whatsapp/nlp'

export async function POST(req: NextRequest) {
  const startMs = Date.now()

  let body: {
    messageBody?: string
    from?: string
    fromName?: string
    messageId?: string
    history?: Array<{ role: 'inbound' | 'outbound'; body: string }>
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { messageBody, from, fromName, messageId, history } = body

  if (!messageBody || typeof messageBody !== 'string' || messageBody.trim().length === 0) {
    return NextResponse.json({ error: '`messageBody` is required and must be a non-empty string' }, { status: 400 })
  }
  if (!from || typeof from !== 'string') {
    return NextResponse.json({ error: '`from` (sender phone number) is required' }, { status: 400 })
  }

  // Classify intent (may use Claude or keyword fallback)
  const result = await classifyIntent({
    messageBody: messageBody.trim(),
    fromName,
    history: Array.isArray(history) ? history.slice(-5) : [],
  })

  // Log to database
  const log = await prisma.whatsAppBotLog.create({
    data: {
      messageId: messageId ?? null,
      from,
      fromName: fromName ?? null,
      messageBody: messageBody.trim(),
      intent: result.intent,
      confidence: result.confidence,
      handledBy: result.handledBy,
      botResponse: result.botResponse ?? null,
      templateKey: result.templateKey ?? null,
    },
  })

  const processingMs = Date.now() - startMs

  return NextResponse.json({
    intent: result.intent,
    confidence: result.confidence,
    handledBy: result.handledBy,
    templateKey: result.templateKey ?? null,
    botResponse: result.botResponse ?? null,
    logId: log.id,
    processingMs,
  })
}
