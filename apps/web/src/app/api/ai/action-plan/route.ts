import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateActionPlan } from '@/lib/gemini'
import { z } from 'zod'

const Schema = z.object({
  sessionId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('billing_tier')
      .eq('id', user.id)
      .single()

    if (profile?.billing_tier === 'FREE') {
      return NextResponse.json(
        { error: 'Action plan generation requires Clarvo Pro.', upgradeRequired: true },
        { status: 402 }
      )
    }

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { sessionId } = parsed.data

    const { data: session } = await supabase
      .from('sessions')
      .select('id, user_id, notes')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session?.notes) {
      return NextResponse.json({ error: 'Session not found or has no notes' }, { status: 404 })
    }

    const actionPlan = await generateActionPlan(session.notes)

    return NextResponse.json({ success: true, actionPlan })
  } catch (error) {
    console.error('[/api/ai/action-plan]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
