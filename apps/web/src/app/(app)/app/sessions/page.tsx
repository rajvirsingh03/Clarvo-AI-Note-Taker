import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, FilmSlate, VideoCamera } from '@/components/phosphor-icons'

export const metadata: Metadata = { title: 'Sessions — Clarvo AI' }

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

interface Props {
  searchParams: Promise<{ page?: string; state?: string; q?: string }>
}

export default async function SessionsPage({ searchParams }: Props) {
  const { page: pageParam, state: stateParam, q } = await searchParams

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const page = Math.max(1, parseInt(pageParam ?? '1'))
  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('sessions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (stateParam && stateParam !== 'ALL') {
    const validStates = ['RECORDING', 'PAUSED', 'COMPLETED', 'POST_PROCESSING'] as const
    type SessionState = typeof validStates[number]
    if ((validStates as readonly string[]).includes(stateParam)) {
      query = query.eq('state', stateParam as SessionState)
    }
  }
  if (q) {
    query = query.ilike('title', `%${q}%`)
  }

  const { data: sessions, count } = await query
  const totalPages = Math.ceil((count ?? 0) / limit)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Sessions</h1>
        <p className="page-subtitle">Your complete learning history</p>
      </div>

      {/* Filter bar */}
      <form method="GET" style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search sessions..."
          className="form-input"
          style={{ width: '260px' }}
        />
        <select
          name="state"
          defaultValue={stateParam ?? 'ALL'}
          className="form-input"
          style={{ width: '180px' }}
        >
          <option value="ALL">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="RECORDING">Recording</option>
          <option value="POST_PROCESSING">Processing</option>
        </select>
        <button type="submit" className="btn btn-secondary">Filter</button>
        {(q || (stateParam && stateParam !== 'ALL')) && (
          <Link href="/app/sessions" className="btn btn-ghost">Clear</Link>
        )}
      </form>

      {/* Sessions table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {!sessions || sessions.length === 0 ? (
          <div style={{ padding: 'var(--space-16)', textAlign: 'center' }}>
            <div style={{ marginBottom: 'var(--space-4)', display: 'inline-flex' }}><FilmSlate size={48} weight="fill" aria-hidden="true" /></div>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
              {q || stateParam ? 'No matching sessions' : 'No sessions yet'}
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)', fontSize: '0.9375rem' }}>
              {q || stateParam
                ? 'Try adjusting your filters.'
                : 'Install the Chrome extension to start recording your learning sessions.'}
            </p>
            {!q && !stateParam && (
              <a
                href="https://chromewebstore.google.com"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                Install Extension
              </a>
            )}
          </div>
        ) : (
          <>
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
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div style={{ fontWeight: 500, maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {session.title}
                      </div>
                      {session.video_title && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <VideoCamera size={12} weight="fill" aria-hidden="true" /> {session.video_title}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {formatDuration((session as Record<string, unknown>)['watch_time_seconds'] as number ?? session.duration_seconds ?? 0)}
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
                        View <ArrowRight size={12} weight="bold" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Page {page} of {totalPages} ({count} total)
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {page > 1 && (
                    <Link
                      href={`/app/sessions?page=${page - 1}${stateParam ? `&state=${stateParam}` : ''}${q ? `&q=${q}` : ''}`}
                      className="btn btn-ghost"
                      style={{ height: '32px', padding: '0 12px', fontSize: '0.8125rem' }}
                    >
                      <ArrowLeft size={12} weight="bold" aria-hidden="true" /> Prev
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/app/sessions?page=${page + 1}${stateParam ? `&state=${stateParam}` : ''}${q ? `&q=${q}` : ''}`}
                      className="btn btn-ghost"
                      style={{ height: '32px', padding: '0 12px', fontSize: '0.8125rem' }}
                    >
                      Next <ArrowRight size={12} weight="bold" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
