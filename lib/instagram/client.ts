/**
 * Instagram Client Interface — lib/instagram/client.ts
 *
 * Abstraction over the Instagram Graph API.
 * Returns a MockInstagramClient when INSTAGRAM_ACCESS_TOKEN is not set.
 * Add real credentials via .env.local → no code changes needed.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstagramPostPayload {
  imageUrl: string
  caption: string
}

export interface InstagramPublishResult {
  postId: string
  permalink: string
  mock: boolean
}

export interface InstagramProfile {
  username: string
  followersCount: number
}

export interface InstagramClient {
  publish(post: InstagramPostPayload): Promise<InstagramPublishResult>
  getProfile(): Promise<InstagramProfile>
}

// ---------------------------------------------------------------------------
// Mock Client
// ---------------------------------------------------------------------------

class MockInstagramClient implements InstagramClient {
  async publish(post: InstagramPostPayload): Promise<InstagramPublishResult> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 600))
    const mockId = `mock_${Date.now()}`
    return {
      postId: mockId,
      permalink: `https://www.instagram.com/p/${mockId}/`,
      mock: true,
    }
  }

  async getProfile(): Promise<InstagramProfile> {
    return { username: 'demo_account', followersCount: 1337 }
  }
}

// ---------------------------------------------------------------------------
// Real Instagram Graph API Client
// ---------------------------------------------------------------------------

class RealInstagramClient implements InstagramClient {
  constructor(
    private readonly accessToken: string,
    private readonly accountId: string,
  ) {}

  async publish(post: InstagramPostPayload): Promise<InstagramPublishResult> {
    // Step 1: Create media container
    const createRes = await fetch(
      `https://graph.instagram.com/v18.0/${this.accountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: post.imageUrl,
          caption: post.caption,
          access_token: this.accessToken,
        }),
      },
    )

    if (!createRes.ok) {
      const err = await createRes.text()
      throw new Error(`Instagram media create failed: ${err}`)
    }
    const { id: creationId } = await createRes.json()

    // Step 2: Publish the media container
    const publishRes = await fetch(
      `https://graph.instagram.com/v18.0/${this.accountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: this.accessToken,
        }),
      },
    )

    if (!publishRes.ok) {
      const err = await publishRes.text()
      throw new Error(`Instagram publish failed: ${err}`)
    }
    const { id: postId } = await publishRes.json()

    return {
      postId,
      permalink: `https://www.instagram.com/p/${postId}/`,
      mock: false,
    }
  }

  async getProfile(): Promise<InstagramProfile> {
    const res = await fetch(
      `https://graph.instagram.com/v18.0/me?fields=username,followers_count&access_token=${this.accessToken}`,
    )
    if (!res.ok) return { username: 'unknown', followersCount: 0 }
    const data = await res.json()
    return {
      username: data.username ?? 'unknown',
      followersCount: data.followers_count ?? 0,
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createInstagramClient(): InstagramClient {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID
  if (token && accountId) {
    return new RealInstagramClient(token, accountId)
  }
  return new MockInstagramClient()
}

export const isMockInstagram = !process.env.INSTAGRAM_ACCESS_TOKEN
