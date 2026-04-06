import AdDetail from '@/components/ads/AdDetail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdDetailPage({ params }: Props) {
  const { id } = await params
  return <AdDetail id={id} />
}
