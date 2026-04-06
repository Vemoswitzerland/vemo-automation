/**
 * LinkedIn Client Interface — lib/linkedin/client.ts
 *
 * Abstraction over the LinkedIn API v2.
 * Returns a MockLinkedInClient when LINKEDIN_ACCESS_TOKEN is not set.
 * Add real credentials via .env.local → no code changes needed.
 */

export interface LinkedInPostPayload {
  text: string
  imageUrl?: string
}

export interface LinkedInPublishResult {
  postId: string
  permalink: string
  mock: boolean
}

export interface LinkedInProfileInfo {
  name: string
  followersCount: number
}

export interface LinkedInClient {
  publish(post: LinkedInPostPayload): Promise<LinkedInPublishResult>
  getProfileInfo(): Promise<LinkedInProfileInfo>
}

class MockLinkedInClient implements LinkedInClient {
  async publish(_post: LinkedInPostPayload): Promise<LinkedInPublishResult> {
    await new Promise((r) => setTimeout(r, 600))
    const mockId = `mock_urn_li_share_${Date.now()}`
    return {
      postId: mockId,
      permalink: `https://www.linkedin.com/company/vemo-ch/posts/${mockId}`,
      mock: true,
    }
  }

  async getProfileInfo(): Promise<LinkedInProfileInfo> {
    return { name: 'Vemo CH (Demo)', followersCount: 890 }
  }
}

class RealLinkedInClient implements LinkedInClient {
  constructor(
    private readonly accessToken: string,
    private readonly authorUrn: string, // e.g. "urn:li:organization:12345"
  ) {}

  async publish(post: LinkedInPostPayload): Promise<LinkedInPublishResult> {
    const body: Record<string, unknown> = {
      author: this.authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: post.text },
          shareMediaCategory: post.imageUrl ? 'IMAGE' : 'NONE',
          ...(post.imageUrl
            ? {
                media: [
                  {
                    status: 'READY',
                    originalUrl: post.imageUrl,
                  },
                ],
              }
            : {}),
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error(`LinkedIn post failed: ${await res.text()}`)
    const { id } = await res.json()
    const shareId = id.split(':').pop() ?? id

    return {
      postId: id,
      permalink: `https://www.linkedin.com/company/vemo-ch/posts/${shareId}`,
      mock: false,
    }
  }

  async getProfileInfo(): Promise<LinkedInProfileInfo> {
    const res = await fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    })
    if (!res.ok) return { name: 'unknown', followersCount: 0 }
    const data = await res.json()
    const name = `${data.localizedFirstName ?? ''} ${data.localizedLastName ?? ''}`.trim()
    return { name: name || 'unknown', followersCount: 0 }
  }
}

export function createLinkedInClient(): LinkedInClient {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  const authorUrn = process.env.LINKEDIN_AUTHOR_URN // e.g. "urn:li:organization:12345"
  if (token && authorUrn) {
    return new RealLinkedInClient(token, authorUrn)
  }
  return new MockLinkedInClient()
}

export const isMockLinkedIn = !process.env.LINKEDIN_ACCESS_TOKEN
