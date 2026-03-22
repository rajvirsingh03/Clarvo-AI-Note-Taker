import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/auth'
import { extractConcepts } from '@/lib/gemini'
import { z } from 'zod'

const ExtractSchema = z.object({
  sessionId: z.string().uuid(),
  chunk: z.string().min(1).max(10000),
  existingNotesTail: z.string().max(3000).optional().default(''),
})

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedClient(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = ExtractSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const { sessionId, chunk, existingNotesTail } = parsed.data

    // ── Step 1: Verify the session belongs to the user ────────────────────────
    // Select `notes` and `state` together — a single DB round-trip that covers
    // both the ownership/state check and the current notes value needed later.
    const { data: session } = await supabase
      .from('sessions')
      .select('id, user_id, state, notes')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.state !== 'RECORDING') {
      return NextResponse.json({ error: 'Session is not in RECORDING state' }, { status: 409 })
    }

    // ── Step 2: Kick off Gemini extraction + DB writes in parallel ────────────
    // extractConcepts is the dominant latency; we fire DB inserts concurrently
    // rather than waiting for extraction first then doing DB work serially.

    // Get the chunk count (needed for chunk_index) in parallel with Gemini.
    const [extractionResult, chunkCountResult] = await Promise.allSettled([
      extractConcepts(chunk, existingNotesTail),
      supabase
        .from('session_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId),
    ])

    // Handle Gemini failure
    if (extractionResult.status === 'rejected') {
      console.error('[/api/ai/extract] Gemini extraction failed:', extractionResult.reason)
      return NextResponse.json(
        { error: 'AI extraction failed. Please retry in a moment.' },
        { status: 502 }
      )
    }

    const extractedNotes = extractionResult.value

    // Handle chunk count failure
    if (chunkCountResult.status === 'rejected') {
      console.error('[/api/ai/extract] Failed to count session chunks:', chunkCountResult.reason)
      return NextResponse.json({ error: 'Failed to persist transcript chunk' }, { status: 500 })
    }

    const { count: chunkCount, error: chunkCountError } = chunkCountResult.value
    if (chunkCountError) {
      console.error('[/api/ai/extract] Failed to count session chunks:', chunkCountError)
      return NextResponse.json({ error: 'Failed to persist transcript chunk' }, { status: 500 })
    }

    // ── Step 3: Build updated notes string using the session data already fetched
    // (avoids a separate SELECT for notes — we already have it from Step 1)
    const updatedNotes = session.notes
      ? `${session.notes}\n\n${extractedNotes}`
      : extractedNotes

    // ── Step 4: Persist chunk + update session notes in parallel ──────────────
    // These two writes are independent — huge latency win vs. serial execution.
    const [chunkInsertResult, updateResult] = await Promise.allSettled([
      supabase.from('session_chunks').insert({
        session_id: sessionId,
        transcript: chunk,
        chunk_index: chunkCount ?? 0,
      }),
      supabase
        .from('sessions')
        .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
        .eq('id', sessionId),
    ])

    if (chunkInsertResult.status === 'rejected' || chunkInsertResult.value.error) {
      const err = chunkInsertResult.status === 'rejected'
        ? chunkInsertResult.reason
        : chunkInsertResult.value.error
      console.error('[/api/ai/extract] Failed to insert transcript chunk:', err)
      return NextResponse.json({ error: 'Failed to persist transcript chunk' }, { status: 500 })
    }

    if (updateResult.status === 'rejected' || updateResult.value.error) {
      const err = updateResult.status === 'rejected'
        ? updateResult.reason
        : updateResult.value.error
      console.error('[/api/ai/extract] Failed to update session notes:', err)
      return NextResponse.json({ error: 'Failed to save extracted notes' }, { status: 500 })
    }

    return NextResponse.json({ success: true, extractedNotes })
  } catch (error) {
    console.error('[/api/ai/extract]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
