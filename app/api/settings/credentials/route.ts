import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const ENV_PATH = path.join(process.cwd(), '.env.local')

// Read current .env.local content
async function readEnvFile(): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(ENV_PATH, 'utf-8')
    const result: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      result[key] = value
    }
    return result
  } catch {
    return {}
  }
}

// Write updated env back to file (preserving comments/structure)
async function writeEnvFile(updates: Record<string, string>): Promise<void> {
  let content = ''
  try {
    content = await fs.readFile(ENV_PATH, 'utf-8')
  } catch {
    // File doesn't exist yet
  }

  const lines = content.split('\n')
  const updatedKeys = new Set<string>()

  const newLines = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return line
    const eq = trimmed.indexOf('=')
    if (eq === -1) return line
    const key = trimmed.slice(0, eq).trim()
    if (key in updates) {
      updatedKeys.add(key)
      return `${key}=${updates[key]}`
    }
    return line
  })

  // Add new keys that weren't in the file
  for (const [key, value] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${value}`)
    }
  }

  await fs.writeFile(ENV_PATH, newLines.join('\n'), 'utf-8')
}

// GET /api/settings/credentials — return which env vars are configured (no values)
export async function GET() {
  const env = await readEnvFile()
  const status: Record<string, boolean> = {}
  for (const key of Object.keys(env)) {
    status[key] = Boolean(env[key] && env[key] !== '' && !env[key].includes('your-') && !env[key].includes('DEIN-') && !env[key].includes('KEY-DES'))
  }
  return NextResponse.json(status)
}

// POST /api/settings/credentials — update specific env vars
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const updates = body.credentials as Record<string, string>

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
    }

    // Filter out empty values (don't overwrite with empty)
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v && v.trim() !== '')
    )

    await writeEnvFile(filtered)
    return NextResponse.json({ success: true, updated: Object.keys(filtered) })
  } catch (err) {
    console.error('Credentials write error:', err)
    return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 })
  }
}
