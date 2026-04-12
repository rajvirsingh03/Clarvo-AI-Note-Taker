import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifySubscriptionPayment } from '@/lib/razorpay'

/**
 * POST /api/billing/verify
 *
 * Verifies the Razorpay subscription payment signature after checkout.
 * This is a secondary verification — the webhook is the primary source of truth.
 *
 * Body: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
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
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = body

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify signature
    const isValid = verifySubscriptionPayment(
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET!
    )

    if (!isValid) {
      console.error('[POST /api/billing/verify] Invalid signature', {
        razorpay_payment_id,
        razorpay_subscription_id,
      })
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    // Update payment status as verified (webhook handles the actual tier upgrade)
    const adminSupabase = createSupabaseAdminClient()
    await adminSupabase
      .from('users')
      .update({
        razorpay_subscription_id: razorpay_subscription_id,
        subscription_status: 'authenticated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully. Your plan will be activated shortly.',
    })
  } catch (error: any) {
    console.error('[POST /api/billing/verify]', error)
    return NextResponse.json(
      { error: error?.message || 'Verification failed' },
      { status: 500 }
    )
  }
}
