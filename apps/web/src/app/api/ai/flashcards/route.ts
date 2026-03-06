import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/auth'
import { generateFlashcards } from '@/lib/gemini'
import { z } from 'zod'

const Schema = z.object({
  sessionId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedClient(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check billing tier
    const { data: profile } = await supabase
      .from('users')
      .select('billing_tier')
      .eq('id', user.id)
      .single()

    if (profile?.billing_tier === 'FREE') {
      return NextResponse.json(
        { error: 'Flashcard generation requires Clarvo Pro.', upgradeRequired: true },
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
      .select('id, user_id, notes, state')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (!session.notes) {
      return NextResponse.json({ error: 'Session has no notes to generate flashcards from' }, { status: 422 })
    }

    const flashcards = await generateFlashcards(session.notes)

    // Persist flashcards
    await supabase.from('flashcards').insert(
      flashcards.map((fc) => ({
        session_id: sessionId,
        front: fc.front,
        back: fc.back,
      }))
    )

    return NextResponse.json({ success: true, flashcards })
  } catch (error) {
    console.error('[/api/ai/flashcards]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
