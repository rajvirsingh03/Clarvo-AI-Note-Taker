import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/auth'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sessions/[id]
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { user, supabase } = await getAuthenticatedClient(_request)

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('sessions')
      .select(`*, flashcards(*), screenshots(*)`)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ session: data })
  } catch (error) {
    console.error('[GET /api/sessions/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const UpdateSessionSchema = z.object({
  title: z.string().max(200).optional(),
  notes: z.string().optional(),
  state: z.enum(['RECORDING', 'PAUSED', 'COMPLETED', 'POST_PROCESSING']).optional(),
  watch_time_seconds: z.number().int().min(0).optional(),
})

// PUT /api/sessions/[id]
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { user, supabase } = await getAuthenticatedClient(request)

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = UpdateSessionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    // Build update payload (exclude watch_time_seconds from generic update)
    const { watch_time_seconds, ...updateFields } = parsed.data
    const updatePayload: Record<string, unknown> = { ...updateFields, updated_at: new Date().toISOString() }

    // Include watch_time_seconds if provided
    if (watch_time_seconds !== undefined) {
      updatePayload.watch_time_seconds = watch_time_seconds
    }

    const { data, error } = await supabase
      .from('sessions')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // When session completes with watch time, update user's free minutes balance
    if (parsed.data.state === 'COMPLETED' && watch_time_seconds !== undefined && watch_time_seconds > 0) {
      const watchMinutes = watch_time_seconds / 60.0
      await supabase.rpc('increment_free_minutes', {
        p_user_id: user.id,
        p_minutes: watchMinutes,
      })
    }

    return NextResponse.json({ session: data })
  } catch (error) {
    console.error('[PUT /api/sessions/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/sessions/[id]
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { user, supabase } = await getAuthenticatedClient(_request)

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/sessions/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
