import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { createRazorpayClient } from '@/lib/razorpay'
import { RAZORPAY_PLAN_MAP } from '@clarvo/utils'

/**
 * GET /api/billing/status
 *
 * Returns the current user's billing status by fetching from Razorpay.
 * Used on the dashboard billing page to show real-time subscription info.
 */
export async function GET() {
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
      .select(
        'billing_tier, razorpay_subscription_id, subscription_status, subscription_plan_id, subscription_interval, current_period_start, current_period_end, cancel_at_period_end, monthly_hours_limit, free_minutes_used'
      )
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Default response for FREE tier or no subscription
    const result: Record<string, unknown> = {
      billing_tier: profile.billing_tier,
      subscription_status: profile.subscription_status || 'none',
      cancel_at_period_end: profile.cancel_at_period_end,
      monthly_hours_limit: profile.monthly_hours_limit,
      free_minutes_used: Number(profile.free_minutes_used ?? 0),
      current_period_start: profile.current_period_start,
      current_period_end: profile.current_period_end,
      subscription_interval: profile.subscription_interval,
      plan: null,
    }

    // Fetch real-time data from Razorpay if user has subscription
    if (profile.razorpay_subscription_id && profile.subscription_status !== 'none') {
      try {
        const razorpay = createRazorpayClient()
        const subscription = await (razorpay.subscriptions as any).fetch(
          profile.razorpay_subscription_id
        )

        const planConfig = RAZORPAY_PLAN_MAP[subscription.plan_id]

        result.subscription_status = subscription.status
        result.current_period_start = subscription.current_start
          ? new Date(subscription.current_start * 1000).toISOString()
          : null
        result.current_period_end = subscription.current_end
          ? new Date(subscription.current_end * 1000).toISOString()
          : null
        result.plan = {
          plan_id: subscription.plan_id,
          tier: planConfig?.tier || profile.billing_tier,
          interval: planConfig?.interval || profile.subscription_interval,
          hours_per_month: planConfig?.hoursPerMonth || profile.monthly_hours_limit,
          paid_count: subscription.paid_count,
          remaining_count: subscription.remaining_count,
          total_count: subscription.total_count,
          charge_at: subscription.charge_at
            ? new Date(subscription.charge_at * 1000).toISOString()
            : null,
          ended_at: subscription.ended_at
            ? new Date(subscription.ended_at * 1000).toISOString()
            : null,
        }
      } catch (rzpError: any) {
        console.error('[GET /api/billing/status] Razorpay fetch error:', rzpError?.message)
        // Fall back to DB data — don't fail the request
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[GET /api/billing/status]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch billing status' },
      { status: 500 }
    )
  }
}
