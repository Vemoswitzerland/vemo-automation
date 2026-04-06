/**
 * Next.js instrumentation hook — runs once on server startup.
 * Starts the background email scheduler.
 */
export async function register() {
  // Only run in Node.js runtime (not edge), and only in server context
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('@/lib/scheduler')
    startScheduler()
  }
}
