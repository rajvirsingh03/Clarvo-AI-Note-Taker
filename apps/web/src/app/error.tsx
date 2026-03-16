'use client'

import { useEffect } from 'react'
import { Lightning } from '@/components/phosphor-icons'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // In production, send to an error monitoring service
    console.error('[Clarvo] Unhandled error:', error)
  }, [error])

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1.5rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: '3rem',
          lineHeight: 1,
        }}
        aria-hidden
      >
        <Lightning size={48} weight="fill" />
      </p>

      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          fontFamily: 'var(--font-display), sans-serif',
          color: 'var(--color-text)',
        }}
      >
        Something went wrong
      </h1>

      <p style={{ color: 'var(--color-muted)', maxWidth: '32rem', lineHeight: 1.7 }}>
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            background: 'var(--color-accent)',
            color: '#fff',
            padding: '0.625rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            border: '1px solid var(--color-border)',
            color: 'var(--color-muted)',
            padding: '0.625rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: '0.9rem',
            textDecoration: 'none',
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Go home
        </a>
      </div>

      {error.digest && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
          Error ID: {error.digest}
        </p>
      )}
    </main>
  )
}
