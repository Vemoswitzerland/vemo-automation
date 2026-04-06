/**
 * Ads Analytics Client Interface — lib/ads/client.ts
 *
 * Abstraction over advertising platform APIs (Meta Ads, Google Ads).
 * Returns a MockAdsClient when AD_ACCOUNT_ID / META_ADS_TOKEN is not set.
 * Add real credentials via .env.local → no code changes needed.
 *
 * Interface-first design: swap in RealAdsClient once API tokens arrive.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdCampaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed' | 'draft'
  platform: 'meta' | 'google' | 'tiktok'
  budget: number // CHF
  spent: number  // CHF
  startDate: Date
  endDate?: Date
}

export interface AdMetrics {
  campaignId: string
  impressions: number
  clicks: number
  ctr: number       // click-through rate %
  cpc: number       // cost per click CHF
  conversions: number
  cpa: number       // cost per acquisition CHF
  roas: number      // return on ad spend
  reach: number
  spend: number     // CHF
  period: { from: Date; to: Date }
  mock: boolean
}

export interface AdInsight {
  campaignId: string
  recommendation: string
  priority: 'high' | 'medium' | 'low'
  potentialImpact: string
}

export interface AdsClient {
  getCampaigns(): Promise<AdCampaign[]>
  getMetrics(campaignId: string, from: Date, to: Date): Promise<AdMetrics>
  getAllMetrics(from: Date, to: Date): Promise<AdMetrics[]>
  getInsights(): Promise<AdInsight[]>
}

// ---------------------------------------------------------------------------
// Mock Client
// ---------------------------------------------------------------------------

const MOCK_CAMPAIGNS: AdCampaign[] = [
  {
    id: 'mock-camp-001',
    name: 'Vemo Brand Awareness Q2',
    status: 'active',
    platform: 'meta',
    budget: 500,
    spent: 312.50,
    startDate: new Date('2026-04-01'),
  },
  {
    id: 'mock-camp-002',
    name: 'Instagram Lead Generation',
    status: 'active',
    platform: 'meta',
    budget: 800,
    spent: 445.20,
    startDate: new Date('2026-03-15'),
    endDate: new Date('2026-04-30'),
  },
  {
    id: 'mock-camp-003',
    name: 'Google Search – Finanzberatung',
    status: 'paused',
    platform: 'google',
    budget: 400,
    spent: 198.75,
    startDate: new Date('2026-02-01'),
  },
]

class MockAdsClient implements AdsClient {
  async getCampaigns(): Promise<AdCampaign[]> {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_CAMPAIGNS
  }

  async getMetrics(campaignId: string, from: Date, to: Date): Promise<AdMetrics> {
    await new Promise((r) => setTimeout(r, 400))
    const camp = MOCK_CAMPAIGNS.find((c) => c.id === campaignId)
    return {
      campaignId,
      impressions: 12_480 + Math.floor(Math.random() * 2000),
      clicks: 342 + Math.floor(Math.random() * 50),
      ctr: 2.74,
      cpc: 1.30,
      conversions: 18,
      cpa: 24.73,
      roas: 3.2,
      reach: 9800,
      spend: camp?.spent ?? 200,
      period: { from, to },
      mock: true,
    }
  }

  async getAllMetrics(from: Date, to: Date): Promise<AdMetrics[]> {
    return Promise.all(MOCK_CAMPAIGNS.map((c) => this.getMetrics(c.id, from, to)))
  }

  async getInsights(): Promise<AdInsight[]> {
    return [
      {
        campaignId: 'mock-camp-001',
        recommendation: 'CTR liegt 12% unter Benchmark. Teste neue Creatives mit direkterem CTA.',
        priority: 'high',
        potentialImpact: '+15–20% CTR',
      },
      {
        campaignId: 'mock-camp-002',
        recommendation: 'Lead-Kosten gesunken. Budget-Erhöhung um 20% empfohlen.',
        priority: 'medium',
        potentialImpact: '+30% Leads bei gleichem CPA',
      },
    ]
  }
}

// ---------------------------------------------------------------------------
// Real Meta Ads Client
// ---------------------------------------------------------------------------

class RealMetaAdsClient implements AdsClient {
  private readonly baseUrl = 'https://graph.facebook.com/v19.0'

  constructor(
    private readonly accessToken: string,
    private readonly adAccountId: string,
  ) {}

  async getCampaigns(): Promise<AdCampaign[]> {
    const res = await fetch(
      `${this.baseUrl}/act_${this.adAccountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,start_time,stop_time&access_token=${this.accessToken}`,
    )
    if (!res.ok) throw new Error(`Meta Ads getCampaigns failed: ${await res.text()}`)
    const data = await res.json()
    return (data.data ?? []).map((c: Record<string, unknown>) => ({
      id: String(c.id),
      name: String(c.name),
      status: String(c.status).toLowerCase() as AdCampaign['status'],
      platform: 'meta' as const,
      budget: Number(c.daily_budget ?? c.lifetime_budget ?? 0) / 100,
      spent: 0, // fetched separately via insights
      startDate: c.start_time ? new Date(String(c.start_time)) : new Date(),
      endDate: c.stop_time ? new Date(String(c.stop_time)) : undefined,
    }))
  }

  async getMetrics(campaignId: string, from: Date, to: Date): Promise<AdMetrics> {
    const since = from.toISOString().split('T')[0]
    const until = to.toISOString().split('T')[0]
    const res = await fetch(
      `${this.baseUrl}/${campaignId}/insights?fields=impressions,clicks,ctr,cpc,actions,cost_per_action_type,reach,spend&time_range={'since':'${since}','until':'${until}'}&access_token=${this.accessToken}`,
    )
    if (!res.ok) throw new Error(`Meta Ads getMetrics failed: ${await res.text()}`)
    const data = await res.json()
    const d = data.data?.[0] ?? {}
    return {
      campaignId,
      impressions: Number(d.impressions ?? 0),
      clicks: Number(d.clicks ?? 0),
      ctr: parseFloat(d.ctr ?? '0'),
      cpc: parseFloat(d.cpc ?? '0'),
      conversions: 0,
      cpa: 0,
      roas: 0,
      reach: Number(d.reach ?? 0),
      spend: parseFloat(d.spend ?? '0'),
      period: { from, to },
      mock: false,
    }
  }

  async getAllMetrics(from: Date, to: Date): Promise<AdMetrics[]> {
    const campaigns = await this.getCampaigns()
    return Promise.all(campaigns.map((c) => this.getMetrics(c.id, from, to)))
  }

  async getInsights(): Promise<AdInsight[]> {
    // Real implementation: analyze metrics and generate recommendations
    // For now returns empty — AI-powered recommendations are a future enhancement
    return []
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAdsClient(): AdsClient {
  const token = process.env.META_ADS_ACCESS_TOKEN
  const accountId = process.env.META_ADS_ACCOUNT_ID
  if (token && accountId) {
    return new RealMetaAdsClient(token, accountId)
  }
  return new MockAdsClient()
}

export const isMockAds =
  !process.env.META_ADS_ACCESS_TOKEN || !process.env.META_ADS_ACCOUNT_ID
