import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CONNECTORS } from '@/lib/connectors/registry'
import { getUserId } from '@/lib/user-context'

// GET /api/connectors — all connectors with their stored state
// Connectors are system-level resources visible to all authenticated users.
export async function GET(req: NextRequest) {
  try {
    const states = await prisma.connector.findMany()
    const stateMap = new Map(states.map((s) => [s.id, s]))

    const result = CONNECTORS.map((def) => {
      const state = stateMap.get(def.id)
      return {
        ...def,
        state: state
          ? {
              id: state.id,
              status: state.status,
              lastTestedAt: state.lastTestedAt?.toISOString() ?? null,
              errorMessage: state.errorMessage,
              createdAt: state.createdAt.toISOString(),
              updatedAt: state.updatedAt.toISOString(),
            }
          : null,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Laden der Connectors' }, { status: 500 })
  }
}
