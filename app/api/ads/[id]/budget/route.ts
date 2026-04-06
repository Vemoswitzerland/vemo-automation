/**
 * PATCH /api/ads/[id]/budget
 * Updates the budget for a specific ad/campaign variant.
 * Supports manual overrides and auto-scaling pausing.
 *
 * Body:
 * {
 *   newBudget: number
 *   reason?: string
 *   pauseAutoScaling?: boolean  // true = disable auto-scaling for this ad
 *   abTestId?: string           // link to A/B test if applicable
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request)
  const { id } = await params

  let body: {
    newBudget: number
    reason?: string
    pauseAutoScaling?: boolean
    abTestId?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { newBudget, reason, pauseAutoScaling, abTestId } = body

  if (newBudget === undefined || newBudget < 0) {
    return NextResponse.json(
      { error: 'newBudget is required and must be >= 0' },
      { status: 400 }
    )
  }

  try {
    // Find the campaign in DB (stub — in production, call Meta/Google Ads API)
    const campaign = await prisma.adsCampaign.findFirst({
      where: {
        OR: [{ id: id }, { externalId: id }],
        userId,
      },
    })

    const previousBudget = campaign?.budget ?? 0

    // Update campaign budget in DB if found
    let updatedCampaign = campaign
    if (campaign) {
      updatedCampaign = await prisma.adsCampaign.update({
        where: { id: campaign.id },
        data: { budget: newBudget },
      })
    }

    // If linked to an A/B test variant, update variant budget too
    if (abTestId) {
      const variant = await prisma.adsAbTestVariant.findFirst({
        where: { testId: abTestId, id },
      })
      if (variant) {
        await prisma.adsAbTestVariant.update({
          where: { id: variant.id },
          data: { budget: newBudget },
        })
      }

      // If manual override: pause auto-scaling on the A/B test
      if (pauseAutoScaling) {
        await prisma.adsAbTest.update({
          where: { id: abTestId },
          data: { autoScaling: false },
        })
      }
    }

    // Always write to audit log
    await prisma.adsAuditLog.create({
      data: {
        userId,
        entity: 'campaign',
        entityId: id,
        action: pauseAutoScaling ? 'manual_override' : 'budget_updated',
        before: JSON.stringify({ budget: previousBudget }),
        after: JSON.stringify({ budget: newBudget }),
        reason: reason ?? 'Manual budget update',
        triggeredBy: 'user',
      },
    })

    return NextResponse.json({
      success: true,
      id,
      previousBudget,
      newBudget,
      autoScalingPaused: pauseAutoScaling ?? false,
      campaign: updatedCampaign ?? { id: id, budget: newBudget, note: 'Campaign not in local DB (external ad)' },
    })
  } catch (err) {
    console.error('[budget PATCH] Error:', err)
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request)
  const { id } = await params

  try {
    // Return budget history for this ad
    const logs = await prisma.adsAuditLog.findMany({
      where: { entityId: id, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const campaign = await prisma.adsCampaign.findFirst({
      where: { OR: [{ id: id }, { externalId: id }], userId },
    })

    return NextResponse.json({
      id,
      currentBudget: campaign?.budget ?? null,
      auditLog: logs,
    })
  } catch (err) {
    console.error('[budget GET] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch budget history' }, { status: 500 })
  }
}
