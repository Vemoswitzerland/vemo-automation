import dynamic from 'next/dynamic'
import { prisma } from '@/lib/db'

const FlowBuilder = dynamic(() => import('@/components/flow/FlowBuilder'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 rounded-xl animate-pulse flex items-center justify-center border border-gray-200">
      <span className="text-gray-400 text-sm">Flow Builder wird geladen...</span>
    </div>
  ),
})

interface PageProps {
  searchParams: Promise<{ id?: string; template?: string }>
}

export default async function EditorPage({ searchParams }: PageProps) {
  const params = await searchParams
  let flow = null

  if (params.id) {
    try {
      flow = await prisma.flow.findUnique({ where: { id: params.id } })
    } catch {
      /* flow not found */
    }
  }

  const initialNodes = flow ? JSON.parse(flow.nodes) : []
  const initialEdges = flow ? JSON.parse(flow.edges) : []

  return (
    <div className="w-full" style={{ height: 'calc(100vh - 80px)', minHeight: '500px' }}>
      <FlowBuilder
        flowId={flow?.id}
        initialName={flow?.name ?? 'Neuer Flow'}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
      />
    </div>
  )
}
