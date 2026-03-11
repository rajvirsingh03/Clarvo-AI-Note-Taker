import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SessionNotesViewer } from './SessionNotesViewer'
import { ExportToNotionButton } from '@/components/ExportToNotionButton'
import { QuizSection } from './QuizSection'

export const metadata: Metadata = { title: 'Session — Clarvo AI' }

interface Props {
  params: Promise<{ id: string }>
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export default async function SessionDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('sessions')
    .select(`*, flashcards(*), action_plans(*)`)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!session) notFound()

  const flashcards = (session.flashcards as Array<{ id: string; front: string; back: string }>) ?? []
  const actionPlans = (session.action_plans as Array<{ content: string }>) ?? []
  const initialActionPlan = actionPlans[0]?.content ?? null
  const watchSeconds = (session as Record<string, unknown>)['watch_time_seconds'] as number ?? session.duration_seconds ?? 0

  return (
    <div>
      {/* Back nav */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link
          href="/app/sessions"
          style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          ← Sessions
        </Link>
      </div>

      {/* Session header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 var(--space-2)' }}>
              {session.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                {formatDate(session.created_at)}
              </span>
              <span style={{ color: 'var(--color-border)' }}>·</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                ⏱ {formatDuration(watchSeconds)}
              </span>
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
            </div>
          </div>

          {/* Export to Notion */}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <ExportToNotionButton
              sessionId={session.id}
              sessionTitle={session.title ?? 'Untitled Session'}
              videoUrl={session.video_url}
              initialNotionPageId={(session as Record<string, unknown>)['notion_page_id'] as string | null | undefined}
            />
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Main: tabbed notes/flashcards */}
        <SessionNotesViewer
          notes={session.notes}
          flashcards={flashcards}
          sessionId={session.id}
          initialActionPlan={initialActionPlan}
        />

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Session info */}
          <div className="card">
            <h3 className="section-title" style={{ fontSize: '0.9375rem' }}>Session Info</h3>
            <dl style={{ margin: 0, display: 'grid', rowGap: 'var(--space-3)' }}>
              {session.video_title && (
                <>
                  <dt style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Video</dt>
                  <dd style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>{session.video_title}</dd>
                </>
              )}
              <dt style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</dt>
              <dd style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{formatDuration(watchSeconds)}</dd>
              <dt style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recorded</dt>
              <dd style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{formatDate(session.created_at)}</dd>
            </dl>
          </div>

          {/* Quiz */}
          <QuizSection sessionId={session.id} notes={session.notes} />

          {/* Flashcards */}
          <div className="card">
            <h3 className="section-title" style={{ fontSize: '0.9375rem' }}>Flashcards</h3>
            {flashcards.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                No flashcards generated yet.
              </p>
            ) : (
              <>
                <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-accent)', marginBottom: 'var(--space-3)' }}>
                  {flashcards.length}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
                  cards ready to review
                </p>

              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
