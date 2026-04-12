import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { createRazorpayClient } from '@/lib/razorpay'
import { RAZORPAY_PLAN_MAP } from '@clarvo/utils'

/**
 * POST /api/billing/subscribe
 *
 * Creates a Razorpay subscription for the authenticated user.
 * Body: { plan_id: string }
 *
 * Security:
 * - Validates plan_id against server-side allowlist (never trusts frontend)
 * - Validates student eligibility (.edu email domain)
 * - Returns subscription_id for checkout
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan_id } = body

    if (!plan_id || typeof plan_id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid plan_id' }, { status: 400 })
    }

    // Validate plan_id against our server-side allowlist — never trust frontend
    const planConfig = RAZORPAY_PLAN_MAP[plan_id]
    if (!planConfig) {
      return NextResponse.json({ error: 'Invalid plan_id' }, { status: 400 })
    }

    // Student plan eligibility check
    if (planConfig.tier === 'STUDENT') {
      const email = user.email || ''
      if (!email.endsWith('.edu') && !email.endsWith('.edu.in') && !email.endsWith('.ac.in') && !email.endsWith('.ac.uk')) {
        return NextResponse.json(
          { error: 'Student plan is only available for users with a valid educational email (.edu, .edu.in, .ac.in, .ac.uk)' },
          { status: 403 }
        )
      }
    }

    // Check if user already has an active subscription
    const adminSupabase = createSupabaseAdminClient()
    const { data: profile } = await adminSupabase
      .from('users')
      .select('razorpay_subscription_id, subscription_status, billing_tier')
      .eq('id', user.id)
      .single()

    if (
      profile?.subscription_status === 'active' &&
      profile?.billing_tier !== 'FREE'
    ) {
      return NextResponse.json(
        { error: 'You already have an active subscription. Cancel your current plan first before switching.' },
        { status: 409 }
      )
    }

    // Create Razorpay subscription
    const razorpay = createRazorpayClient()

    const subscriptionOptions: Record<string, unknown> = {
      plan_id,
      customer_notify: 1,
      total_count: planConfig.totalCount,
      notes: {
        user_id: user.id,
        user_email: user.email || '',
        tier: planConfig.tier,
        interval: planConfig.interval,
      },
    }

    const subscription = await (razorpay.subscriptions as any).create(subscriptionOptions)

    // Store the subscription reference in DB (status will be updated via webhook)
    await adminSupabase
      .from('users')
      .update({
        razorpay_subscription_id: subscription.id,
        subscription_plan_id: plan_id,
        subscription_interval: planConfig.interval,
        subscription_status: 'created',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    return NextResponse.json({
      subscription_id: subscription.id,
      razorpay_key: process.env.RAZORPAY_KEY_ID,
      plan_name: planConfig.tier,
    })
  } catch (error: any) {
    console.error('[POST /api/billing/subscribe]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
