'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/app', label: 'Dashboard', icon: '⊞' },
  { href: '/app/sessions', label: 'Sessions', icon: '⏱' },
  { href: '/app/analytics', label: 'Analytics', icon: '⬡' },
  { href: '/app/billing', label: 'Billing', icon: '⭐' },
  { href: '/app/settings', label: 'Settings', icon: '⚙' },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: '220px',
        flexShrink: 0,
        borderRight: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
      }}
      aria-label="Dashboard navigation"
    >
      {/* Brand */}
      <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--color-border)' }}>
        <Link
          href="/app"
          style={{
            fontFamily: 'var(--font-display), sans-serif',
            fontWeight: 700,
            fontSize: '1.0625rem',
            color: 'var(--color-text-primary)',
            textDecoration: 'none',
          }}
        >
          Clarvo AI
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.75rem' }}>
        <ul style={{ listStyle: 'none' }}>
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/app' && pathname.startsWith(href))
            return (
              <li key={href} style={{ marginBottom: '2px' }}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '0.6rem 0.875rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    background: active ? 'rgba(108,99,255,0.12)' : 'transparent',
                    transition: 'background 0.15s, color 0.15s',
                    minHeight: '44px',
                  }}
                >
                  <span aria-hidden style={{ fontSize: '1rem', lineHeight: 1 }}>{icon}</span>
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
        <Link
          href="/"
          style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.8125rem', padding: '0.5rem', textDecoration: 'none' }}
        >
          ← Back to website
        </Link>
      </div>
    </aside>
  )
}
