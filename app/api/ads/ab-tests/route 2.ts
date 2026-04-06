/**
 * Ads A/B Tests API
 *
 * POST /api/ads/ab-tests  — create a new A/B test
 * GET  /api/ads/ab-tests  — list all tests for user
 *
 * Architecture note: Variants hold mock ROAS data until a real Ads API
 * (Meta Ads, Google Ads) is connected. All logic (winner detection, scaling)
 * runs inside the cron endpoint /api/cron/evaluate-ab-tests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

export async function GET(request: NextRequest) {
  const userId = getUserId(request)

  try {
    const tests = await prisma.adsAbTest.findMany({
      where: { userId },
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ tests })
  } catch (err) {
    console.error('[ab-tests] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch A/B tests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request)

  try {
    const body = await request.json()
    const { name, campaignId, trafficSplit, autoScaling, variants } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (!variants || !Array.isArray(variants) || variants.length < 2) {
      return NextResponse.json({ error: 'At least 2 variants are required' }, { status: 400 })
    }

    const test = await prisma.adsAbTest.create({
      data: {
        userId,
        name,
        campaignId: campaignId ?? null,
        trafficSplit: trafficSplit ?? 0.5,
        autoScaling: autoScaling !== false,
        status: 'running',
        variants: {
          create: variants.map((v: { label?: string; adId?: string; budget?: number; spend?: number; revenue?: number; impressions?: number; clicks?: number; conversions?: number }) => ({
            label: v.label ?? 'Variant',
            adId: v.adId ?? null,
            budget: v.budget ?? 0,
            spend: v.spend ?? 0,
            revenue: v.revenue ?? 0,
            impressions: v.impressions ?? 0,
            clicks: v.clicks ?? 0,
            conversions: v.conversions ?? 0,
            status: 'active',
          })),
        },
      },
      include: { variants: true },
    })

    // Audit log
    await prisma.adsAuditLog.create({
      data: {
        userId,
        entity: 'ab_test',
        entityId: test.id,
        action: 'created',
        after: JSON.stringify(test),
        triggeredBy: 'user',
      },
    })

    return NextResponse.json({ test }, { status: 201 })
  } catch (err) {
    console.error('[ab-tests] POST error:', err)
    return NextResponse.json({ error: 'Failed to create A/B test' }, { status: 500 })
  }
}
