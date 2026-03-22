import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/auth'
import { generateActionPlan } from '@/lib/gemini'
import { z } from 'zod'
import type { Database } from '@/types/supabase'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'billing_tier'>
type SessionData = Pick<Database['public']['Tables']['sessions']['Row'], 'id' | 'user_id' | 'notes'>

const Schema = z.object({
  sessionId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedClient(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { sessionId } = parsed.data

    // ── Run all read queries concurrently ─────────────────────────────────────
    // 1. Billing tier check
    // 2. Existing action plan (cache hit — return immediately if found)
    // 3. Session ownership + notes
    // All three ran serially before; now resolved in a single round-trip batch.
    const [profileResult, existingResult, sessionResult] = await Promise.all([
      supabase
        .from('users')
        .select('billing_tier')
        .eq('id', user.id)
        .single() as unknown as Promise<{ data: UserProfile | null; error: unknown }>,
      supabase
        .from('action_plans')
        .select('content')
        .eq('session_id', sessionId)
        .maybeSingle(),
      supabase
        .from('sessions')
        .select('id, user_id, notes')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single() as unknown as Promise<{ data: SessionData | null; error: unknown }>,
    ])

    const profile = profileResult.data
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (profile.billing_tier === 'FREE') {
      return NextResponse.json(
        { error: 'Action plan generation requires Clarvo Pro.', upgradeRequired: true },
        { status: 402 }
      )
    }

    // Return cached action plan if it already exists
    if (existingResult.data) {
      return NextResponse.json({ success: true, actionPlan: existingResult.data.content })
    }

    const session = sessionResult.data
    if (!session || !session.notes) {
      return NextResponse.json({ error: 'Session not found or has no notes' }, { status: 404 })
    }

    const actionPlan = await generateActionPlan(session.notes)

    // Persist action plan (fire-and-forget — don't block the response)
    void supabase
      .from('action_plans')
      .insert({ session_id: sessionId, content: actionPlan })
      .then(({ error }) => {
        if (error) console.error('[/api/ai/action-plan] Failed to persist action plan:', error)
      })

    return NextResponse.json({ success: true, actionPlan })
  } catch (error) {
    console.error('[/api/ai/action-plan]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
