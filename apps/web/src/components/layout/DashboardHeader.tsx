'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DashboardHeaderProps {
  title?: string
  /** User's display name from server component, passed down */
  userName?: string | null
}

export function DashboardHeader({ title, userName }: DashboardHeaderProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      style={{
        height: '60px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        gap: '1rem',
        flexShrink: 0,
      }}
    >
      {title && (
        <h1
          style={{
            fontFamily: 'var(--font-display), sans-serif',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--color-text)',
            flex: 1,
          }}
        >
          {title}
        </h1>
      )}
      {!title && <div style={{ flex: 1 }} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {userName && (
          <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
            {userName}
          </span>
        )}
        <button
          onClick={handleSignOut}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-muted)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            padding: '0 0.875rem',
            height: '36px',
            cursor: 'pointer',
            minWidth: '44px',
            transition: 'border-color 0.15s, color 0.15s',
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
