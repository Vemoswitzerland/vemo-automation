/**
 * Facebook Client Interface — lib/facebook/client.ts
 *
 * Abstraction over the Facebook Graph API.
 * Returns a MockFacebookClient when FACEBOOK_PAGE_ACCESS_TOKEN is not set.
 * Add real credentials via .env.local → no code changes needed.
 */

export interface FacebookPostPayload {
  message: string
  imageUrl?: string
}

export interface FacebookPublishResult {
  postId: string
  permalink: string
  mock: boolean
}

export interface FacebookPageInfo {
  name: string
  fanCount: number
}

export interface FacebookClient {
  publish(post: FacebookPostPayload): Promise<FacebookPublishResult>
  getPageInfo(): Promise<FacebookPageInfo>
}

class MockFacebookClient implements FacebookClient {
  async publish(_post: FacebookPostPayload): Promise<FacebookPublishResult> {
    await new Promise((r) => setTimeout(r, 600))
    const mockId = `mock_${Date.now()}`
    return {
      postId: mockId,
      permalink: `https://www.facebook.com/vemo.ch/posts/${mockId}`,
      mock: true,
    }
  }

  async getPageInfo(): Promise<FacebookPageInfo> {
    return { name: 'Vemo CH (Demo)', fanCount: 4200 }
  }
}

class RealFacebookClient implements FacebookClient {
  constructor(
    private readonly pageAccessToken: string,
    private readonly pageId: string,
  ) {}

  async publish(post: FacebookPostPayload): Promise<FacebookPublishResult> {
    const body: Record<string, string> = {
      message: post.message,
      access_token: this.pageAccessToken,
    }
    if (post.imageUrl) {
      // Photo post
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${this.pageId}/photos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, url: post.imageUrl }),
        },
      )
      if (!res.ok) throw new Error(`Facebook photo post failed: ${await res.text()}`)
      const { id } = await res.json()
      return {
        postId: id,
        permalink: `https://www.facebook.com/${this.pageId}/posts/${id}`,
        mock: false,
      }
    }

    // Text-only post
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${this.pageId}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) throw new Error(`Facebook feed post failed: ${await res.text()}`)
    const { id } = await res.json()
    return {
      postId: id,
      permalink: `https://www.facebook.com/${this.pageId}/posts/${id}`,
      mock: false,
    }
  }

  async getPageInfo(): Promise<FacebookPageInfo> {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${this.pageId}?fields=name,fan_count&access_token=${this.pageAccessToken}`,
    )
    if (!res.ok) return { name: 'unknown', fanCount: 0 }
    const data = await res.json()
    return { name: data.name ?? 'unknown', fanCount: data.fan_count ?? 0 }
  }
}

export function createFacebookClient(): FacebookClient {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  const pageId = process.env.FACEBOOK_PAGE_ID
  if (token && pageId) {
    return new RealFacebookClient(token, pageId)
  }
  return new MockFacebookClient()
}

export const isMockFacebook = !process.env.FACEBOOK_PAGE_ACCESS_TOKEN
