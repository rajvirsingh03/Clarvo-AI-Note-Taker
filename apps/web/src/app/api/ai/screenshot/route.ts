import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/auth'
import { z } from 'zod'

const Schema = z.object({
  sessionId: z.string().uuid(),
  imageDataUrl: z.string().startsWith('data:image/'),
})

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedClient(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse body once upfront — eliminates the duplicate parse that existed
    // in the free-tier branch where the body was parsed twice.
    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { sessionId, imageDataUrl } = parsed.data

    // ── Fetch billing + session ownership in parallel ─────────────────────────
    const [profileResult, sessionResult] = await Promise.all([
      supabase
        .from('users')
        .select('billing_tier')
        .eq('id', user.id)
        .single(),
      supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single(),
    ])

    if (!sessionResult.data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Free tier: 3 screenshots per session
    if (profileResult.data?.billing_tier === 'FREE') {
      const { count } = await supabase
        .from('screenshots')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)

      // Lazy import FREE_TIER_LIMITS to avoid circular dep issues during cold start
      const { FREE_TIER_LIMITS } = await import('@clarvo/utils')
      if ((count ?? 0) >= FREE_TIER_LIMITS.SCREENSHOTS_PER_SESSION) {
        return NextResponse.json(
          { error: `Free tier allows ${FREE_TIER_LIMITS.SCREENSHOTS_PER_SESSION} screenshots per session. Upgrade to Pro for unlimited.`, upgradeRequired: true },
          { status: 402 }
        )
      }
    }

    // Store screenshot in Supabase
    await supabase.from('screenshots').insert({
      session_id: sessionId,
      data_url: imageDataUrl,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/ai/screenshot]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
