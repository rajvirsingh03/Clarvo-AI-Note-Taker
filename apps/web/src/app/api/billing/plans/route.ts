import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/billing/plans
 *
 * Returns all active pricing plans from the database.
 * Used on the /pricing page — prices come from DB, not Razorpay API calls.
 */
export async function GET() {
  try {
    const supabase = createSupabaseAdminClient()

    const { data: plans, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[GET /api/billing/plans]', error)
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
    }

    return NextResponse.json({ plans }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    })
  } catch (error: any) {
    console.error('[GET /api/billing/plans]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}
