'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import AdsAdDetail from '@/components/ads/AdsAdDetail'

export default function AdDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params)
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <AdsAdDetail
          campaignId={campaignId}
          onBack={() => router.push('/ads')}
        />
      </div>
    </div>
  )
}
