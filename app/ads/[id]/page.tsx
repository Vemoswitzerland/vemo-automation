'use client'

import { use } from 'react'
import AdDetail from '@/components/ads/AdDetail'

interface Props {
  params: Promise<{ id: string }>
}

export default function AdDetailPage({ params }: Props) {
  const { id } = use(params)
  return <AdDetail id={id} />
}
