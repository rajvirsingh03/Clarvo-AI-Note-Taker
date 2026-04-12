import type { Metadata } from 'next'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { PricingClient } from './PricingClient'

export const metadata: Metadata = {
  title: 'Pricing — Clarvo AI',
  description: 'Simple, honest pricing for Clarvo AI. Start free, upgrade when you need more power.',
}

export default async function PricingPage() {
  const supabase = createSupabaseAdminClient()

  const { data: plans } = await supabase
    .from('pricing_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return <PricingClient plans={plans || []} />
}
