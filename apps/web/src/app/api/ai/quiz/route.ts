import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/auth'
import { generateQuiz } from '@/lib/gemini'
import { z } from 'zod'

const GenerateSchema = z.object({
  sessionId: z.string().uuid(),
})

const SaveAnswersSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z.record(z.string().uuid(), z.number().int().min(0).max(3)),
})

const ResetSchema = z.object({
  sessionId: z.string().uuid(),
})

// GET /api/ai/quiz?sessionId=<uuid>
// Returns existing quiz questions for a session (with user answers)
export async function GET(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedClient(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    if (!sessionId || !/^[0-9a-f-]{36}$/.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }

    // Verify session ownership
    const { data: session } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const { data: questions, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('question_number', { ascending: true })

    if (error) throw error

    return NextResponse.json(questions ?? [])
  } catch (error) {
    console.error('[GET /api/ai/quiz]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/ai/quiz — generate new quiz questions for a session
// Deletes any existing questions for the session before inserting new ones
export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedClient(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Billing check — quiz generation is a Pro feature
    const { data: profile } = await supabase
      .from('users')
      .select('billing_tier')
      .eq('id', user.id)
      .single()

    if (profile?.billing_tier === 'FREE') {
      return NextResponse.json(
        { error: 'Quiz generation requires Clarvo Pro.', upgradeRequired: true },
        { status: 402 }
      )
    }

    const body = await request.json()
    const parsed = GenerateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { sessionId } = parsed.data

    const { data: session } = await supabase
      .from('sessions')
      .select('id, user_id, notes')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (!session.notes) {
      return NextResponse.json({ error: 'Session has no notes to generate a quiz from' }, { status: 422 })
    }

    // Strip HTML tags to get plain text for word-count estimation, keep HTML for image extraction
    const plainText = session.notes.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const questions = await generateQuiz(plainText, session.notes)

    // Delete existing quiz questions before inserting newly generated ones
    await supabase.from('quiz_questions').delete().eq('session_id', sessionId)

    const { data: inserted, error: insertError } = await supabase
      .from('quiz_questions')
      .insert(
        questions.map((q) => ({
          session_id: sessionId,
          question_number: q.id,
          difficulty: q.difficulty,
          question: q.question,
          options: q.options,
          correct_answer_index: q.correct_answer_index,
          explanation: q.explanation,
        }))
      )
      .select()

    if (insertError) throw insertError

    return NextResponse.json(inserted ?? [])
  } catch (error) {
    console.error('[POST /api/ai/quiz]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/ai/quiz — save user answers
// Body: { sessionId, answers: { [questionId]: answerIndex } }
export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedClient(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = SaveAnswersSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { sessionId, answers } = parsed.data

    // Verify session ownership
    const { data: session } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // Update each answer individually
    await Promise.all(
      Object.entries(answers).map(([questionId, answerIndex]) =>
        supabase
          .from('quiz_questions')
          .update({ user_answer_index: answerIndex })
          .eq('id', questionId)
          .eq('session_id', sessionId)
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/ai/quiz]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/ai/quiz?sessionId=<uuid> — reset user answers (keep questions)
export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedClient(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const parsed = ResetSchema.safeParse({ sessionId })
    if (!parsed.success) return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })

    // Verify session ownership
    const { data: session } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', parsed.data.sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    await supabase
      .from('quiz_questions')
      .update({ user_answer_index: null })
      .eq('session_id', parsed.data.sessionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/ai/quiz]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
