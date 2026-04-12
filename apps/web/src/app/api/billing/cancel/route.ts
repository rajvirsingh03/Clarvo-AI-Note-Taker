import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { createRazorpayClient } from '@/lib/razorpay'

/**
 * POST /api/billing/cancel
 *
 * Cancels the user's current Razorpay subscription.
 * The user keeps access until the end of the current billing period.
 * Actual downgrade happens via webhook when subscription.completed fires.
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createSupabaseAdminClient()
    const { data: profile } = await adminSupabase
      .from('users')
      .select('razorpay_subscription_id, subscription_status, billing_tier')
      .eq('id', user.id)
      .single()

    if (!profile?.razorpay_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    if (profile.billing_tier === 'FREE') {
      return NextResponse.json({ error: 'You are already on the Free plan' }, { status: 400 })
    }

    const razorpay = createRazorpayClient()

    // Cancel at end of current billing period (not immediately)
    await (razorpay.subscriptions as any).cancel(profile.razorpay_subscription_id, false)

    // Mark cancel_at_period_end — user keeps access till period ends
    await adminSupabase
      .from('users')
      .update({
        cancel_at_period_end: true,
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      message: 'Your subscription has been cancelled. You\'ll retain access until the current period ends.',
    })
  } catch (error: any) {
    console.error('[POST /api/billing/cancel]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
