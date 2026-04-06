import dynamic from 'next/dynamic'
import Link from 'next/link'
import { prisma } from '@/lib/db'

const FlowBuilder = dynamic(() => import('@/components/flow/FlowBuilder'), { ssr: false })

interface PageProps {
  searchParams: { id?: string }
}

export default async function FlowBuilderPage({ searchParams }: PageProps) {
  let flow = null
  if (searchParams.id) {
    try {
      flow = await prisma.flow.findUnique({ where: { id: searchParams.id } })
    } catch {
      // Flow not found
    }
  }

  const initialNodes = flow ? JSON.parse(flow.nodes) : []
  const initialEdges = flow ? JSON.parse(flow.edges) : []

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/flows" className="text-gray-500 hover:text-gray-900 transition-colors">
          ← Flows
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-900">{flow?.name ?? 'Neuer Flow'}</span>
        {flow?.status && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            flow.status === 'active' ? 'bg-green-100 text-green-700' :
            flow.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {flow.status === 'active' ? 'Aktiv' : flow.status === 'paused' ? 'Pausiert' : 'Entwurf'}
          </span>
        )}
        {flow?.version && (
          <span className="text-xs text-gray-400">v{flow.version}</span>
        )}
      </div>

      {/* Builder */}
      <FlowBuilder
        flowId={flow?.id}
        initialName={flow?.name ?? 'Unbenannter Flow'}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
      />
    </div>
  )
}
