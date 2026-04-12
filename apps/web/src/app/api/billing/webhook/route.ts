import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { RAZORPAY_PLAN_MAP } from '@clarvo/utils'

// Required for App Router: don't buffer/cache the raw POST body
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


/**
 * Razorpay webhook handler.
 *
 * Events handled:
 * - subscription.activated   → upgrade user to the plan tier
 * - subscription.charged     → renew period, confirm active status
 * - subscription.cancelled   → set cancel_at_period_end, keep access
 * - subscription.completed   → downgrade user to FREE
 * - subscription.expired     → downgrade user to FREE
 * - payment.failed           → mark status, notify user
 *
 * Security:
 * - Validates webhook signature using HMAC SHA-256
 * - Idempotency via subscription_events table (deduplicates by event_id)
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const headersList = await headers()
  const signature = headersList.get('x-razorpay-signature')

  if (!signature) {
    console.error('[Razorpay webhook] Missing x-razorpay-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Verify webhook signature
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!
  const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret)

  if (!isValid) {
    console.error('[Razorpay webhook] Signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = payload.event as string
  const eventId = payload.event_id || `${eventType}_${Date.now()}`

  const supabase = createSupabaseAdminClient()

  // Idempotency check — prevent duplicate processing
  const { data: existingEvent } = await supabase
    .from('subscription_events')
    .select('id')
    .eq('event_id', eventId)
    .single()

  if (existingEvent) {
    console.log(`[Razorpay webhook] Duplicate event ${eventId}, skipping`)
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (eventType) {
      case 'subscription.activated': {
        const subscription = payload.payload?.subscription?.entity
        if (!subscription) break

        const userId = subscription.notes?.user_id
        const planId = subscription.plan_id
        const planConfig = RAZORPAY_PLAN_MAP[planId]

        if (!userId || !planConfig) {
          console.error('[Razorpay webhook] subscription.activated — missing userId or planConfig', { userId, planId })
          break
        }

        await supabase
          .from('users')
          .update({
            billing_tier: planConfig.tier,
            razorpay_subscription_id: subscription.id,
            razorpay_customer_id: subscription.customer_id || null,
            subscription_status: 'active',
            subscription_plan_id: planId,
            subscription_interval: planConfig.interval,
            monthly_hours_limit: planConfig.hoursPerMonth,
            current_period_start: subscription.current_start
              ? new Date(subscription.current_start * 1000).toISOString()
              : null,
            current_period_end: subscription.current_end
              ? new Date(subscription.current_end * 1000).toISOString()
              : null,
            cancel_at_period_end: false,
            free_minutes_used: 0, // Reset usage on new subscription
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        console.log(`[Razorpay webhook] User ${userId} activated → ${planConfig.tier}`)
        break
      }

      case 'subscription.charged': {
        const subscription = payload.payload?.subscription?.entity
        if (!subscription) break

        const userId = subscription.notes?.user_id
        if (!userId) break

        const planConfig = RAZORPAY_PLAN_MAP[subscription.plan_id]

        await supabase
          .from('users')
          .update({
            subscription_status: 'active',
            current_period_start: subscription.current_start
              ? new Date(subscription.current_start * 1000).toISOString()
              : null,
            current_period_end: subscription.current_end
              ? new Date(subscription.current_end * 1000).toISOString()
              : null,
            free_minutes_used: 0, // Reset usage on renewal
            monthly_hours_limit: planConfig?.hoursPerMonth || 30,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        console.log(`[Razorpay webhook] User ${userId} charged — period renewed`)
        break
      }

      case 'subscription.cancelled': {
        const subscription = payload.payload?.subscription?.entity
        if (!subscription) break

        const userId = subscription.notes?.user_id
        if (!userId) break

        // DO NOT downgrade immediately — set cancel_at_period_end
        await supabase
          .from('users')
          .update({
            cancel_at_period_end: true,
            subscription_status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        console.log(`[Razorpay webhook] User ${userId} cancelled — access retained until period end`)
        break
      }

      case 'subscription.completed':
      case 'subscription.expired': {
        const subscription = payload.payload?.subscription?.entity
        if (!subscription) break

        const userId = subscription.notes?.user_id
        if (!userId) break

        // NOW downgrade to FREE
        await supabase
          .from('users')
          .update({
            billing_tier: 'FREE',
            subscription_status: eventType === 'subscription.completed' ? 'completed' : 'expired',
            cancel_at_period_end: false,
            razorpay_subscription_id: null,
            subscription_plan_id: null,
            subscription_interval: null,
            monthly_hours_limit: 1,
            current_period_start: null,
            current_period_end: null,
            free_minutes_used: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        console.log(`[Razorpay webhook] User ${userId} ${eventType} — downgraded to FREE`)
        break
      }

      case 'payment.failed': {
        const payment = payload.payload?.payment?.entity
        if (!payment) break

        // Try to find user by subscription notes or by subscription_id
        let userId: string | null = payment.notes?.user_id || null

        if (!userId && payment.subscription_id) {
          const { data: userBySubscription } = await supabase
            .from('users')
            .select('id')
            .eq('razorpay_subscription_id', payment.subscription_id)
            .single()
          userId = userBySubscription?.id || null
        }

        if (userId) {
          await supabase
            .from('users')
            .update({
              subscription_status: 'payment_failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          console.log(`[Razorpay webhook] Payment failed for user ${userId}`)
        }
        break
      }

      default:
        console.log(`[Razorpay webhook] Unhandled event type: ${eventType}`)
        break
    }

    // Log event for idempotency & audit
    const subscriptionEntity = payload.payload?.subscription?.entity
    const paymentEntity = payload.payload?.payment?.entity
    await supabase.from('subscription_events').insert({
      event_id: eventId,
      event_type: eventType,
      subscription_id: subscriptionEntity?.id || paymentEntity?.subscription_id || null,
      payment_id: paymentEntity?.id || null,
      user_id: subscriptionEntity?.notes?.user_id || paymentEntity?.notes?.user_id || null,
      payload: payload,
    })

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[Razorpay webhook] Handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
