import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/auth'
import { generateFlashcards, generateActionPlan } from '@/lib/gemini'
import { z } from 'zod'
import type { Database } from '@/types/supabase'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'billing_tier'>

const Schema = z.object({
  sessionId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedClient(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('billing_tier')
      .eq('id', user.id)
      .single() as { data: UserProfile | null; error: unknown }

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (profile.billing_tier === 'FREE') {
      return NextResponse.json(
        { error: 'Flashcard & action plan generation requires Clarvo Pro.', upgradeRequired: true },
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

    if (!session || !session.notes) {
      return NextResponse.json({ error: 'Session not found or has no notes' }, { status: 404 })
    }

    // Generate both in parallel
    const [flashcards, actionPlan] = await Promise.all([
      generateFlashcards(session.notes),
      generateActionPlan(session.notes),
    ])

    // Persist both in parallel (delete existing flashcards/action plan first to avoid duplicates)
    await Promise.all([
      supabase.from('flashcards').delete().eq('session_id', sessionId),
      supabase.from('action_plans').delete().eq('session_id', sessionId),
    ])

    await Promise.all([
      supabase.from('flashcards').insert(
        flashcards.map((fc) => ({ session_id: sessionId, front: fc.front, back: fc.back }))
      ),
      supabase.from('action_plans').insert({ session_id: sessionId, content: actionPlan }),
    ])

    return NextResponse.json({ success: true, flashcards, actionPlan })
  } catch (error) {
    console.error('[/api/ai/generate-both]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
