import Link from 'next/link'

export const metadata = { title: 'Page not found — Clarvo AI' }

export default function NotFound() {
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
          fontSize: '5rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display), sans-serif',
          color: 'var(--color-accent)',
          lineHeight: 1,
          letterSpacing: '-0.04em',
        }}
        aria-hidden
      >
        404
      </p>

      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          fontFamily: 'var(--font-display), sans-serif',
          color: 'var(--color-text)',
        }}
      >
        Page not found
      </h1>

      <p style={{ color: 'var(--color-muted)', maxWidth: '32rem', lineHeight: 1.7 }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            background: 'var(--color-accent)',
            color: '#fff',
            padding: '0.625rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            textDecoration: 'none',
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Back to home
        </Link>
        <Link
          href="/app"
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
          Go to dashboard
        </Link>
      </div>
    </main>
  )
}
