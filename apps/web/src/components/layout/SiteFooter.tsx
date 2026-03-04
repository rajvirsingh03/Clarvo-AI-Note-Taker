import Link from 'next/link'

const FOOTER_LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

export function SiteFooter() {
  return (
    <footer
      role="contentinfo"
      style={{
        borderTop: '1px solid var(--color-border)',
        padding: '3rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '64rem',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display), sans-serif',
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--color-text)',
          }}
        >
          Clarvo AI
        </span>

        <nav aria-label="Footer navigation" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {FOOTER_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{ color: 'var(--color-muted)', textDecoration: 'none', fontSize: '0.875rem' }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <p style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>
          &copy; {new Date().getFullYear()} Clarvo AI. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
