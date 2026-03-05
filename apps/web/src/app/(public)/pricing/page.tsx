import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Pricing' }

const FREE_FEATURES = [
  '3 sessions / month',
  '30 min audio per session',
  '3 screenshots per session',
  'AI notes & summaries',
  'Basic transcript view',
]
const FREE_MISSING = [
  'Flashcard generation',
  'Action plan',
  'Notion export',
  'Unlimited sessions',
]
const PRO_FEATURES = [
  'Unlimited sessions',
  'Unlimited audio length',
  'Unlimited screenshots',
  'AI notes & summaries',
  'Auto flashcard generation',
  'Action plan per session',
  'Notion one-click export',
  'Priority support',
]

export default function PricingPage() {
  return (
    <div style={{ background: 'var(--color-base)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
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
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', maxWidth: '440px', margin: '0 auto' }}>
            Start free. Upgrade when you need more power.
          </p>
        </div>
      </section>

      {/* Cards */}
      <section style={{
        padding: 'clamp(48px,6vw,80px) 1.5rem clamp(80px,10vw,120px)',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start',
      }}>
        {/* Free */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>Clarvo Free</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '3rem', color: 'var(--color-text-primary)', letterSpacing: '-0.04em' }}>$0</span>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>/month</span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: 1.55 }}>
              Perfect for trying Clarvo. No credit card needed.
            </p>
          </div>

          <Link href="/login?signup=1" style={{
            display: 'block', textAlign: 'center',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            padding: '0.8125rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 600,
            textDecoration: 'none',
            background: 'var(--color-surface-raised)',
          }}>
            Get started free
          </Link>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {FREE_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                <span style={{ color: 'var(--color-success)', flexShrink: 0 }}>✓</span> {f}
              </li>
            ))}
            {FREE_MISSING.map(f => (
              <li key={f} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--color-text-tertiary)', opacity: 0.5, textDecoration: 'line-through' }}>
                <span style={{ flexShrink: 0 }}>–</span> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(108,99,255,0.12) 0%, var(--color-surface) 60%)',
          border: '1px solid rgba(108,99,255,0.4)',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          position: 'relative',
          boxShadow: '0 0 48px rgba(108,99,255,0.1)',
        }}>
          <div style={{
            position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--color-accent)',
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '4px 16px',
            borderRadius: '0 0 8px 8px',
          }}>Most popular</div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: '0.75rem' }}>Clarvo Pro</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '3rem', color: 'var(--color-text-primary)', letterSpacing: '-0.04em' }}>$12</span>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>/month</span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: 1.55 }}>
              Unlimited learning. Every feature unlocked.
            </p>
          </div>

          <Link href="/login?signup=1" style={{
            display: 'block', textAlign: 'center',
            background: 'var(--color-accent)',
            color: '#fff',
            padding: '0.8125rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 0 24px rgba(108,99,255,0.3)',
          }}>
            Start free → upgrade later
          </Link>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {PRO_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>✓</span> {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ / note */}
      <section style={{
        borderTop: '1px solid var(--color-border)',
        padding: 'clamp(48px,6vw,80px) 1.5rem',
        maxWidth: '640px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>Questions?</h2>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
          You can upgrade or cancel anytime from your account settings. Pro is billed monthly via Stripe. Data is never sold. Sessions are private to your account.
        </p>
      </section>
    </div>
  )
}
