import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/auth'
import { analyzeScreenshot } from '@/lib/gemini'
import { screenshotToBase64 } from '@clarvo/utils'
import { FREE_TIER_LIMITS } from '@clarvo/utils'
import { z } from 'zod'

const Schema = z.object({
  sessionId: z.string().uuid(),
  imageDataUrl: z.string().startsWith('data:image/'),
  audioContext: z.string().max(500).optional().default(''),
})

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedClient(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('billing_tier')
      .eq('id', user.id)
      .single()

    // Free tier: 3 screenshots per session
    if (profile?.billing_tier === 'FREE') {
      const body = await request.json()
      const parsed = Schema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

      const screenshotCount = await supabase
        .from('screenshots')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', parsed.data.sessionId)

      if ((screenshotCount.count ?? 0) >= FREE_TIER_LIMITS.SCREENSHOTS_PER_SESSION) {
        return NextResponse.json(
          { error: `Free tier allows ${FREE_TIER_LIMITS.SCREENSHOTS_PER_SESSION} screenshots per session. Upgrade to Pro for unlimited.`, upgradeRequired: true },
          { status: 402 }
        )
      }
    }

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { sessionId, imageDataUrl, audioContext } = parsed.data
    const base64 = screenshotToBase64(imageDataUrl)
    const analysis = await analyzeScreenshot(base64, audioContext)

    // Store screenshot in Supabase (base64 data URL + Gemini vision analysis)
    await supabase.from('screenshots').insert({
      session_id: sessionId,
      data_url: imageDataUrl,
      analysis,
    })

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('[/api/ai/screenshot]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
