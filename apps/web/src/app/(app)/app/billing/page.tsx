import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Billing' }

// TODO: Current plan badge, upgrade CTA, Stripe portal link
export default function BillingPage() {
  return (
    <div>
      <h1>Billing</h1>
    </div>
  )
}
