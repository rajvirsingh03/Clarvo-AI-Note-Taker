'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, GraduationCap, Lightning, Crown } from '@/components/phosphor-icons'

interface PricingPlan {
  id: string
  tier: string
  name: string
  description: string | null
  razorpay_plan_id: string
  price_inr: number
  interval: string
  hours_per_month: number
  features: string[]
  is_student_only: boolean
  badge: string | null
  sort_order: number
}

export function PricingClient({ plans }: { plans: PricingPlan[] }) {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')

  const freePlan = plans.find(p => p.tier === 'FREE')
  const proPlan = plans.find(p => p.tier === 'PRO' && p.interval === billingInterval)
  const powerPlan = plans.find(p => p.tier === 'POWER' && p.interval === billingInterval)
  const studentPlan = plans.find(p => p.tier === 'STUDENT')

  const proMonthly = plans.find(p => p.tier === 'PRO' && p.interval === 'monthly')
  const proYearly = plans.find(p => p.tier === 'PRO' && p.interval === 'yearly')
  const powerMonthly = plans.find(p => p.tier === 'POWER' && p.interval === 'monthly')
  const powerYearly = plans.find(p => p.tier === 'POWER' && p.interval === 'yearly')

  // Calculate savings for annual
  const proSavings = proMonthly && proYearly
    ? Math.round(((proMonthly.price_inr * 12 - proYearly.price_inr) / (proMonthly.price_inr * 12)) * 100)
    : 0
  const powerSavings = powerMonthly && powerYearly
    ? Math.round(((powerMonthly.price_inr * 12 - powerYearly.price_inr) / (powerMonthly.price_inr * 12)) * 100)
    : 0

  const effectiveMonthlyPrice = (price: number, interval: string) => {
    if (interval === 'yearly') return Math.round(price / 12)
    return price
  }

  return (
    <div style={{ background: 'var(--color-base)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      {/* Hero */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        padding: 'clamp(60px,10vw,120px) 1.5rem 0',
        textAlign: 'center',
      }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(108,99,255,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            letterSpacing: '-0.03em',
            color: 'var(--color-text-primary)',
            marginBottom: '1rem',
          }}>Simple, honest pricing</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
            Start free. Upgrade when you need more power. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '4px',
            gap: '2px',
          }}>
            <button
              onClick={() => setBillingInterval('monthly')}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: billingInterval === 'monthly' ? 'var(--color-accent)' : 'transparent',
                color: billingInterval === 'monthly' ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: billingInterval === 'yearly' ? 'var(--color-accent)' : 'transparent',
                color: billingInterval === 'yearly' ? '#fff' : 'var(--color-text-secondary)',
                position: 'relative',
              }}
            >
              Yearly
              {billingInterval === 'yearly' && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#10b981',
                  color: '#fff',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                }}>
                  Save {Math.max(proSavings, powerSavings)}%
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section style={{
        padding: 'clamp(48px,6vw,64px) 1.5rem clamp(48px,6vw,80px)',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        alignItems: 'start',
      }}>
        {/* Free Plan */}
        {freePlan && (
          <PlanCard
            name="Free"
            price={0}
            interval="monthly"
            description="Perfect for trying Clarvo. No credit card needed."
            features={freePlan.features as unknown as string[]}
            hours={freePlan.hours_per_month}
            ctaText="Get started free"
            ctaHref="/login?signup=1"
            isLink
          />
        )}

        {/* Pro Plan */}
        {proPlan && (
          <PlanCard
            name="Pro"
            price={proPlan.price_inr}
            interval={billingInterval}
            description="For regular learners who want more."
            features={proPlan.features as unknown as string[]}
            hours={proPlan.hours_per_month}
            badge="Most Popular"
            highlighted
            savings={billingInterval === 'yearly' ? proSavings : undefined}
            monthlyEquivalent={billingInterval === 'yearly' ? effectiveMonthlyPrice(proPlan.price_inr, 'yearly') : undefined}
            ctaText="Get Pro"
            ctaHref="/login?signup=1&plan=pro"
            isLink
            accentColor="var(--color-accent)"
            iconElement={<Crown size={18} weight="fill" />}
          />
        )}

        {/* Power Plan */}
        {powerPlan && (
          <PlanCard
            name="Power"
            price={powerPlan.price_inr}
            interval={billingInterval}
            description="For power users who need maximum capacity."
            features={powerPlan.features as unknown as string[]}
            hours={powerPlan.hours_per_month}
            savings={billingInterval === 'yearly' ? powerSavings : undefined}
            monthlyEquivalent={billingInterval === 'yearly' ? effectiveMonthlyPrice(powerPlan.price_inr, 'yearly') : undefined}
            ctaText="Get Power"
            ctaHref="/login?signup=1&plan=power"
            isLink
            accentColor="#f59e0b"
            iconElement={<Lightning size={18} weight="fill" />}
          />
        )}

        {/* Student Plan */}
        {studentPlan && (
          <PlanCard
            name="Student"
            price={studentPlan.price_inr}
            interval="monthly"
            description="Exclusive pricing for students with .edu email."
            features={studentPlan.features as unknown as string[]}
            hours={studentPlan.hours_per_month}
            badge="Students Only"
            ctaText="Get Student plan"
            ctaHref="/login?signup=1&plan=student"
            isLink
            accentColor="#06b6d4"
            isStudentOnly
            iconElement={<GraduationCap size={18} weight="fill" />}
          />
        )}
      </section>

      {/* FAQ */}
      <section style={{
        borderTop: '1px solid var(--color-border)',
        padding: 'clamp(48px,6vw,80px) 1.5rem',
        maxWidth: '720px',
        margin: '0 auto',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', color: 'var(--color-text-primary)', marginBottom: '2rem', textAlign: 'center' }}>
          Frequently asked questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <FaqItem
            q="Can I cancel anytime?"
            a="Yes, you can cancel your subscription at any time. You'll keep full access until the end of your current billing period."
          />
          <FaqItem
            q="What happens when I upgrade?"
            a="You'll get instant access to your new plan's features and recording hours. Your billing cycle starts immediately."
          />
          <FaqItem
            q="Who qualifies for the Student plan?"
            a="Anyone with a valid educational email address (.edu, .edu.in, .ac.in, .ac.uk) can subscribe to the Student plan."
          />
          <FaqItem
            q="How does billing work?"
            a="We use Razorpay for secure payments. Monthly plans auto-renew each month. Annual plans provide a significant discount and renew yearly."
          />
          <FaqItem
            q="Is my data safe?"
            a="Absolutely. Your sessions are private to your account. We never sell your data. Payments are processed securely through Razorpay."
          />
        </div>
      </section>
    </div>
  )
}

function PlanCard({
  name,
  price,
  interval,
  description,
  features,
  hours,
  badge,
  highlighted,
  savings,
  monthlyEquivalent,
  ctaText,
  ctaHref,
  isLink: _isLink,
  accentColor,
  isStudentOnly,
  iconElement,
}: {
  name: string
  price: number
  interval: string
  description: string
  features: string[]
  hours: number
  badge?: string
  highlighted?: boolean
  savings?: number
  monthlyEquivalent?: number
  ctaText: string
  ctaHref: string
  isLink?: boolean
  accentColor?: string
  isStudentOnly?: boolean
  iconElement?: React.ReactNode
}) {
  const accent = accentColor || 'var(--color-accent)'
  const formatPrice = (p: number) => new Intl.NumberFormat('en-IN').format(p)

  return (
    <div style={{
      background: highlighted
        ? `linear-gradient(145deg, ${accent}14 0%, var(--color-surface) 60%)`
        : 'var(--color-surface)',
      border: highlighted ? `1px solid ${accent}66` : '1px solid var(--color-border)',
      borderRadius: '16px',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      position: 'relative',
      boxShadow: highlighted ? `0 0 48px ${accent}1a` : 'none',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}>
      {badge && (
        <div style={{
          position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
          background: accent,
          color: '#fff',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '4px 16px',
          borderRadius: '0 0 8px 8px',
        }}>{badge}</div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {iconElement && (
            <span style={{ color: accent, display: 'inline-flex', alignItems: 'center' }}>
              {iconElement}
            </span>
          )}
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: highlighted ? accent : 'var(--color-text-tertiary)',
          }}>
            Clarvo {name}
          </span>
        </div>

        {price === 0 ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '3rem',
              color: 'var(--color-text-primary)', letterSpacing: '-0.04em',
            }}>₹0</span>
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>/month</span>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.75rem',
                color: 'var(--color-text-primary)', letterSpacing: '-0.04em',
              }}>₹{formatPrice(monthlyEquivalent || price)}</span>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
                /month
              </span>
            </div>
            {interval === 'yearly' && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                ₹{formatPrice(price)} billed annually
                {savings ? (
                  <span style={{
                    background: '#10b98122',
                    color: '#10b981',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    marginLeft: '0.5rem',
                  }}>
                    Save {savings}%
                  </span>
                ) : null}
              </p>
            )}
          </div>
        )}

        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: 1.55 }}>
          {description}
        </p>
      </div>

      {/* Hours badge */}
      <div style={{
        background: `${accent}12`,
        border: `1px solid ${accent}30`,
        borderRadius: '10px',
        padding: '0.625rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{ fontSize: '1.25rem' }}>⏱️</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {hours} {hours === 1 ? 'hour' : 'hours'}/month
        </span>
      </div>

      {/* CTA */}
      <Link href={ctaHref} style={{
        display: 'block', textAlign: 'center',
        background: highlighted ? accent : 'var(--color-surface-raised)',
        color: highlighted ? '#fff' : 'var(--color-text-primary)',
        padding: '0.8125rem',
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: 700,
        textDecoration: 'none',
        border: highlighted ? 'none' : '1px solid var(--color-border)',
        boxShadow: highlighted ? `0 0 24px ${accent}30` : 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}>
        {ctaText} <ArrowRight size={14} weight="bold" aria-hidden="true" style={{ verticalAlign: 'middle' }} />
      </Link>

      {/* Features */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {(features as string[]).map((f) => (
          <li key={f} style={{
            display: 'flex', gap: '0.625rem', alignItems: 'flex-start',
            fontSize: '0.8125rem', color: 'var(--color-text-secondary)',
          }}>
            <span style={{ color: accent, flexShrink: 0, display: 'inline-flex', alignItems: 'center', marginTop: '1px' }}>
              <Check size={14} weight="bold" aria-hidden="true" />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {isStudentOnly && (
        <p style={{
          fontSize: '0.75rem', color: 'var(--color-text-tertiary)',
          background: 'var(--color-surface-raised)',
          padding: '0.5rem 0.75rem',
          borderRadius: '8px',
          textAlign: 'center',
          margin: 0,
        }}>
          🎓 Requires a valid .edu or educational email
        </p>
      )}
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '1.25rem 1.5rem',
    }}>
      <h3 style={{
        fontFamily: 'var(--font-display)', fontWeight: 600,
        fontSize: '1rem', color: 'var(--color-text-primary)',
        margin: '0 0 0.5rem',
      }}>{q}</h3>
      <p style={{
        color: 'var(--color-text-secondary)', fontSize: '0.875rem',
        lineHeight: 1.6, margin: 0,
      }}>{a}</p>
    </div>
  )
}
