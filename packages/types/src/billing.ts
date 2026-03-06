export type BillingTier = 'FREE' | 'PRO'

export interface TierLimits {
  TOTAL_WATCH_MINUTES: number
  SCREENSHOTS_PER_SESSION: number
  FLASHCARDS_ENABLED: boolean
  ACTION_PLAN_ENABLED: boolean
  NOTION_EXPORT_ENABLED: boolean
}

export interface BillingPlan {
  tier: BillingTier
  name: string
  price: number        // USD/month
  stripePriceId: string
  limits: TierLimits
}
