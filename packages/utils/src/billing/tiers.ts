import type { BillingTier, TierLimits, BillingPlan } from '@clarvo/types'

export const FREE_TIER_LIMITS: TierLimits = {
  TOTAL_WATCH_MINUTES: 60, // 1 hour
  SCREENSHOTS_PER_SESSION: 3,
  FLASHCARDS_ENABLED: true,
  ACTION_PLAN_ENABLED: true,
  NOTION_EXPORT_ENABLED: true,
  QUIZ_ENABLED: true,
}

export const PRO_TIER_LIMITS: TierLimits = {
  TOTAL_WATCH_MINUTES: 1800, // 30 hours
  SCREENSHOTS_PER_SESSION: Infinity,
  FLASHCARDS_ENABLED: true,
  ACTION_PLAN_ENABLED: true,
  NOTION_EXPORT_ENABLED: true,
  QUIZ_ENABLED: true,
}

export const POWER_TIER_LIMITS: TierLimits = {
  TOTAL_WATCH_MINUTES: 4800, // 80 hours
  SCREENSHOTS_PER_SESSION: Infinity,
  FLASHCARDS_ENABLED: true,
  ACTION_PLAN_ENABLED: true,
  NOTION_EXPORT_ENABLED: true,
  QUIZ_ENABLED: true,
}

export const STUDENT_TIER_LIMITS: TierLimits = {
  TOTAL_WATCH_MINUTES: 1800, // 30 hours
  SCREENSHOTS_PER_SESSION: Infinity,
  FLASHCARDS_ENABLED: true,
  ACTION_PLAN_ENABLED: true,
  NOTION_EXPORT_ENABLED: true,
  QUIZ_ENABLED: true,
}

/** Server-side plan mapping — plan_id → plan config */
export const RAZORPAY_PLAN_MAP: Record<string, { tier: BillingTier; interval: 'monthly' | 'yearly'; totalCount: number; hoursPerMonth: number }> = {
  plan_SUDbqDKmbQabR4: { tier: 'PRO', interval: 'monthly', totalCount: 12, hoursPerMonth: 30 },
  plan_SUDfczhcj7jNzI: { tier: 'PRO', interval: 'yearly', totalCount: 5, hoursPerMonth: 30 },
  plan_SUDi2ubnAAfCal: { tier: 'POWER', interval: 'monthly', totalCount: 12, hoursPerMonth: 80 },
  plan_SUDlA1PqL41cN5: { tier: 'POWER', interval: 'yearly', totalCount: 5, hoursPerMonth: 80 },
  plan_SUDnhoBKrrPCfs: { tier: 'STUDENT', interval: 'monthly', totalCount: 12, hoursPerMonth: 30 },
}

export const BILLING_PLANS: Record<BillingTier, BillingPlan> = {
  FREE: {
    tier: 'FREE',
    name: 'Clarvo Free',
    priceInr: 0,
    razorpayPlanId: '',
    interval: 'monthly',
    hoursPerMonth: 1,
    limits: FREE_TIER_LIMITS,
  },
  PRO: {
    tier: 'PRO',
    name: 'Clarvo Pro',
    priceInr: 1899,
    razorpayPlanId: 'plan_SUDbqDKmbQabR4',
    interval: 'monthly',
    hoursPerMonth: 30,
    limits: PRO_TIER_LIMITS,
  },
  POWER: {
    tier: 'POWER',
    name: 'Clarvo Power',
    priceInr: 3499,
    razorpayPlanId: 'plan_SUDi2ubnAAfCal',
    interval: 'monthly',
    hoursPerMonth: 80,
    limits: POWER_TIER_LIMITS,
  },
  STUDENT: {
    tier: 'STUDENT',
    name: 'Clarvo Student',
    priceInr: 999,
    razorpayPlanId: 'plan_SUDnhoBKrrPCfs',
    interval: 'monthly',
    hoursPerMonth: 30,
    limits: STUDENT_TIER_LIMITS,
    isStudentOnly: true,
  },
}

export function getTierLimits(tier: BillingTier): TierLimits {
  switch (tier) {
    case 'POWER': return POWER_TIER_LIMITS
    case 'STUDENT': return STUDENT_TIER_LIMITS
    case 'PRO': return PRO_TIER_LIMITS
    default: return FREE_TIER_LIMITS
  }
}

export function isFeatureAllowed(tier: BillingTier, feature: keyof TierLimits): boolean {
  const limits = getTierLimits(tier)
  const value = limits[feature]
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  return false
}

export function getHoursForTier(tier: BillingTier): number {
  switch (tier) {
    case 'POWER': return 80
    case 'PRO':
    case 'STUDENT': return 30
    default: return 1
  }
}
