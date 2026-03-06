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

    // Verify the session belongs to the user
    const { data: session } = await supabase
      .from('sessions')
      .select('id, user_id, state')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.state !== 'RECORDING') {
      return NextResponse.json({ error: 'Session is not in RECORDING state' }, { status: 409 })
    }

    // Extract concepts via Gemini; return a retriable upstream error if the model fails.
    let extractedNotes = ''
    try {
      extractedNotes = await extractConcepts(chunk, existingNotesTail)
    } catch (error) {
      console.error('[/api/ai/extract] Gemini extraction failed:', error)
      return NextResponse.json(
        { error: 'AI extraction failed. Please retry in a moment.' },
        { status: 502 }
      )
    }

    const { count: chunkCount, error: chunkCountError } = await supabase
      .from('session_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    if (chunkCountError) {
      console.error('[/api/ai/extract] Failed to count session chunks:', chunkCountError)
      return NextResponse.json({ error: 'Failed to persist transcript chunk' }, { status: 500 })
    }

    // Store the chunk
    const { error: chunkInsertError } = await supabase.from('session_chunks').insert({
      session_id: sessionId,
      transcript: chunk,
      chunk_index: chunkCount ?? 0,
    })

    if (chunkInsertError) {
      console.error('[/api/ai/extract] Failed to insert transcript chunk:', chunkInsertError)
      return NextResponse.json({ error: 'Failed to persist transcript chunk' }, { status: 500 })
    }

    // Append extracted notes to the session (append-only — never overwrite user edits)
    const { data: currentSession, error: currentSessionError } = await supabase
      .from('sessions')
      .select('notes')
      .eq('id', sessionId)
      .single()

    if (currentSessionError) {
      console.error('[/api/ai/extract] Failed to fetch current session notes:', currentSessionError)
      return NextResponse.json({ error: 'Failed to load session notes' }, { status: 500 })
    }

    const updatedNotes = currentSession?.notes
      ? `${currentSession.notes}\n\n${extractedNotes}`
      : extractedNotes

    const { error: updateError } = await supabase
      .from('sessions')
      .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[/api/ai/extract] Failed to update session notes:', updateError)
      return NextResponse.json({ error: 'Failed to save extracted notes' }, { status: 500 })
    }

    return NextResponse.json({ success: true, extractedNotes })
  } catch (error) {
    console.error('[/api/ai/extract]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
