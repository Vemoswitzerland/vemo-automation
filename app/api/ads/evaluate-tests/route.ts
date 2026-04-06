/**
 * POST /api/ads/evaluate-tests
 * Cron job endpoint: evaluates all running A/B tests.
 * Called daily (e.g. via Vercel Cron or external scheduler).
 *
 * Logic:
 * 1. Load all running A/B tests with variants
 * 2. Calculate ROAS for each variant (revenue / spend)
 * 3. Detect winner with >= 95% confidence (z-test on conversion rates)
 * 4. Auto-scale winner: +20% budget
 * 5. Auto-pause/reduce loser: -50% budget or pause
 * 6. Log all changes in AdsAuditLog
 * 7. Mark test as completed if winner found
 *
 * GET /api/ads/evaluate-tests
 * Returns all A/B tests with results + audit logs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

const CRON_SECRET = process.env.CRON_SECRET ?? 'dev-cron-secret'
const WINNER_CONFIDENCE_THRESHOLD = 0.95
const WINNER_BUDGET_SCALE = 1.2   // +20%
const LOSER_BUDGET_SCALE  = 0.5   // -50%
const MIN_SPEND_FOR_EVALUATION = 10 // CHF — don't evaluate tiny samples

/**
 * Z-test for two proportions: compares conversion rates of A vs B.
 * Returns a confidence value (0.0–1.0) that A ≠ B (two-sided).
 * Caller decides which is winner based on ROAS comparison.
 */
function calcConfidence(
  conversionsA: number, impressionsA: number,
  conversionsB: number, impressionsB: number
): number {
  if (impressionsA < 1 || impressionsB < 1) return 0

  const pA = conversionsA / impressionsA
  const pB = conversionsB / impressionsB
  const pPool = (conversionsA + conversionsB) / (impressionsA + impressionsB)

  const se = Math.sqrt(pPool * (1 - pPool) * (1 / impressionsA + 1 / impressionsB))
  if (se === 0) return 0

  const z = Math.abs(pA - pB) / se

  // Approximate CDF for N(0,1) → confidence = 1 - 2 * P(Z > |z|)
  // Using Abramowitz & Stegun approximation
  const t = 1 / (1 + 0.2316419 * z)
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  const phi = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly
  const confidence = 2 * phi - 1

  return Math.min(Math.max(confidence, 0), 1)
}

function calcROAS(variant: { revenue: number; spend: number }): number {
  if (variant.spend <= 0) return 0
  return variant.revenue / variant.spend
}

export async function POST(request: NextRequest) {
  // Allow both cron secret header auth and user session for manual trigger
  const authHeader = request.headers.get('x-cron-secret')
  const isSystemCron = authHeader === CRON_SECRET

  if (!isSystemCron) {
    // Allow authenticated user to trigger manually (for testing)
    const userId = getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const runningTests = await prisma.adsAbTest.findMany({
      where: { status: 'running' },
      include: { variants: true },
    })

    const results: {
      testId: string
      testName: string
      winner: string | null
      confidence: number
      roasA: number
      roasB: number
      actionsApplied: string[]
    }[] = []

    for (const test of runningTests) {
      if (!test.autoScaling) continue // Manual override — skip auto-scaling

      const varA = test.variants.find((v) => v.label === 'A')
      const varB = test.variants.find((v) => v.label === 'B')

      if (!varA || !varB) continue

      // Skip if insufficient spend data
      if (varA.spend < MIN_SPEND_FOR_EVALUATION && varB.spend < MIN_SPEND_FOR_EVALUATION) {
        results.push({
          testId: test.id,
          testName: test.name,
          winner: null,
          confidence: 0,
          roasA: 0,
          roasB: 0,
          actionsApplied: ['skipped: insufficient spend data'],
        })
        continue
      }

      const roasA = calcROAS(varA)
      const roasB = calcROAS(varB)

      const confidence = calcConfidence(
        varA.conversions, varA.impressions,
        varB.conversions, varB.impressions
      )

      const actionsApplied: string[] = []
      let winnerLabel: string | null = null

      if (confidence >= WINNER_CONFIDENCE_THRESHOLD) {
        winnerLabel = roasA >= roasB ? 'A' : 'B'
        const loserLabel = winnerLabel === 'A' ? 'B' : 'A'
        const winner = winnerLabel === 'A' ? varA : varB
        const loser = winnerLabel === 'A' ? varB : varA

        const newWinnerBudget = Math.round(winner.budget * WINNER_BUDGET_SCALE * 100) / 100
        const newLoserBudget  = Math.round(loser.budget * LOSER_BUDGET_SCALE * 100) / 100
        const loserAction     = newLoserBudget < 5 ? 'paused' : 'budget_reduced'

        // Update winner: +20% budget, mark as winner
        await prisma.adsAbTestVariant.update({
          where: { id: winner.id },
          data: { budget: newWinnerBudget, status: 'winner' },
        })

        // Update loser: -50% or pause
        await prisma.adsAbTestVariant.update({
          where: { id: loser.id },
          data: {
            budget: loserAction === 'paused' ? 0 : newLoserBudget,
            status: loserAction === 'paused' ? 'paused' : 'loser',
          },
        })

        // Mark test as completed
        await prisma.adsAbTest.update({
          where: { id: test.id },
          data: {
            status: 'completed',
            winnerVariantId: winner.id,
            evaluatedAt: new Date(),
            completedAt: new Date(),
          },
        })

        // Audit log: winner scaled
        await prisma.adsAuditLog.create({
          data: {
            userId: test.userId,
            entity: 'ab_test',
            entityId: test.id,
            action: 'budget_scaled',
            before: JSON.stringify({ variantId: winner.id, budget: winner.budget }),
            after: JSON.stringify({ variantId: winner.id, budget: newWinnerBudget }),
            reason: `Winner ${winnerLabel} detected (ROAS: ${roasA >= roasB ? roasA.toFixed(2) : roasB.toFixed(2)}, confidence: ${(confidence * 100).toFixed(1)}%)`,
            triggeredBy: 'cron',
          },
        })

        // Audit log: loser reduced/paused
        await prisma.adsAuditLog.create({
          data: {
            userId: test.userId,
            entity: 'ab_test',
            entityId: test.id,
            action: loserAction,
            before: JSON.stringify({ variantId: loser.id, budget: loser.budget }),
            after: JSON.stringify({ variantId: loser.id, budget: loserAction === 'paused' ? 0 : newLoserBudget }),
            reason: `Loser ${loserLabel} — budget ${loserAction === 'paused' ? 'paused (budget < 5 CHF)' : 'reduced by 50%'}`,
            triggeredBy: 'cron',
          },
        })

        actionsApplied.push(
          `Winner ${winnerLabel}: budget ${winner.budget} → ${newWinnerBudget} CHF (+20%)`,
          `Loser ${loserLabel}: ${loserAction === 'paused' ? 'paused' : `budget ${loser.budget} → ${newLoserBudget} CHF (-50%)`}`,
        )
      } else {
        // No winner yet — just record evaluation timestamp
        await prisma.adsAbTest.update({
          where: { id: test.id },
          data: { evaluatedAt: new Date() },
        })
        actionsApplied.push(`No winner yet (confidence: ${(confidence * 100).toFixed(1)}%, threshold: ${WINNER_CONFIDENCE_THRESHOLD * 100}%)`)
      }

      results.push({
        testId: test.id,
        testName: test.name,
        winner: winnerLabel,
        confidence: Math.round(confidence * 1000) / 1000,
        roasA: Math.round(roasA * 100) / 100,
        roasB: Math.round(roasB * 100) / 100,
        actionsApplied,
      })
    }

    return NextResponse.json({
      evaluated: results.length,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (err) {
    console.error('[evaluate-tests] Error:', err)
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // optional filter

  try {
    const where: { userId: string; status?: string } = { userId }
    if (status) where.status = status

    const tests = await prisma.adsAbTest.findMany({
      where,
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    })

    // Get recent audit logs for all test IDs
    const testIds = tests.map((t) => t.id)
    const auditLogs = await prisma.adsAuditLog.findMany({
      where: {
        entity: 'ab_test',
        entityId: { in: testIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ tests, auditLogs })
  } catch (err) {
    console.error('[evaluate-tests GET] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch test results' }, { status: 500 })
  }
}
