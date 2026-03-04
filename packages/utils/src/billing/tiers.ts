import type { BillingTier, TierLimits, BillingPlan } from '@clarvo/types'

export const FREE_TIER_LIMITS: TierLimits = {
  SESSIONS_PER_MONTH: 3,
  AUDIO_MINUTES_PER_SESSION: 30,
  SCREENSHOTS_PER_SESSION: 3,
  FLASHCARDS_ENABLED: false,
  ACTION_PLAN_ENABLED: false,
  NOTION_EXPORT_ENABLED: false,
}

export const PRO_TIER_LIMITS: TierLimits = {
  SESSIONS_PER_MONTH: Infinity,
  AUDIO_MINUTES_PER_SESSION: Infinity,
  SCREENSHOTS_PER_SESSION: Infinity,
  FLASHCARDS_ENABLED: true,
  ACTION_PLAN_ENABLED: true,
  NOTION_EXPORT_ENABLED: true,
}

export const BILLING_PLANS: Record<BillingTier, BillingPlan> = {
  FREE: {
    tier: 'FREE',
    name: 'Clarvo Free',
    price: 0,
    stripePriceId: '',
    limits: FREE_TIER_LIMITS,
  },
  PRO: {
    tier: 'PRO',
    name: 'Clarvo Pro',
    price: 12,  // $12/month
    stripePriceId: process.env['NEXT_PUBLIC_STRIPE_PRO_PRICE_ID'] ?? 'price_placeholder',
    limits: PRO_TIER_LIMITS,
  },
}

export function getTierLimits(tier: BillingTier): TierLimits {
  return tier === 'PRO' ? PRO_TIER_LIMITS : FREE_TIER_LIMITS
}

export function isFeatureAllowed(tier: BillingTier, feature: keyof TierLimits): boolean {
  const limits = getTierLimits(tier)
  const value = limits[feature]
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  return false
}
