import type { Metadata } from 'next'
import { GoogleSignInButton } from './GoogleSignInButton'
import { Lightning } from '@/components/phosphor-icons'

export const metadata: Metadata = { title: 'Sign In' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; signup?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const isSignup = resolvedSearchParams?.signup === '1'
  const error = resolvedSearchParams?.error

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      background: 'var(--color-base)',
      fontFamily: 'var(--font-body)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(108,99,255,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%',
        maxWidth: '420px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '20px',
        padding: 'clamp(2rem, 4vw, 2.75rem)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px', height: '48px',
            background: 'var(--color-accent-dim)',
            border: '1px solid rgba(108,99,255,0.4)',
            borderRadius: '12px',
            marginBottom: '1.25rem',
          }}>
            <Lightning size={22} weight="fill" color="var(--color-accent)" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.5rem',
            letterSpacing: '-0.025em',
            color: 'var(--color-text-primary)',
            margin: '0 0 0.5rem',
          }}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            {isSignup
              ? 'Start learning smarter. Free, no credit card needed.'
              : 'Sign in to access your sessions and notes.'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.8125rem',
            color: '#fca5a5',
          }}>
            {error === 'auth_callback_failed'
              ? 'Sign-in failed. Please try again.'
              : 'Something went wrong. Please try again.'}
          </div>
        )}

        {/* OAuth Button */}
        <GoogleSignInButton />

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          margin: '1.5rem 0',
          color: 'var(--color-text-tertiary)',
          fontSize: '0.75rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          More sign-in options coming soon
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
        </div>

        {/* Footer note */}
        <p style={{
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: '0.75rem',
          lineHeight: 1.6,
          marginTop: '1.25rem',
        }}>
          By continuing, you agree to our{' '}
          <a href="/terms" style={{ color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>Terms</a>
          {' '}and{' '}
          <a href="/privacy" style={{ color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
