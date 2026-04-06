/**
 * Lead Scoring — lib/leads/scoring.ts
 *
 * Computes a 0–100 score for a lead based on:
 *  - Source quality (referral > google > instagram > facebook > manual)
 *  - Status progression (converted = highest, lost = lowest)
 *  - Deal value (higher value → higher score contribution)
 *  - Engagement (has email AND phone → bonus)
 *  - Recency (created recently → small bonus)
 *
 * All factor weights sum to 100 points max.
 */

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type LeadSource = 'instagram' | 'facebook' | 'google_ads' | 'referral' | 'manual'

export interface LeadScoreInput {
  source: LeadSource
  status: LeadStatus
  value: number | null
  hasEmail: boolean
  hasPhone: boolean
  createdAt: Date | string
  lastContact: Date | string | null
}

export interface LeadScoreResult {
  total: number          // 0–100
  breakdown: {
    source: number       // 0–25
    status: number       // 0–35
    value: number        // 0–25
    engagement: number   // 0–10
    recency: number      // 0–5
  }
}

// ─── Weights ───────────────────────────────────────────────────────────────────

const SOURCE_SCORES: Record<LeadSource, number> = {
  referral:   25,
  google_ads: 20,
  instagram:  15,
  facebook:   12,
  manual:     8,
}

const STATUS_SCORES: Record<LeadStatus, number> = {
  converted: 35,
  qualified: 28,
  contacted: 18,
  new:       10,
  lost:       0,
}

const MAX_VALUE_SCORE = 25
const VALUE_SCALE = 5000  // CHF value that yields full 25 points

const MAX_ENGAGEMENT_SCORE = 10
const MAX_RECENCY_SCORE = 5
const RECENCY_WINDOW_DAYS = 30

// ─── Helpers ───────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

function daysSince(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
}

// ─── Scoring Functions ─────────────────────────────────────────────────────────

export function scoreSource(source: LeadSource): number {
  return SOURCE_SCORES[source] ?? 0
}

export function scoreStatus(status: LeadStatus): number {
  return STATUS_SCORES[status] ?? 0
}

export function scoreValue(value: number | null): number {
  if (!value || value <= 0) return 0
  return clamp(Math.round((value / VALUE_SCALE) * MAX_VALUE_SCORE), 0, MAX_VALUE_SCORE)
}

export function scoreEngagement(hasEmail: boolean, hasPhone: boolean): number {
  if (hasEmail && hasPhone) return MAX_ENGAGEMENT_SCORE
  if (hasEmail || hasPhone) return Math.round(MAX_ENGAGEMENT_SCORE * 0.6)
  return 0
}

export function scoreRecency(createdAt: Date | string): number {
  const days = daysSince(createdAt)
  if (days < 0) return MAX_RECENCY_SCORE
  const score = MAX_RECENCY_SCORE * (1 - clamp(days / RECENCY_WINDOW_DAYS, 0, 1))
  return Math.round(score)
}

// ─── Main Scorer ───────────────────────────────────────────────────────────────

export function scoreLead(input: LeadScoreInput): LeadScoreResult {
  const source     = scoreSource(input.source)
  const status     = scoreStatus(input.status)
  const value      = scoreValue(input.value)
  const engagement = scoreEngagement(input.hasEmail, input.hasPhone)
  const recency    = scoreRecency(input.createdAt)

  const total = clamp(source + status + value + engagement + recency, 0, 100)

  return {
    total,
    breakdown: { source, status, value, engagement, recency },
  }
}

// ─── Score Label ───────────────────────────────────────────────────────────────

export type ScoreLabel = 'high' | 'medium' | 'low'

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

// ─── Batch Scoring ─────────────────────────────────────────────────────────────

export function scoreLeadsBatch(
  leads: Array<LeadScoreInput & { id: string }>,
): Array<{ id: string; score: LeadScoreResult }> {
  return leads.map(lead => ({ id: lead.id, score: scoreLead(lead) }))
}
