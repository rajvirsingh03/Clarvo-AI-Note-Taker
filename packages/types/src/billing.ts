export type BillingTier = 'FREE' | 'PRO' | 'POWER' | 'STUDENT'

export interface TierLimits {
  TOTAL_WATCH_MINUTES: number
  SCREENSHOTS_PER_SESSION: number
  FLASHCARDS_ENABLED: boolean
  ACTION_PLAN_ENABLED: boolean
  NOTION_EXPORT_ENABLED: boolean
  QUIZ_ENABLED: boolean
}

export interface BillingPlan {
  tier: BillingTier
  name: string
  priceInr: number
  razorpayPlanId: string
  interval: 'monthly' | 'yearly'
  hoursPerMonth: number
  limits: TierLimits
  isStudentOnly?: boolean
}

export interface RazorpaySubscription {
  id: string
  entity: string
  plan_id: string
  customer_id: string | null
  status: string
  current_start: number | null
  current_end: number | null
  ended_at: number | null
  quantity: number
  notes: Record<string, string>
  charge_at: number
  start_at: number
  end_at: number | null
  auth_attempts: number
  total_count: number
  paid_count: number
  customer_notify: boolean
  created_at: number
  short_url: string
  has_scheduled_changes: boolean
  remaining_count: number
}
