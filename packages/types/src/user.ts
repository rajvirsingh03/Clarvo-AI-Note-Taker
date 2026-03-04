import type { BillingTier } from './billing'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  billing_tier: BillingTier
  notion_access_token: string | null
  notion_workspace_id: string | null
  stripe_customer_id?: string | null
  created_at: string
  updated_at: string
}
