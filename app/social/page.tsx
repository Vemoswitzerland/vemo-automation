import SocialDashboard from '@/components/social/SocialDashboard'

const isMockInstagram = !process.env.INSTAGRAM_ACCESS_TOKEN
const isMockFacebook = !process.env.FACEBOOK_PAGE_ACCESS_TOKEN
const isMockLinkedIn = !process.env.LINKEDIN_ACCESS_TOKEN

export default function SocialPage() {
  return (
    <SocialDashboard
      isMockInstagram={isMockInstagram}
      isMockFacebook={isMockFacebook}
      isMockLinkedIn={isMockLinkedIn}
    />
  )
}
