/**
 * Generic retry utility with exponential backoff.
 * Retries up to maxAttempts times on transient errors.
 * Delays: 1s, 2s, 4s (exponential)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    baseDelayMs?: number
    label?: string
    onError?: (error: unknown, attempt: number) => void
  } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, label = 'operation', onError } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      onError?.(error, attempt)

      if (attempt < maxAttempts) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1)
        console.warn(`[retry] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms:`, error)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      } else {
        console.error(`[retry] ${label} failed after ${maxAttempts} attempts:`, error)
      }
    }
  }

  throw lastError
}
