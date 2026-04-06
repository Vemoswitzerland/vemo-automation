import InstagramDashboard from '@/components/instagram/InstagramDashboard'

export default function InstagramPage() {
  const isMock = !process.env.INSTAGRAM_ACCESS_TOKEN

  return <InstagramDashboard isMock={isMock} />
}
