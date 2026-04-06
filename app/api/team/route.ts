import { NextResponse } from 'next/server'

const PAPERCLIP_API_URL = process.env.PAPERCLIP_API_URL || 'http://127.0.0.1:3100'
const PAPERCLIP_COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID || '668a02c4-498b-4020-8477-0f1125f6cb03'

async function paperclipFetch(path: string) {
  const headers: Record<string, string> = {}
  const apiKey = process.env.PAPERCLIP_API_KEY
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
  const res = await fetch(`${PAPERCLIP_API_URL}${path}`, { headers, next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`Paperclip API error: ${res.status} ${path}`)
  return res.json()
}

export async function GET() {
  try {
    const [agents, issues, dashboard] = await Promise.all([
      paperclipFetch(`/api/companies/${PAPERCLIP_COMPANY_ID}/agents`),
      paperclipFetch(`/api/companies/${PAPERCLIP_COMPANY_ID}/issues?status=in_progress,todo&limit=50`),
      paperclipFetch(`/api/companies/${PAPERCLIP_COMPANY_ID}/dashboard`),
    ])

    // Map active issues per agent
    const issuesByAgent: Record<string, typeof issues[0][]> = {}
    for (const issue of issues) {
      if (issue.assigneeAgentId) {
        if (!issuesByAgent[issue.assigneeAgentId]) issuesByAgent[issue.assigneeAgentId] = []
        issuesByAgent[issue.assigneeAgentId].push(issue)
      }
    }

    const enrichedAgents = agents.map((agent: Record<string, unknown>) => ({
      ...agent,
      activeTasks: issuesByAgent[agent.id as string] || [],
    }))

    return NextResponse.json({
      agents: enrichedAgents,
      dashboard,
      allIssues: issues,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Fehler beim Laden der Team-Daten', fetchedAt: new Date().toISOString() },
      { status: 503 }
    )
  }
}
