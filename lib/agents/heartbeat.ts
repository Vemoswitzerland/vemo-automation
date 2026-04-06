/**
 * Agent Heartbeat Engine
 *
 * Periodically checks for agents that need to run based on their heartbeatSec setting.
 * Uses node-cron to check every 10 seconds. An agent is triggered when:
 *   - status is NOT 'paused'
 *   - heartbeatSec > 0
 *   - (now - lastRunAt) >= heartbeatSec seconds, or lastRunAt is null
 */
import * as cron from 'node-cron'
import { prisma } from '@/lib/db'
import { executeAgentRun } from './execute'

let heartbeatTask: cron.ScheduledTask | null = null

// Track agents currently being executed to prevent overlapping runs
const runningAgents = new Set<string>()

async function checkAgentHeartbeats(): Promise<void> {
  try {
    const agents = await prisma.agent.findMany({
      where: {
        heartbeatSec: { gt: 0 },
        status: { not: 'paused' },
      },
      select: {
        id: true,
        name: true,
        heartbeatSec: true,
        lastRunAt: true,
        status: true,
      },
    })

    if (agents.length === 0) return

    const now = Date.now()

    for (const agent of agents) {
      // Skip agents that are already running (from a previous heartbeat or manual trigger)
      if (agent.status === 'running' || runningAgents.has(agent.id)) {
        continue
      }

      const lastRun = agent.lastRunAt ? new Date(agent.lastRunAt).getTime() : 0
      const elapsedSec = (now - lastRun) / 1000

      if (elapsedSec >= agent.heartbeatSec) {
        console.log(`[heartbeat] Triggering agent "${agent.name}" (${agent.id}) — ${Math.round(elapsedSec)}s since last run, interval ${agent.heartbeatSec}s`)

        runningAgents.add(agent.id)

        // Fire and forget — don't block the heartbeat loop
        executeAgentRun(agent.id, 'Heartbeat-Trigger: Prüfe ob es Aufgaben gibt.', 'heartbeat')
          .then((result) => {
            console.log(`[heartbeat] Agent "${agent.name}" completed — ${result.tokensUsed} tokens, ${result.durationMs}ms`)
          })
          .catch((err) => {
            console.error(`[heartbeat] Agent "${agent.name}" failed:`, err?.message ?? err)
          })
          .finally(() => {
            runningAgents.delete(agent.id)
          })
      }
    }
  } catch (error) {
    console.error('[heartbeat] Error checking agent heartbeats:', error)
  }
}

export function startAgentHeartbeat(): void {
  if (heartbeatTask) {
    console.log('[heartbeat] Already running, skipping start.')
    return
  }

  console.log('[heartbeat] Starting — checking agents every 10 seconds.')

  // node-cron with 6 fields: second minute hour day month weekday
  heartbeatTask = cron.schedule('*/10 * * * * *', () => {
    checkAgentHeartbeats().catch((err) => console.error('[heartbeat] Unhandled error:', err))
  })
}

export function stopAgentHeartbeat(): void {
  if (heartbeatTask) {
    heartbeatTask.stop()
    heartbeatTask = null
    console.log('[heartbeat] Stopped.')
  }
}
