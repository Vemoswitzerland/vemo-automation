/**
 * POST /api/ads/create-test
 * Creates a new A/B test for two ad variants.
 *
 * Body:
 * {
 *   name: string
 *   variantA: { adId: string, name: string, budget: number }
 *   variantB: { adId: string, name: string, budget: number }
 *   trafficSplit?: number  // 0.0–1.0 for variant A (default 0.5)
 *   autoScaling?: boolean  // default true
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

export async function POST(request: NextRequest) {
  const userId = getUserId(request)

  let body: {
    name: string
    variantA: { adId: string; name: string; budget: number }
    variantB: { adId: string; name: string; budget: number }
    trafficSplit?: number
    autoScaling?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, variantA, variantB, trafficSplit = 0.5, autoScaling = true } = body

  if (!name || !variantA?.adId || !variantB?.adId) {
    return NextResponse.json(
      { error: 'name, variantA.adId and variantB.adId are required' },
      { status: 400 }
    )
  }

  if (trafficSplit < 0 || trafficSplit > 1) {
    return NextResponse.json(
      { error: 'trafficSplit must be between 0 and 1' },
      { status: 400 }
    )
  }

  try {
    // Create A/B test with two variants
    const abTest = await prisma.adsAbTest.create({
      data: {
        userId,
        name,
        trafficSplit,
        autoScaling,
        status: 'running',
        variants: {
          create: [
            {
              label: 'A',
              adId: variantA.adId,
              budget: variantA.budget ?? 0,
              status: 'active',
            },
            {
              label: 'B',
              adId: variantB.adId,
              budget: variantB.budget ?? 0,
              status: 'active',
            },
          ],
        },
      },
      include: { variants: true },
    })

    // Log test creation in audit trail
    await prisma.adsAuditLog.create({
      data: {
        userId,
        entity: 'ab_test',
        entityId: abTest.id,
        action: 'test_created',
        after: JSON.stringify({
          name,
          trafficSplit,
          autoScaling,
          variantA: variantA.adId,
          variantB: variantB.adId,
        }),
        reason: 'A/B test created via API',
        triggeredBy: 'user',
      },
    })

    return NextResponse.json({ abTest, message: 'A/B test created successfully' }, { status: 201 })
  } catch (err) {
    console.error('[create-test] Error:', err)
    return NextResponse.json({ error: 'Failed to create A/B test' }, { status: 500 })
  }
}

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
    console.error('[create-test GET] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch A/B tests' }, { status: 500 })
  }
}
