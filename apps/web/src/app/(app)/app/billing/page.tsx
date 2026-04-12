import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BillingClient } from './BillingClient'

export const metadata: Metadata = { title: 'Billing — Clarvo AI' }

export default async function BillingPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <BillingClient
      userId={user.id}
      userName={user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? ''}
      userEmail={user.email ?? ''}
    />
  )
}
