import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { extractConcepts } from '@/lib/gemini'
import { z } from 'zod'

const ExtractSchema = z.object({
  sessionId: z.string().uuid(),
  chunk: z.string().min(1).max(10000),
  existingNotesTail: z.string().max(3000).optional().default(''),
})

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

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

    // Extract concepts via Gemini 1.5 Pro
    const extractedNotes = await extractConcepts(chunk, existingNotesTail)

    // Store the chunk
    await supabase.from('session_chunks').insert({
      session_id: sessionId,
      transcript: chunk,
      chunk_index: 0, // TODO: derive from existing chunk count
    })

    // Append extracted notes to the session (append-only — never overwrite user edits)
    const { data: currentSession } = await supabase
      .from('sessions')
      .select('notes')
      .eq('id', sessionId)
      .single()

    const updatedNotes = currentSession?.notes
      ? `${currentSession.notes}\n\n${extractedNotes}`
      : extractedNotes

    await supabase
      .from('sessions')
      .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    return NextResponse.json({ success: true, extractedNotes })
  } catch (error) {
    console.error('[/api/ai/extract]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
