import Razorpay from 'razorpay'

/**
 * Razorpay server-side client instance.
 * Uses environment variables for credentials — NEVER expose these to the client.
 */
export function createRazorpayClient() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

/**
 * Verify Razorpay webhook signature.
 * Uses HMAC SHA-256 to validate the payload integrity.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return expectedSignature === signature
}

/**
 * Verify Razorpay payment (subscription authentication).
 * Used after checkout to verify that payment_id + subscription_id is authentic.
 */
export function verifySubscriptionPayment(
  paymentId: string,
  subscriptionId: string,
  razorpaySignature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest('hex')
  return expectedSignature === razorpaySignature
}
