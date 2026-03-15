import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { FREE_TIER_LIMITS } from '@clarvo/utils'
import { ArrowRight, Check, X } from '@phosphor-icons/react'

export const metadata: Metadata = { title: 'Billing — Clarvo AI' }

export default async function BillingPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, billing_tier, free_minutes_used, stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .single()

  const tier = profile?.billing_tier ?? 'FREE'
  const freeMinutesUsed = Number(profile?.free_minutes_used ?? 0)
  const freeMinutesLimit = FREE_TIER_LIMITS.TOTAL_WATCH_MINUTES
  const freeMinutesPct = Math.min(100, Math.round((freeMinutesUsed / freeMinutesLimit) * 100))
  const isPro = tier === 'PRO'

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="page-title">Billing</h1>
        <p className="page-subtitle">Manage your plan and review usage.</p>
      </div>

      {/* Current plan badge */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current plan
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              {isPro ? 'Clarvo Pro' : 'Clarvo Free'}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
                background: isPro ? 'var(--color-accent)' : 'var(--color-surface-raised)',
                color: isPro ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${isPro ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {isPro ? 'PRO' : 'FREE'}
            </span>
          </div>
        </div>
        {isPro && (
          <div style={{ marginLeft: 'auto' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              $12 / month
            </p>
          </div>
        )}
      </div>

      {/* Usage (only for FREE) */}
      {!isPro && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h3 className="section-title">Free tier usage</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>Watch minutes used</span>
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: freeMinutesPct >= 90 ? '#ef4444' : freeMinutesPct >= 70 ? '#f59e0b' : 'var(--color-text-primary)' }}>
              {freeMinutesUsed} / {freeMinutesLimit} min
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${freeMinutesPct}%`,
                background: freeMinutesPct >= 90 ? '#ef4444' : freeMinutesPct >= 70 ? '#f59e0b' : 'var(--color-accent)',
              }}
            />
          </div>
          {freeMinutesPct >= 90 && (
            <p style={{ fontSize: '0.8125rem', color: '#ef4444', margin: 'var(--space-2) 0 0' }}>
              You&apos;re almost out of free minutes — upgrade to Pro for unlimited recording.
            </p>
          )}
        </div>
      )}

      {/* Plan comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        {/* Free plan */}
        <div
          className="card"
          style={{
            border: !isPro ? '1px solid var(--color-accent)' : undefined,
            position: 'relative',
          }}
        >
          {!isPro && (
            <div
              style={{
                position: 'absolute',
                top: 'var(--space-4)',
                right: 'var(--space-4)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'var(--color-accent)',
                color: '#fff',
              }}
            >
              CURRENT
            </div>
          )}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text-primary)', margin: '0 0 var(--space-1)' }}>
              Free
            </h3>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              $0 <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>/mo</span>
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[
              `${freeMinutesLimit} minutes of recording`,
              '3 screenshots per session',
              'AI-generated notes',
              'Basic session management',
            ].map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                <span style={{ color: '#10b981', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}><Check size={14} weight="bold" aria-hidden="true" /></span>
                {f}
              </li>
            ))}
            {[
              'Flashcards & quiz mode',
              'Action plans',
              'Notion export',
              'Unlimited recording',
            ].map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                <span style={{ color: 'var(--color-border)', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}><X size={14} weight="bold" aria-hidden="true" /></span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro plan */}
        <div
          className="card"
          style={{
            border: isPro ? '1px solid var(--color-accent)' : undefined,
            position: 'relative',
            background: isPro ? undefined : 'linear-gradient(135deg, var(--color-surface) 0%, rgba(108,99,255,0.08) 100%)',
          }}
        >
          {isPro && (
            <div
              style={{
                position: 'absolute',
                top: 'var(--space-4)',
                right: 'var(--space-4)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'var(--color-accent)',
                color: '#fff',
              }}
            >
              CURRENT
            </div>
          )}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text-primary)', margin: '0 0 var(--space-1)' }}>
              Pro
            </h3>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              $12 <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>/mo</span>
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[
              'Unlimited recording',
              'Unlimited screenshots',
              'AI-generated flashcards',
              'Action plans & summaries',
              'Notion export',
              'Priority support',
            ].map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                <span style={{ color: '#10b981', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}><Check size={14} weight="bold" aria-hidden="true" /></span>
                {f}
              </li>
            ))}
          </ul>
          {!isPro && (
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.9375rem' }}
              disabled
              title="Stripe checkout coming soon"
            >
              Upgrade to Pro <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {isPro && (
        <div className="card">
          <h3 className="section-title">Billing management</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', margin: '0 0 var(--space-4)' }}>
            Manage your subscription, view invoices, or cancel through the Stripe billing portal.
          </p>
          <button
            className="btn btn-secondary"
            disabled
            title="Stripe portal coming soon"
          >
            Open billing portal
          </button>
        </div>
      )}
    </div>
  )
}
