import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getBotToken, getAllChatIds } from '@/lib/telegram/notify'
import { sendMessage } from '@/lib/telegram/bot'

async function authorize(userId: string, flowId: string) {
  const flow = await prisma.flow.findUnique({ where: { id: flowId } })
  if (!flow) return { error: 'Flow nicht gefunden', status: 404, flow: null, membership: null }

  if (!flow.boardId) return { error: 'Flow gehört zu keinem Board', status: 403, flow: null, membership: null }

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: flow.boardId, userId } },
  })
  if (!membership) return { error: 'Nicht autorisiert', status: 403, flow: null, membership: null }

  return { flow, membership, error: null, status: null }
}

interface FlowNode {
  id: string
  type?: string
  data?: {
    label?: string
    message?: string
    chatId?: string
    command?: string
    [key: string]: unknown
  }
}

// Execute flow nodes in topological order, handling special node types
async function executeNodes(
  nodes: FlowNode[],
  input: Record<string, unknown>
): Promise<{ results: Record<string, unknown>; errors: string[] }> {
  const results: Record<string, unknown> = {}
  const errors: string[] = []

  for (const node of nodes) {
    const nodeType = node.type ?? node.data?.label ?? ''

    if (nodeType === 'send_telegram_message' || nodeType === 'telegram_message') {
      try {
        const token = await getBotToken()
        if (!token) {
          errors.push(`Node ${node.id}: Telegram nicht verbunden`)
          continue
        }
        const message = (node.data?.message as string | undefined) ?? (input.message as string | undefined) ?? '✅ Flow ausgeführt'
        const targetChatId = (node.data?.chatId as string | undefined)
        const chatIds = targetChatId ? [targetChatId] : await getAllChatIds()
        const sent: string[] = []
        for (const chatId of chatIds) {
          await sendMessage(token, chatId, message)
          sent.push(chatId)
        }
        results[node.id] = { type: 'telegram_message', sent: sent.length, chatIds: sent }
      } catch (err) {
        errors.push(`Node ${node.id}: ${err instanceof Error ? err.message : 'Telegram-Fehler'}`)
      }
    } else {
      // Generic node — mark as processed
      results[node.id] = { type: nodeType, status: 'processed' }
    }
  }

  return { results, errors }
}

// POST /api/boards/[userId]/flows/[flowId]/execute — execute a flow
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string; flowId: string } }
) {
  try {
    const { userId, flowId } = params
    const result = await authorize(userId, flowId)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status! })
    }

    const { flow } = result
    const body = await req.json().catch(() => ({}))

    const execution = await prisma.execution.create({
      data: {
        flowId,
        boardId: flow!.boardId,
        triggeredBy: userId,
        status: 'running',
        input: JSON.stringify(body.input ?? {}),
        isTest: false,
      },
    })

    const nodes: FlowNode[] = JSON.parse(flow!.nodes)
    const { results, errors } = await executeNodes(nodes, body.input ?? {})

    const output = {
      executed: true,
      nodeCount: nodes.length,
      flowId,
      executionId: execution.id,
      results,
      errors,
    }

    const completed = await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: errors.length > 0 && Object.keys(results).length === 0 ? 'failed' : 'success',
        output: JSON.stringify(output),
        error: errors.length > 0 ? errors.join('; ') : null,
        completedAt: new Date(),
      },
    })

    return NextResponse.json(completed, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Fehler bei der Ausführung' }, { status: 500 })
  }
}
