'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Props {
  sessionId: string
  sessionTitle: string
  videoUrl?: string | null
}

type NotionStatus = 'loading' | 'connected' | 'not_connected'
type ExportStatus = 'idle' | 'exporting' | 'success' | 'error'

// ── Small modal ───────────────────────────────────────────────────────────────
interface ModalProps {
  onClose: () => void
  onExport: (meta: { course: string; module: string; lesson: string }) => void
  loading: boolean
  sessionTitle: string
  prefilledCourse?: string
  prefilledLesson?: string
}

function ExportModal({ onClose, onExport, loading, sessionTitle, prefilledCourse, prefilledLesson }: ModalProps) {
  const [course, setCourse] = useState(prefilledCourse ?? '')
  const [mod, setMod] = useState('')
  const [lesson, setLesson] = useState(prefilledLesson ?? '')

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        width: '100%', maxWidth: 440,
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{
              fontSize: '1.125rem', fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              margin: '0 0 0.25rem',
            }}>
              Export to Notion
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              {sessionTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '2px',
              color: 'var(--color-text-secondary)', fontSize: '1.25rem', lineHeight: 1,
            }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem' }}>
          <p style={{
            fontSize: '0.8125rem', color: 'var(--color-text-secondary)',
            margin: 0, background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)', borderRadius: 8,
            padding: '0.625rem 0.875rem',
          }}>
            <span style={{ fontWeight: 600 }}>Optional:</span> Add organization fields to group sessions in your &ldquo;Clarvo AI Workspace&rdquo; database.
          </p>

          {[
            { label: 'Course', value: course, onChange: setCourse, placeholder: 'e.g. Machine Learning Fundamentals' },
            { label: 'Module', value: mod, onChange: setMod, placeholder: 'e.g. Module 3 — Neural Networks' },
            { label: 'Lesson', value: lesson, onChange: setLesson, placeholder: 'e.g. Backpropagation' },
          ].map(({ label, value, onChange, placeholder }) => (
            <div key={label}>
              <label style={{
                display: 'block', fontSize: '0.8125rem', fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {label}
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8, padding: '0.625rem 0.875rem',
                  fontSize: '0.9375rem', color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-body)', outline: 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: '0 0 auto',
              padding: '0.625rem 1.25rem', borderRadius: 8,
              background: 'none', border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)', fontSize: '0.9375rem',
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onExport({ course, module: mod, lesson })}
            disabled={loading}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', borderRadius: 8,
              background: loading ? 'rgba(108,99,255,0.5)' : 'var(--color-accent)',
              border: 'none', color: '#fff',
              fontSize: '0.9375rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 16, height: 16,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                  display: 'inline-block', flexShrink: 0,
                }} />
                Exporting…
              </>
            ) : (
              'Export to Notion'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ExportToNotionButton({ sessionId, sessionTitle, videoUrl }: Props) {
  const [notionStatus, setNotionStatus] = useState<NotionStatus>('loading')
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')
  const [showModal, setShowModal] = useState(false)
  const [notionUrl, setNotionUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ── Check Notion connection ─────────────────────────────────────────────────
  const checkNotion = useCallback(async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setNotionStatus('not_connected'); return }

    const { data: profile } = await supabase
      .from('users')
      .select('notion_access_token')
      .eq('id', user.id)
      .single()

    setNotionStatus(profile?.notion_access_token ? 'connected' : 'not_connected')
  }, [])

  useEffect(() => {
    checkNotion()
  }, [checkNotion])

  // Re-check after returning from OAuth connecting Notion
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('notion_connected') === '1') {
      setNotionStatus('connected')
      // Clean the URL param
      const url = new URL(window.location.href)
      url.searchParams.delete('notion_connected')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // ── Try to auto-detect course/lesson from URL ───────────────────────────────
  function parseMetaFromUrl(url: string): { course?: string; lesson?: string } {
    try {
      const parsed = new URL(url)
      // Coursera: /learn/<course-slug>/lecture/<id>/<lesson-slug>
      const courseraMatch = parsed.pathname.match(/\/learn\/([^/]+)/)
      const lessonMatch = parsed.pathname.match(/\/(?:lecture|item)\/[^/]+\/([^/]+)/)
      if (courseraMatch || lessonMatch) {
        return {
          course: courseraMatch?.[1]?.replace(/-/g, ' '),
          lesson: lessonMatch?.[1]?.replace(/-/g, ' '),
        }
      }
      // YouTube: no course metadata in URL
    } catch {
      // invalid URL
    }
    return {}
  }

  // ── Handle button click ─────────────────────────────────────────────────────
  function handleClick() {
    if (notionStatus === 'not_connected') {
      const returnTo = encodeURIComponent(window.location.pathname)
      window.location.href = `/connect-notion?return_to=${returnTo}`
      return
    }
    if (notionStatus === 'connected') {
      setShowModal(true)
    }
  }

  // ── Handle export ───────────────────────────────────────────────────────────
  async function handleExport(meta: { course: string; module: string; lesson: string }) {
    setExportStatus('exporting')
    setErrorMsg(null)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setExportStatus('error')
      setErrorMsg('Not authenticated. Please sign in again.')
      return
    }

    const res = await fetch('/api/export/notion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        sessionId,
        course: meta.course || undefined,
        module: meta.module || undefined,
        lesson: meta.lesson || undefined,
      }),
    })

    const data = await res.json() as { success?: boolean; notionPageUrl?: string; error?: string; notionRequired?: boolean }

    if (!res.ok || !data.success) {
      if (data.notionRequired) {
        setNotionStatus('not_connected')
        setShowModal(false)
      } else {
        setExportStatus('error')
        setErrorMsg(data.error ?? 'Export failed. Please try again.')
      }
      return
    }

    setExportStatus('success')
    setNotionUrl(data.notionPageUrl ?? null)
    setShowModal(false)

    // Auto-open Notion page
    if (data.notionPageUrl) {
      window.open(data.notionPageUrl, '_blank', 'noopener,noreferrer')
    }
  }

  // Reset after success/error
  function handleReset() {
    setExportStatus('idle')
    setErrorMsg(null)
    setNotionUrl(null)
  }

  const detected = videoUrl ? parseMetaFromUrl(videoUrl) : {}

  // ── Render ─────────────────────────────────────────────────────────────────
  const isLoading = notionStatus === 'loading'

  if (exportStatus === 'success') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.875rem', color: '#4ade80', fontWeight: 600 }}>✓ Exported!</span>
        {notionUrl && (
          <a
            href={notionUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '0.875rem', color: 'var(--color-accent)',
              textDecoration: 'none', fontWeight: 600,
            }}
          >
            Open in Notion ↗
          </a>
        )}
        <button
          onClick={handleReset}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.875rem', color: 'var(--color-text-secondary)',
            padding: '0 4px',
          }}
        >
          Re-export
        </button>
      </div>
    )
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', alignItems: 'flex-end' }}>
        <button
          className="btn btn-secondary"
          style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          onClick={handleClick}
          disabled={isLoading || exportStatus === 'exporting'}
          title={
            notionStatus === 'not_connected'
              ? 'Connect Notion to export'
              : 'Export to Notion'
          }
        >
          {isLoading ? (
            <>
              <span style={{
                width: 14, height: 14,
                border: '1.5px solid var(--color-border)',
                borderTopColor: 'var(--color-text-secondary)',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
                display: 'inline-block',
              }} />
              Checking Notion…
            </>
          ) : notionStatus === 'not_connected' ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.792 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933l3.222-.187z" fill="currentColor" />
              </svg>
              Sign in with Notion
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.792 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933l3.222-.187z" fill="currentColor" />
              </svg>
              Export to Notion
            </>
          )}
        </button>

        {errorMsg && (
          <p style={{ fontSize: '0.8125rem', color: '#f87171', margin: 0, textAlign: 'right', maxWidth: 240 }}>
            {errorMsg}
          </p>
        )}
      </div>

      {showModal && (
        <ExportModal
          onClose={() => setShowModal(false)}
          onExport={handleExport}
          loading={exportStatus === 'exporting'}
          sessionTitle={sessionTitle}
          prefilledCourse={detected.course}
          prefilledLesson={detected.lesson}
        />
      )}
    </>
  )
}
