import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

// GET /api/sessions — list sessions for authenticated user
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, count, error } = await supabase
      .from('sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    return NextResponse.json({
      sessions: data,
      pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
    })
  } catch (error) {
    console.error('[GET /api/sessions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const CreateSessionSchema = z.object({
  title: z.string().max(200).optional(),
  videoUrl: z.string().url().optional(),
  videoTitle: z.string().max(200).optional(),
})

// POST /api/sessions — create a new session
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Free tier: max 3 sessions per month
    const { data: profile } = await supabase
      .from('users')
      .select('billing_tier')
      .eq('id', user.id)
      .single()

    if (profile?.billing_tier === 'FREE') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())

      if ((count ?? 0) >= 3) {
        return NextResponse.json(
          { error: 'Free tier allows 3 sessions per month. Upgrade to Pro for unlimited sessions.', upgradeRequired: true },
          { status: 402 }
        )
      }
    }

    const body = await request.json()
    const parsed = CreateSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        title: parsed.data.title ?? 'Untitled Session',
        video_url: parsed.data.videoUrl,
        video_title: parsed.data.videoTitle,
        state: 'RECORDING',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ session: data }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/sessions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
