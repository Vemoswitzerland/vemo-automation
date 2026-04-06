/**
 * Ads Campaigns API — Stub
 *
 * Architecture note: This stub uses the local SQLite DB (AdsCampaign model).
 * When a real Ads API (Meta Ads, Google Ads) is connected, replace the
 * prisma calls below with API client calls and set the env vars:
 *   META_ADS_TOKEN, META_ADS_ACCOUNT_ID, GOOGLE_ADS_TOKEN
 *
 * The response shape stays identical so the frontend never needs updating.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/user-context'

const MOCK_CAMPAIGNS = [
  { id: 'mock-c1', name: 'Instagram Frühjahr 2026', platform: 'meta', status: 'active', budget: 640, spend: 487.50, reach: 48000, clicks: 1240, leads: 67, startDate: '2026-03-01T00:00:00.000Z', endDate: '2026-04-30T00:00:00.000Z', externalId: null, syncedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-c2', name: 'Facebook Retargeting', platform: 'meta', status: 'active', budget: 420, spend: 312.00, reach: 31000, clicks: 890, leads: 45, startDate: '2026-03-15T00:00:00.000Z', endDate: null, externalId: null, syncedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-c3', name: 'Google Search Vemo', platform: 'google', status: 'active', budget: 580, spend: 421.00, reach: 28500, clicks: 870, leads: 38, startDate: '2026-02-01T00:00:00.000Z', endDate: null, externalId: null, syncedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-c4', name: 'Facebook Brand Awareness', platform: 'meta', status: 'paused', budget: 200, spend: 200, reach: 17000, clicks: 280, leads: 12, startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-02-28T00:00:00.000Z', externalId: null, syncedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  try {
    const where: any = { userId, ...(status ? { status } : {}) }
    const campaigns = await prisma.adsCampaign.findMany({ where, orderBy: { createdAt: 'desc' } })

    if (campaigns.length === 0) {
      const filtered = status ? MOCK_CAMPAIGNS.filter((c) => c.status === status) : MOCK_CAMPAIGNS
      const totalSpend = filtered.reduce((sum, c) => sum + c.spend, 0)
      const totalLeads = filtered.reduce((sum, c) => sum + c.leads, 0)
      return NextResponse.json({ campaigns: filtered, isMock: true, summary: { totalSpend, totalLeads, activeCampaigns: filtered.filter((c) => c.status === 'active').length } })
    }

    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0)
    const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0)
    return NextResponse.json({ campaigns, isMock: false, summary: { totalSpend, totalLeads, activeCampaigns: campaigns.filter((c) => c.status === 'active').length } })
  } catch {
    const totalSpend = MOCK_CAMPAIGNS.reduce((sum, c) => sum + c.spend, 0)
    const totalLeads = MOCK_CAMPAIGNS.reduce((sum, c) => sum + c.leads, 0)
    return NextResponse.json({ campaigns: MOCK_CAMPAIGNS, isMock: true, summary: { totalSpend, totalLeads, activeCampaigns: 3 } })
  }
}
