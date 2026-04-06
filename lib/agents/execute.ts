import { prisma } from '@/lib/db'

export async function executeAgentRun(agentId: string, input: string, trigger: string = 'manual') {
  // Check for API key before doing anything expensive
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[agents] ANTHROPIC_API_KEY nicht gesetzt — überspringe echten API-Call.')

    const agent = await prisma.agent.findUnique({ where: { id: agentId }, include: { files: true } })
    if (!agent) throw new Error('Agent not found')

    const run = await prisma.agentRun.create({
      data: { agentId, trigger, input, status: 'running' }
    })

    const mockOutput = 'API-Key nicht konfiguriert. Bitte ANTHROPIC_API_KEY als Umgebungsvariable setzen.'

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'completed', output: mockOutput, durationMs: 0, tokensUsed: 0, completedAt: new Date() }
    })

    await prisma.agent.update({
      where: { id: agentId },
      data: { lastRunAt: new Date(), runCount: { increment: 1 }, status: 'idle', lastError: null }
    })

    return { runId: run.id, output: mockOutput, tokensUsed: 0, durationMs: 0 }
  }

  // Dynamic import to avoid crash when SDK is not configured
  const Anthropic = (await import('@anthropic-ai/sdk')).default

  const agent = await prisma.agent.findUnique({ where: { id: agentId }, include: { files: true } })
  if (!agent) throw new Error('Agent not found')

  const startTime = Date.now()
  const run = await prisma.agentRun.create({
    data: { agentId, trigger, input, status: 'running' }
  })

  try {
    // Build system prompt with agent instructions + files
    let systemPrompt = agent.instructions
    if (agent.files.length > 0) {
      systemPrompt += '\n\n--- DATEIEN ---\n'
      for (const file of agent.files) {
        systemPrompt += `\n### ${file.name} (${file.type})\n${file.content}\n`
      }
    }

    // Add role context
    const roleContext: Record<string, string> = {
      ceo: 'Du bist der CEO. Du koordinierst das Team, delegierst Aufgaben und triffst strategische Entscheidungen.',
      cto: 'Du bist der CTO. Du triffst technische Entscheidungen und planst die Architektur.',
      marketing: 'Du bist der Marketing Lead. Du erstellst Content, planst Kampagnen und analysierst Performance.',
      designer: 'Du bist der UX Designer. Du gestaltest Interfaces und sorgst für gute User Experience.',
      qa: 'Du bist der QA Engineer. Du testest, findest Bugs und sorgst für Qualität.',
      devops: 'Du bist der DevOps Engineer. Du kümmerst dich um Infrastruktur und Deployments.',
      worker: 'Du bist ein Teammitglied. Führe die dir zugewiesenen Aufgaben gewissenhaft aus.',
    }
    if (roleContext[agent.role]) {
      systemPrompt = roleContext[agent.role] + '\n\n' + systemPrompt
    }

    const anthropic = new Anthropic()
    const message = await anthropic.messages.create({
      model: agent.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: input }],
    })

    const output = message.content[0].type === 'text' ? message.content[0].text : JSON.stringify(message.content)
    const durationMs = Date.now() - startTime
    const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0)

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'completed', output, durationMs, tokensUsed, completedAt: new Date() }
    })

    await prisma.agent.update({
      where: { id: agentId },
      data: { lastRunAt: new Date(), runCount: { increment: 1 }, status: 'idle', lastError: null }
    })

    return { runId: run.id, output, tokensUsed, durationMs }
  } catch (error: any) {
    const durationMs = Date.now() - startTime
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'failed', error: error?.message ?? 'Unknown error', durationMs, completedAt: new Date() }
    })
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: 'error', lastError: error?.message ?? 'Unknown error' }
    })
    throw error
  }
}
