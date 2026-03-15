import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  Calendar,
  Cards,
  CheckCircle,
  Crown,
  FilmSlate,
  NotePencil,
  Plug,
  VideoCamera,
  Clock,
  ClipboardText,
} from '@phosphor-icons/react'

export const metadata: Metadata = { title: 'Dashboard — Clarvo AI' }

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(iso)
  )
}

export default async function AppDashboardPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Parallel queries
  const [sessionsResult, profileResult] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, title, state, duration_seconds, watch_time_seconds, created_at, video_title, video_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('users')
      .select('full_name, billing_tier, free_minutes_used, notion_access_token, notion_workspace_name')
      .eq('id', user.id)
      .single(),
  ])

  const sessions = sessionsResult.data ?? []
  const profile = profileResult.data

  // Fetch total flashcards properly
  let totalFlashcards = 0
  if (sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id)
    const { count } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .in('session_id', sessionIds)
    totalFlashcards = count ?? 0
  }

  const totalSessions = sessions.length
  const totalWatchSeconds = sessions.reduce((acc, s) => acc + (s.watch_time_seconds ?? s.duration_seconds ?? 0), 0)
  const freeMinutesUsed = Number(profile?.free_minutes_used ?? 0)
  const billingTier = profile?.billing_tier ?? 'FREE'
  const displayName = profile?.full_name ?? user.email?.split('@')[0] ?? 'there'
  const recentSessions = sessions.slice(0, 6)

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back, {displayName}</p>
      </div>

      {/* Stats row */}
      <div className="stat-grid">
        <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {totalSessions}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}><FilmSlate size={16} weight="fill" aria-hidden="true" /></span>
            <span className="stat-label">Total Sessions</span>
          </div>
        </div>

        <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {formatDuration(totalWatchSeconds)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}><Clock size={16} weight="fill" aria-hidden="true" /></span>
            <span className="stat-label">Watch Time</span>
          </div>
        </div>

        <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {totalFlashcards}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}><Cards size={16} weight="fill" aria-hidden="true" /></span>
            <span className="stat-label">Flashcards</span>
          </div>
        </div>

        <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {billingTier === 'FREE' ? (
            <>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: freeMinutesUsed >= 25 ? '#f59e0b' : 'var(--color-text-primary)', lineHeight: 1 }}>
                {freeMinutesUsed.toFixed(1)}
                <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>/30m</span>
              </div>
              <div style={{ marginTop: '6px' }}>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min((freeMinutesUsed / 30) * 100, 100)}%`,
                      background: freeMinutesUsed >= 25 ? '#f59e0b' : 'var(--color-accent)',
                    }}
                  />
                </div>
              </div>
              <span className="stat-label" style={{ marginTop: '2px' }}>Free Minutes</span>
            </>
          ) : (
            <>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-accent)', lineHeight: 1 }}>∞</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}><Crown size={16} weight="fill" aria-hidden="true" /></span>
                <span className="stat-label">Pro Plan</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main layout: sessions + quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Recent Sessions */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Recent Sessions</h2>
            <Link href="/app/sessions" className="btn btn-ghost" style={{ height: '32px', padding: '0 12px', fontSize: '0.8125rem' }}>
              View all <ArrowRight size={12} weight="bold" aria-hidden="true" />
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <div style={{ padding: 'var(--space-12) var(--space-6)', textAlign: 'center' }}>
              <div style={{ marginBottom: 'var(--space-4)', display: 'inline-flex' }}><FilmSlate size={40} weight="fill" aria-hidden="true" /></div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', margin: '0 0 var(--space-4)' }}>
                No sessions yet. Install the extension to start recording.
              </p>
              <a
                href="https://chromewebstore.google.com"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                Install Extension
              </a>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div style={{ fontWeight: 500, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {session.title}
                      </div>
                      {session.video_title && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <VideoCamera size={12} weight="fill" aria-hidden="true" /> {session.video_title}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {formatDuration(session.watch_time_seconds ?? session.duration_seconds ?? 0)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          session.state === 'COMPLETED'
                            ? 'badge-success'
                            : session.state === 'RECORDING'
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}
                      >
                        {session.state}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {formatDate(session.created_at)}
                    </td>
                    <td>
                      <Link
                        href={`/app/sessions/${session.id}`}
                        className="btn btn-ghost"
                        style={{ height: '28px', padding: '0 10px', fontSize: '0.8125rem' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Actions sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Upgrade CTA for free users */}
          {billingTier === 'FREE' && (
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(108,99,255,0.05) 100%)',
                border: '1px solid rgba(108,99,255,0.3)',
              }}
            >
              <div style={{ marginBottom: 'var(--space-2)', display: 'inline-flex' }}><Crown size={20} weight="fill" aria-hidden="true" /></div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
                Upgrade to Pro
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)', lineHeight: 1.5 }}>
                Unlimited watch time, flashcards, and Notion export.
              </p>
              <Link href="/app/billing" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Upgrade — $12/mo
              </Link>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <h3 className="section-title">Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <a
                href="https://chromewebstore.google.com"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <span><Plug size={14} weight="fill" aria-hidden="true" /></span> Install Extension
              </a>
              {profile?.notion_access_token ? (
                <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>Notion Connected</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{profile.notion_workspace_name ?? 'Workspace'}</div>
                </div>
              ) : (
                <a
                  href="/api/auth/notion"
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <span><NotePencil size={14} weight="fill" aria-hidden="true" /></span> Connect Notion
                </a>
              )}
              <Link
                href="/app/sessions"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <span><ClipboardText size={14} weight="fill" aria-hidden="true" /></span> All Sessions
              </Link>
            </div>
          </div>

          {/* Getting started */}
          <div className="card">
            <h3 className="section-title">Get Started</h3>
            <ol style={{ paddingLeft: 'var(--space-4)', margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <li style={{ fontSize: '0.8125rem', color: totalSessions > 0 ? '#22c55e' : 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {totalSessions > 0 ? <CheckCircle size={14} weight="fill" aria-hidden="true" /> : '1.'} Record your first session
              </li>
              <li style={{ fontSize: '0.8125rem', color: totalFlashcards > 0 ? '#22c55e' : 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {totalFlashcards > 0 ? <CheckCircle size={14} weight="fill" aria-hidden="true" /> : '2.'} Review flashcards
              </li>
              <li style={{ fontSize: '0.8125rem', color: profile?.notion_access_token ? '#22c55e' : 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {profile?.notion_access_token ? <CheckCircle size={14} weight="fill" aria-hidden="true" /> : '3.'} Connect Notion
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
