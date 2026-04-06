import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CONNECTORS } from '@/lib/connectors/registry'

// GET /api/connectors — all connectors with their stored state
export async function GET() {
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
