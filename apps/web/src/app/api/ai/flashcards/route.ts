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

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { sessionId } = parsed.data

    // ── Fetch billing profile + session ownership in parallel ─────────────────
    // Previously these were two sequential DB calls; running them concurrently
    // halves the DB latency on the happy path.
    const [profileResult, sessionResult] = await Promise.all([
      supabase
        .from('users')
        .select('billing_tier')
        .eq('id', user.id)
        .single(),
      supabase
        .from('sessions')
        .select('id, user_id, notes, state')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single(),
    ])

    // Billing check
    if (profileResult.data?.billing_tier === 'FREE') {
      return NextResponse.json(
        { error: 'Flashcard generation requires Clarvo Pro.', upgradeRequired: true },
        { status: 402 }
      )
    }

    // Session check
    const session = sessionResult.data
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (!session.notes) {
      return NextResponse.json({ error: 'Session has no notes to generate flashcards from' }, { status: 422 })
    }

    const flashcards = await generateFlashcards(session.notes)

    // Persist flashcards (fire-and-forget)
    void supabase.from('flashcards').insert(
      flashcards.map((fc) => ({
        session_id: sessionId,
        front: fc.front,
        back: fc.back,
      }))
    ).then(({ error }) => {
      if (error) console.error('[/api/ai/flashcards] Failed to persist:', error)
    })

    return NextResponse.json({ success: true, flashcards })
  } catch (error) {
    console.error('[/api/ai/flashcards]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
