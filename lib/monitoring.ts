/**
 * Vemo Automation Center – Monitoring & Logging
 *
 * Structured logger for automation jobs.
 * - Writes structured JSON logs to stdout (picked up by pm2/docker/journald)
 * - Optionally forwards to an external HTTP sink (Logtail, Axiom, custom)
 * - Tracks job runs with start/end/error in the local DB via Prisma
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const configuredLevel = (process.env.LOG_LEVEL ?? 'info') as LogLevel

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[configuredLevel]
}

export interface LogEntry {
  ts: string
  level: LogLevel
  service: string
  message: string
  jobId?: string
  connector?: string
  durationMs?: number
  error?: string
  [key: string]: unknown
}

function emit(entry: LogEntry) {
  if (!shouldLog(entry.level)) return

  // Structured JSON to stdout
  console.log(JSON.stringify(entry))

  // Optional: forward to external sink
  const sinkUrl = process.env.LOG_SINK_URL
  const sinkToken = process.env.LOG_SINK_TOKEN
  if (sinkUrl) {
    fetch(sinkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sinkToken ? { Authorization: `Bearer ${sinkToken}` } : {}),
      },
      body: JSON.stringify(entry),
    }).catch(() => {
      // never throw from logging
    })
  }
}

// ─── Public API ──────────────────────────────────────────────

export const logger = {
  debug: (service: string, message: string, meta?: Record<string, unknown>) =>
    emit({ ts: new Date().toISOString(), level: 'debug', service, message, ...meta }),

  info: (service: string, message: string, meta?: Record<string, unknown>) =>
    emit({ ts: new Date().toISOString(), level: 'info', service, message, ...meta }),

  warn: (service: string, message: string, meta?: Record<string, unknown>) =>
    emit({ ts: new Date().toISOString(), level: 'warn', service, message, ...meta }),

  error: (service: string, message: string, error?: unknown, meta?: Record<string, unknown>) =>
    emit({
      ts: new Date().toISOString(),
      level: 'error',
      service,
      message,
      error: error instanceof Error ? error.message : String(error ?? ''),
      stack: error instanceof Error ? error.stack : undefined,
      ...meta,
    }),
}

// ─── Job tracking helper ──────────────────────────────────────

/**
 * Wraps an async job function with start/end/error logging.
 *
 * Usage:
 *   await trackJob('instagram-post', 'instagram', async () => {
 *     await postToInstagram(...)
 *   })
 */
export async function trackJob<T>(
  jobName: string,
  connector: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now()
  logger.info(jobName, `Job started`, { connector, jobName })

  try {
    const result = await fn()
    const durationMs = Date.now() - start
    logger.info(jobName, `Job completed`, { connector, jobName, durationMs })
    return result
  } catch (err) {
    const durationMs = Date.now() - start
    logger.error(jobName, `Job failed`, err, { connector, jobName, durationMs })
    throw err
  }
}

// ─── Health check endpoint helper ────────────────────────────

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down'
  uptime: number
  timestamp: string
  checks: Record<string, { ok: boolean; message?: string }>
}

export function buildHealthStatus(
  checks: Record<string, { ok: boolean; message?: string }>,
): HealthStatus {
  const allOk = Object.values(checks).every((c) => c.ok)
  const anyOk = Object.values(checks).some((c) => c.ok)

  return {
    status: allOk ? 'ok' : anyOk ? 'degraded' : 'down',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  }
}
