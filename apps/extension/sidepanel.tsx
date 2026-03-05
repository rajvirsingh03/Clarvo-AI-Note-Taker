import { useEffect, useState, useRef, useCallback } from 'react'
import type { ExtensionSessionState, ExtensionMessage, NotesUpdatedPayload, ErrorPayload } from '@clarvo/types'
import './sidepanel.css'

type ErrorState = {
  code: string
  message: string
  recoverable: boolean
} | null

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function SidePanel() {
  const [sessionState, setSessionState] = useState<ExtensionSessionState | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<ErrorState>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isInactive, setIsInactive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const notesEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const WEB_APP_URL = process.env.PLASMO_PUBLIC_WEB_APP_URL ?? 'http://localhost:3000'

  const isRecording = sessionState?.state === 'RECORDING'

  // Session timer — increments every second while recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (!isRecording) setElapsed(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  // Load persisted state on mount
  useEffect(() => {
    chrome.storage.local.get('clarvoSession', (result) => {
      const s = result['clarvoSession'] as ExtensionSessionState | undefined
      if (s) setSessionState(s)
    })
  }, [])

  // Listen for runtime messages from background SW
  useEffect(() => {
    const listener = (msg: ExtensionMessage<unknown>) => {
      if (!msg?.type) return

      switch (msg.type) {
        case 'SESSION_STATE_CHANGED':
          chrome.storage.local.get('clarvoSession', (r) => {
            setSessionState(r['clarvoSession'] ?? null)
          })
          break

        case 'NOTES_UPDATED': {
          const p = msg.payload as NotesUpdatedPayload
          setNotes((prev) => (prev ? `${prev}\n\n───\n\n${p.appendedNotes}` : p.appendedNotes))
          setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
          break
        }

        case 'SESSION_COMPLETED':
          setShowExportModal(true)
          break

        case 'INACTIVITY_WARNING':
          setIsInactive(true)
          break

        case 'ERROR': {
          const p = msg.payload as ErrorPayload
          setError(p)
          break
        }
      }
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const handleStop = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'STOP_SESSION', payload: {}, timestamp: Date.now() })
  }, [])

  // Derived video title from session state
  const videoTitle = (sessionState as unknown as Record<string, unknown>)?.videoTitle as string | undefined

  return (
    <div className="side-panel">

      {/* ── Header ── */}
      <header className="sp-header">
        <div className="sp-logo">
          <span className="sp-logo-icon" aria-hidden>⚡</span>
          Clarvo
        </div>

        {isRecording && (
          <div className="sp-rec-badge" aria-live="polite">
            <span className="sp-pulse" aria-hidden />
            REC
          </div>
        )}

        {isRecording && (
          <span className="sp-timer" aria-label="Session elapsed time">
            {formatElapsed(elapsed)}
          </span>
        )}

        {isRecording && (
          <button className="sp-stop-btn" onClick={handleStop} aria-label="Stop session">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
              <rect width="10" height="10" rx="2"/>
            </svg>
            Stop
          </button>
        )}
      </header>

      {/* ── Video context bar ── */}
      {videoTitle && (
        <div className="sp-session-bar">
          <span className="sp-video-label">From</span>
          <span className="sp-video-title" title={videoTitle}>{videoTitle}</span>
        </div>
      )}

      {/* ── Error alert ── */}
      {error && (
        <div className="sp-alert error" role="alert">
          <div className="sp-alert-title">{getErrorTitle(error.code)}</div>
          <p>{error.message}</p>
          {error.recoverable && (
            <button onClick={() => setError(null)} className="sp-dismiss">
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* ── Inactivity warning ── */}
      {isInactive && (
        <div className="sp-alert warning" role="alert">
          <div className="sp-alert-title">Session Paused</div>
          <p>No new audio detected. Resume your video to continue.</p>
          <button onClick={() => setIsInactive(false)} className="sp-dismiss">Got it</button>
        </div>
      )}

      {/* ── Notes canvas ── */}
      <main className="sp-notes" aria-live="polite" aria-label="Live learning notes">

        {/* Idle — no session */}
        {!notes && !isRecording && (
          <div className="sp-empty">
            <div className="sp-empty-glyph" aria-hidden>📋</div>
            <div className="sp-empty-title">No active session</div>
            <p className="sp-empty-body">
              Click <strong>Start Clarvo Copilot</strong> in the toolbar while watching
              a video to begin capturing notes.
            </p>
          </div>
        )}

        {/* Recording — waiting for first notes chunk */}
        {!notes && isRecording && (
          <div className="sp-empty">
            <div className="sp-empty-glyph is-recording" aria-hidden>🎧</div>
            <div className="sp-empty-title">Listening…</div>
            <p className="sp-empty-body">
              Notes will arrive in ~3 minutes.<br />Keep the video playing.
            </p>
            <div className="sp-shimmer" aria-hidden>
              <div className="sp-shimmer-line" style={{ width: '88%' }} />
              <div className="sp-shimmer-line" style={{ width: '73%' }} />
              <div className="sp-shimmer-line" style={{ width: '61%' }} />
            </div>
          </div>
        )}

        {/* Notes content */}
        {notes && (
          <div className="sp-notes-content">
            <pre className="sp-notes-pre">{notes}</pre>
          </div>
        )}

        <div ref={notesEndRef} />
      </main>

      {/* ── Export modal ── */}
      {showExportModal && (
        <div className="sp-export-overlay" role="dialog" aria-modal="true" aria-label="Session complete">
          <div className="sp-export-panel">
            <div className="sp-export-badge">
              <span aria-hidden>✓</span> Session Complete
            </div>
            <h2 className="sp-export-title">Your notes are ready.</h2>
            <p className="sp-export-desc">
              Flashcards, key concepts, and an action plan have been generated
              from this session.
            </p>
            <div className="sp-export-actions">
              <a
                href={`${WEB_APP_URL}/app/sessions`}
                target="_blank"
                rel="noopener noreferrer"
                className="sp-export-btn sp-export-btn-primary"
              >
                Open Dashboard ↗
              </a>
              <button
                className="sp-export-btn sp-export-btn-ghost"
                onClick={() => setShowExportModal(false)}
              >
                Back to Notes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function getErrorTitle(code: string): string {
  const titles: Record<string, string> = {
    DRM_PROTECTED:    'DRM-Protected Content',
    MIC_DENIED:       'Microphone Access Denied',
    NETWORK_ERROR:    'Network Error',
    SESSION_EXPIRED:  'Session Expired',
    INACTIVITY_TIMEOUT: 'Session Paused',
    DEEPGRAM_ERROR:   'Transcription Error',
    AI_API_ERROR:     'AI Processing Error',
    STORAGE_FULL:     'Storage Full',
    UNKNOWN:          'Something went wrong',
  }
  return titles[code] ?? 'Error'
}

export default SidePanel
