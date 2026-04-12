'use client'

import { useState, useEffect, useCallback } from 'react'
import { RazorpayCheckout, CancelSubscription } from '@/components/billing/RazorpayCheckout'
import { ArrowRight, Warning, Clock } from '@/components/phosphor-icons'

interface BillingStatus {
  billing_tier: string
  subscription_status: string
  cancel_at_period_end: boolean
  monthly_hours_limit: number
  free_minutes_used: number
  current_period_start: string | null
  current_period_end: string | null
  subscription_interval: string | null
  plan: {
    plan_id: string
    tier: string
    interval: string
    hours_per_month: number
    paid_count: number
    remaining_count: number
    total_count: number
    charge_at: string | null
    ended_at: string | null
  } | null
}

interface PricingPlan {
  id: string
  tier: string
  name: string
  razorpay_plan_id: string
  price_inr: number
  interval: string
  hours_per_month: number
  features: string[]
  is_student_only: boolean
}

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Clarvo Free',
  PRO: 'Clarvo Pro',
  POWER: 'Clarvo Power',
  STUDENT: 'Clarvo Student',
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'var(--color-text-secondary)',
  PRO: 'var(--color-accent)',
  POWER: '#f59e0b',
  STUDENT: '#06b6d4',
}

export function BillingClient({
  userId: _userId,
  userName,
  userEmail,
}: {
  userId: string
  userName: string
  userEmail: string
}) {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly')

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch {
      console.error('Failed to fetch billing status')
    }
  }, [])

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/plans')
      if (res.ok) {
        const data = await res.json()
        setPlans(data.plans || [])
      }
    } catch {
      console.error('Failed to fetch plans')
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchStatus(), fetchPlans()]).finally(() => setLoading(false))
  }, [fetchStatus, fetchPlans])

  const handleSuccess = () => {
    setSuccessMsg('🎉 Payment successful! Your plan will be activated in a few moments.')
    setError(null)
    // Refresh status after a short delay to allow webhook processing
    setTimeout(() => {
      fetchStatus()
    }, 3000)
  }

  const handleError = (err: string) => {
    setError(err)
    setSuccessMsg(null)
  }

  const handleCancelSuccess = () => {
    setSuccessMsg('Your subscription has been cancelled. You\'ll retain access until the current period ends.')
    setError(null)
    fetchStatus()
  }

  if (loading) {
    return (
      <div>
        <div className="page-header" style={{ marginBottom: 'var(--space-8)' }}>
          <h1 className="page-title">Billing</h1>
          <p className="page-subtitle">Manage your plan and review usage.</p>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Loading billing info...</span>
        </div>
      </div>
    )
  }

  const tier = status?.billing_tier || 'FREE'
  const isFree = tier === 'FREE'
  const isActive = status?.subscription_status === 'active' || status?.subscription_status === 'authenticated'
  const isCancelled = status?.cancel_at_period_end
  const isPaymentFailed = status?.subscription_status === 'payment_failed'
  const hoursLimit = status?.monthly_hours_limit || 1
  const minutesUsed = Number(status?.free_minutes_used || 0)
  const minutesLimit = hoursLimit * 60
  const usagePct = Math.min(100, Math.round((minutesUsed / minutesLimit) * 100))
  const planColor = PLAN_COLORS[tier] || 'var(--color-accent)'

  // Filter available upgrade plans
  const isStudentEligible = userEmail.endsWith('.edu') || userEmail.endsWith('.edu.in') || userEmail.endsWith('.ac.in') || userEmail.endsWith('.ac.uk')
  const upgradePlans = plans.filter(p => {
    if (p.tier === 'FREE') return false
    if (p.tier === tier && p.interval === status?.subscription_interval) return false
    if (p.tier === 'STUDENT' && selectedInterval === 'yearly') return false
    if (p.interval !== selectedInterval && p.tier !== 'STUDENT') return false
    return true
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatPrice = (price: number) => new Intl.NumberFormat('en-IN').format(price)

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="page-title">Billing</h1>
        <p className="page-subtitle">Manage your plan and review usage.</p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{
          background: '#10b98118', border: '1px solid #10b98140',
          borderRadius: '12px', padding: 'var(--space-4)',
          marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        }}>
          <span style={{ color: '#10b981', fontSize: '1.25rem' }}>✓</span>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#10b981' }}>{successMsg}</p>
        </div>
      )}
      {error && (
        <div style={{
          background: '#ef444418', border: '1px solid #ef444440',
          borderRadius: '12px', padding: 'var(--space-4)',
          marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        }}>
          <Warning size={20} weight="fill" style={{ color: '#ef4444', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#ef4444' }}>{error}</p>
        </div>
      )}
      {isPaymentFailed && (
        <div style={{
          background: '#f59e0b18', border: '1px solid #f59e0b40',
          borderRadius: '12px', padding: 'var(--space-4)',
          marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        }}>
          <Warning size={20} weight="fill" style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#f59e0b' }}>Payment failed</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Your last payment didn&apos;t go through. Please update your payment method or try again.
            </p>
          </div>
        </div>
      )}

      {/* Current plan badge */}
      <div className="card" style={{
        marginBottom: 'var(--space-6)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current plan
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              {PLAN_LABELS[tier] || 'Clarvo Free'}
            </span>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
              background: isFree ? 'var(--color-surface-raised)' : planColor,
              color: isFree ? 'var(--color-text-secondary)' : '#fff',
              border: `1px solid ${isFree ? 'var(--color-border)' : planColor}`,
            }}>
              {tier}
            </span>
            {isCancelled && (
              <span style={{
                fontSize: '0.6875rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b40',
              }}>
                CANCELLING
              </span>
            )}
          </div>
        </div>
        {!isFree && status?.plan && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-1)' }}>
              {status.plan.interval === 'yearly' ? 'Annual' : 'Monthly'} billing
            </p>
            {status.plan.charge_at && !isCancelled && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Next charge: {formatDate(status.plan.charge_at)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Subscription details (paid plans) */}
      {!isFree && status?.plan && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Clock size={16} weight="bold" /> Subscription details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <DetailItem label="Status" value={isCancelled ? 'Cancelling at period end' : (status.subscription_status || '—')} valueColor={isCancelled ? '#f59e0b' : '#10b981'} />
            <DetailItem label="Current period" value={`${formatDate(status.current_period_start)} — ${formatDate(status.current_period_end)}`} />
            <DetailItem label="Hours/month" value={`${status.plan.hours_per_month} hours`} />
            <DetailItem label="Billing cycles paid" value={`${status.plan.paid_count} / ${status.plan.total_count}`} />
          </div>
          {isCancelled && status.current_period_end && (
            <p style={{
              fontSize: '0.8125rem', color: '#f59e0b',
              margin: 'var(--space-4) 0 0',
              padding: 'var(--space-3)',
              background: '#f59e0b0d',
              borderRadius: '8px',
            }}>
              ⚠️ Your plan will be downgraded to Free after {formatDate(status.current_period_end)}. You retain full access until then.
            </p>
          )}
        </div>
      )}

      {/* Usage */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 className="section-title">Usage this period</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <span style={{ fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>Recording minutes used</span>
          <span style={{
            fontSize: '0.9375rem', fontWeight: 600,
            color: usagePct >= 90 ? '#ef4444' : usagePct >= 70 ? '#f59e0b' : 'var(--color-text-primary)',
          }}>
            {minutesUsed} / {minutesLimit} min
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${usagePct}%`,
              background: usagePct >= 90 ? '#ef4444' : usagePct >= 70 ? '#f59e0b' : planColor,
            }}
          />
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', margin: 'var(--space-2) 0 0' }}>
          {hoursLimit} {hoursLimit === 1 ? 'hour' : 'hours'} / month
        </p>
        {usagePct >= 90 && isFree && (
          <p style={{ fontSize: '0.8125rem', color: '#ef4444', margin: 'var(--space-2) 0 0' }}>
            You&apos;re almost out of free minutes — upgrade for more recording time.
          </p>
        )}
      </div>

      {/* Upgrade options (for FREE users or users wanting to switch) */}
      {(isFree || isCancelled) && upgradePlans.length > 0 && (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h3 className="section-title" style={{ margin: 0 }}>
              {isFree ? 'Upgrade your plan' : 'Available plans'}
            </h3>
            <div style={{
              display: 'inline-flex', background: 'var(--color-surface)',
              border: '1px solid var(--color-border)', borderRadius: '8px', padding: '2px', gap: '2px',
            }}>
              <button
                onClick={() => setSelectedInterval('monthly')}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: 'none',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  background: selectedInterval === 'monthly' ? 'var(--color-accent)' : 'transparent',
                  color: selectedInterval === 'monthly' ? '#fff' : 'var(--color-text-secondary)',
                }}
              >Monthly</button>
              <button
                onClick={() => setSelectedInterval('yearly')}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: 'none',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  background: selectedInterval === 'yearly' ? 'var(--color-accent)' : 'transparent',
                  color: selectedInterval === 'yearly' ? '#fff' : 'var(--color-text-secondary)',
                }}
              >Yearly</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            {upgradePlans.map((plan) => {
              const color = PLAN_COLORS[plan.tier] || 'var(--color-accent)'
              const monthlyPrice = plan.interval === 'yearly' ? Math.round(plan.price_inr / 12) : plan.price_inr
              const isStudentPlanLocked = plan.is_student_only && !isStudentEligible

              return (
                <div key={plan.id} className="card" style={{
                  border: `1px solid ${color}40`,
                  background: `linear-gradient(145deg, ${color}08 0%, var(--color-surface) 60%)`,
                }}>
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color }}>
                        {plan.name}
                      </span>
                      {plan.is_student_only && (
                        <span style={{ fontSize: '0.65rem', background: `${color}20`, color, padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                          🎓 Students Only
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--color-text-primary)' }}>
                        ₹{formatPrice(monthlyPrice)}
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>/mo</span>
                    </div>
                    {plan.interval === 'yearly' && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                        ₹{formatPrice(plan.price_inr)} billed annually
                      </p>
                    )}
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 'var(--space-1) 0 0' }}>
                      {plan.hours_per_month} hours/month
                    </p>
                  </div>

                  <RazorpayCheckout
                    planId={plan.razorpay_plan_id}
                    planName={plan.name}
                    userName={userName}
                    userEmail={userEmail}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    disabled={isStudentPlanLocked}
                    className="btn btn-primary"
                    style={{
                      width: '100%', justifyContent: 'center', fontSize: '0.875rem',
                      background: color, borderColor: color,
                    }}
                  >
                    Subscribe to {plan.name} <ArrowRight size={14} weight="bold" aria-hidden="true" />
                  </RazorpayCheckout>
                  {isStudentPlanLocked && (
                    <p style={{
                      margin: 'var(--space-2) 0 0',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-secondary)',
                    }}>
                      This plan is only available for verified student emails
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Manage subscription (for paid users) */}
      {!isFree && isActive && !isCancelled && (
        <div className="card">
          <h3 className="section-title">Manage subscription</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
            Cancel your subscription. You&apos;ll retain full access until the end of your current billing period.
          </p>
          <CancelSubscription
            onSuccess={handleCancelSuccess}
            onError={handleError}
            className="btn btn-secondary"
            style={{ fontSize: '0.875rem' }}
          >
            Cancel subscription
          </CancelSubscription>
        </div>
      )}
    </div>
  )
}

function DetailItem({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', margin: '0 0 var(--space-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{
        fontSize: '0.9375rem', fontWeight: 600,
        color: valueColor || 'var(--color-text-primary)', margin: 0,
        textTransform: 'capitalize',
      }}>
        {value}
      </p>
    </div>
  )
}
