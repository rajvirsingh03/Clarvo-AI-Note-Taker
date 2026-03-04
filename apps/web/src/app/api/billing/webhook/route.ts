import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

/**
 * Stripe webhook handler.
 * Listens for subscription events and updates billing_tier in Supabase.
 *
 * Events handled:
 * - customer.subscription.created   → set PRO
 * - customer.subscription.updated   → sync status
 * - customer.subscription.deleted   → revert to FREE
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[Stripe webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const isActive = subscription.status === 'active' || subscription.status === 'trialing'

        // Look up user by Stripe customer ID (stored in user metadata or separate table)
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id' as any, customerId)
          .single()

        if (user) {
          await supabase
            .from('users')
            .update({ billing_tier: isActive ? 'PRO' : 'FREE', updated_at: new Date().toISOString() })
            .eq('id', user.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id' as any, customerId)
          .single()

        if (user) {
          await supabase
            .from('users')
            .update({ billing_tier: 'FREE', updated_at: new Date().toISOString() })
            .eq('id', user.id)
        }
        break
      }

      default:
        // Unhandled event type — log but return 200 to prevent Stripe retries
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[Stripe webhook] Handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
