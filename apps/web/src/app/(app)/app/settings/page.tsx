import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Settings — Clarvo AI' }

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url, billing_tier, notion_workspace_name, notion_workspace_id')
    .eq('id', user.id)
    .single()

  const notionConnected = !!profile?.notion_workspace_name

  return (
    <div style={{ maxWidth: '640px' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account, integrations, and preferences.</p>
      </div>

      {/* Profile */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 className="section-title">Profile</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.25rem',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {profile?.full_name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? '?'}
            </div>
          )}
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              {profile?.full_name ?? 'No name set'}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              {user.email}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', rowGap: 'var(--space-4)' }}>
          <div>
            <label className="form-label">Display name</label>
            <input
              className="form-input"
              defaultValue={profile?.full_name ?? ''}
              placeholder="Your name"
              disabled
              title="Profile editing coming soon"
            />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input
              className="form-input"
              defaultValue={user.email ?? ''}
              disabled
            />
          </div>
          <div>
            <button className="btn btn-secondary" disabled title="Profile editing coming soon">
              Save changes
            </button>
          </div>
        </div>
      </div>

      {/* Notion */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 className="section-title">Notion integration</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
          Connect your Notion workspace to export session notes and flashcards directly.
          {' '}
          <span style={{ color: profile?.billing_tier === 'FREE' ? '#f59e0b' : 'inherit' }}>
            {profile?.billing_tier === 'FREE' && '(Pro plan required for export)'}
          </span>
        </p>

        {notionConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span style={{ color: '#10b981', fontWeight: 600 }}>●</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                Connected to {profile.notion_workspace_name}
              </span>
            </div>
            <button className="btn btn-ghost" disabled title="Disconnect coming soon" style={{ fontSize: '0.875rem' }}>
              Disconnect
            </button>
          </div>
        ) : (
          <Link href="/api/auth/notion" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span>📝</span> Connect Notion
          </Link>
        )}
      </div>

      {/* Chrome Extension */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 className="section-title">Chrome Extension</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
          The Clarvo Chrome extension captures video audio and screenshots directly from your browser tab.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.875rem' }}
          >
            ↗ Chrome Web Store
          </a>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
        <h3 className="section-title" style={{ color: '#ef4444' }}>Danger zone</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button className="btn btn-danger" disabled title="Contact support to delete your account">
          Delete account
        </button>
      </div>
    </div>
  )
}
