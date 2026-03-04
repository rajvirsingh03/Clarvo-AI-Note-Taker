'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
]

export function SiteHeader() {
  const pathname = usePathname()
  return (
    <header className="site-header" role="banner">
      <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 1.5rem', height: '100%' }}>
        <Link href="/" className="logo" aria-label="Clarvo AI home">
          Clarvo AI
        </Link>

        <nav className="site-nav" aria-label="Main navigation" style={{ display: 'flex', gap: '1.5rem', flex: 1, marginLeft: '2rem' }}>
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              style={{
                color: pathname === href ? 'var(--color-text)' : 'var(--color-muted)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'color 0.15s',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            href="/login"
            style={{
              color: 'var(--color-muted)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Sign in
          </Link>
          <Link
            href="/login?signup=1"
            className="btn-primary"
            style={{
              background: 'var(--color-accent)',
              color: '#fff',
              padding: '0.5rem 1.125rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Get started free
          </Link>
        </div>
      </div>

      <style>{`
        .site-header {
          position: sticky; top: 0; z-index: 50;
          height: 64px;
          background: rgba(10,10,15,0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--color-border);
        }
        .site-header .logo {
          font-family: var(--font-display), sans-serif;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text);
          text-decoration: none;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }
      `}</style>
    </header>
  )
}
