import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Analytics — Clarvo AI' }

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function dayKey(iso: string) {
  return iso.slice(0, 10) // "YYYY-MM-DD"
}

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, created_at, state, duration_seconds, watch_time_seconds')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const allSessions = sessions ?? []

  // Aggregate
  const totalSessions = allSessions.length
  const completedSessions = allSessions.filter((s) => s.state === 'COMPLETED').length
  const totalSeconds = allSessions.reduce((acc, s) => {
    const ws = (s as Record<string, unknown>)['watch_time_seconds'] as number ?? null
    return acc + (ws ?? s.duration_seconds ?? 0)
  }, 0)

  // Sessions by state
  const stateCounts = allSessions.reduce(
    (acc, s) => {
      acc[s.state as string] = (acc[s.state as string] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Last 30 days activity (sessions per day)
  const now = new Date()
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().slice(0, 10)
  })

  const sessionsByDay = allSessions.reduce(
    (acc, s) => {
      const k = dayKey(s.created_at)
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const maxBar = Math.max(1, ...last30.map((d) => sessionsByDay[d] ?? 0))

  // This week vs last week
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const thisWeek = allSessions.filter(
    (s) => new Date(s.created_at) >= weekAgo,
  ).length
  const lastWeek = allSessions.filter(
    (s) => new Date(s.created_at) >= twoWeeksAgo && new Date(s.created_at) < weekAgo,
  ).length

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Your learning activity and usage across all sessions.</p>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card">
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Sessions
          </p>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            {totalSessions}
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 0' }}>
            {completedSessions} completed
          </p>
        </div>

        <div className="card">
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Watch Time
          </p>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            {formatDuration(totalSeconds)}
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 0' }}>
            across all session recordings
          </p>
        </div>

        <div className="card">
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            This Week
          </p>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            {thisWeek}
          </div>
          <p style={{ fontSize: '0.8125rem', color: thisWeek >= lastWeek ? '#10b981' : '#f59e0b', margin: 'var(--space-2) 0 0' }}>
            {lastWeek > 0
              ? thisWeek >= lastWeek
                ? `↑ up from ${lastWeek} last week`
                : `↓ down from ${lastWeek} last week`
              : lastWeek === 0 && thisWeek > 0
              ? 'first sessions this week'
              : 'no activity last week'}
          </p>
        </div>

        <div className="card">
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Completion Rate
          </p>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            {totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 0' }}>
            {completedSessions}/{totalSessions} sessions
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        {/* Activity bar chart */}
        <div className="card">
          <h3 className="section-title">Sessions — last 30 days</h3>
          {totalSessions === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              No sessions recorded yet.
            </p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px', paddingTop: 'var(--space-2)' }}>
              {last30.map((day) => {
                const count = sessionsByDay[day] ?? 0
                const height = count === 0 ? 4 : Math.max(8, (count / maxBar) * 72)
                const isToday = day === now.toISOString().slice(0, 10)
                return (
                  <div
                    key={day}
                    title={`${day}: ${count} session${count !== 1 ? 's' : ''}`}
                    style={{
                      flex: 1,
                      height: `${height}px`,
                      background: isToday
                        ? 'var(--color-accent)'
                        : count > 0
                        ? 'var(--color-accent-muted, rgba(108,99,255,0.4))'
                        : 'var(--color-surface-raised)',
                      borderRadius: '3px 3px 0 0',
                      minWidth: 0,
                      transition: 'height 0.3s',
                    }}
                  />
                )
              })}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{last30[0]}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Today</span>
          </div>
        </div>

        {/* Sessions by state */}
        <div className="card">
          <h3 className="section-title">By Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {(['COMPLETED', 'RECORDING', 'PROCESSING', 'FAILED'] as const).map((state) => {
              const count = stateCounts[state] ?? 0
              const pct = totalSessions > 0 ? (count / totalSessions) * 100 : 0
              const color =
                state === 'COMPLETED'
                  ? '#10b981'
                  : state === 'RECORDING'
                  ? '#f59e0b'
                  : state === 'FAILED'
                  ? '#ef4444'
                  : 'var(--color-accent)'
              return (
                <div key={state}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                      {state.charAt(0) + state.slice(1).toLowerCase()}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{count}</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--color-surface-raised)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {totalSessions === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>📊</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--color-text-primary)', margin: '0 0 var(--space-2)' }}>
            No data yet
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Start a recording session with the Clarvo Chrome extension to see your analytics.
          </p>
        </div>
      )}
    </div>
  )
}
