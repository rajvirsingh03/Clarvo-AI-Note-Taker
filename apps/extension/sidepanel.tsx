import React, { useEffect, useState, useRef } from 'react'
import type { ExtensionSessionState, ExtensionMessage, NotesUpdatedPayload, ErrorPayload } from '@clarvo/types'
import './style.css'

/**
 * Side-panel Canvas — Clarvo AI's main learning surface.
 *
 * Shows:
 * - Live notes stream (append-only, user-edits protected)
 * - Screenshot thumbnails at their insertion point
 * - Session progress bar
 * - Controls: Stop, Export
 * - Error overlays: DRM, MicDenied, Network, Inactivity
 */

type ErrorState = {
  code: string
  message: string
  recoverable: boolean
} | null

function SidePanel() {
  const [sessionState, setSessionState] = useState<ExtensionSessionState | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<ErrorState>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isInactive, setIsInactive] = useState(false)
  const notesEndRef = useRef<HTMLDivElement>(null)

  const WEB_APP_URL = process.env.PLASMO_PUBLIC_WEB_APP_URL ?? 'http://localhost:3000'

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
          setNotes((prev) => (prev ? `${prev}\n\n${p.appendedNotes}` : p.appendedNotes))
          // Auto-scroll to bottom
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

  const isRecording = sessionState?.state === 'RECORDING'

  return (
    <div className="side-panel">
      {/* Header */}
      <header className="sp-header">
        <div className="sp-logo">⚡ Clarvo AI</div>
        {isRecording && (
          <div className="sp-recording-indicator" aria-live="polite">
            <span className="sp-pulse" aria-hidden /> Recording
          </div>
        )}
        {isRecording && (
          <button
            className="sp-stop-btn"
            onClick={() => chrome.runtime.sendMessage({ type: 'STOP_SESSION', payload: {}, timestamp: Date.now() })}
            aria-label="Stop Clarvo session"
          >
            ⏹ Stop
          </button>
        )}
      </header>

      {/* Error overlay */}
      {error && (
        <div className="sp-error-banner" role="alert">
          <strong>{getErrorTitle(error.code)}</strong>
          <p>{error.message}</p>
          {error.recoverable && (
            <button onClick={() => setError(null)} className="sp-error-dismiss">
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Inactivity warning */}
      {isInactive && (
        <div className="sp-warning-banner" role="alert">
          <p>No activity detected. Session paused.</p>
          <button onClick={() => setIsInactive(false)} className="sp-error-dismiss">OK</button>
        </div>
      )}

      {/* Notes area */}
      <main className="sp-notes" aria-live="polite" aria-label="Live learning notes">
        {!notes && !isRecording && (
          <div className="sp-empty">
            <span aria-hidden className="sp-empty-icon">📝</span>
            <p>Start a session to see your notes here.</p>
          </div>
        )}
        {!notes && isRecording && (
          <div className="sp-empty">
            <span aria-hidden className="sp-empty-icon">🎧</span>
            <p>Listening... Notes will appear every ~3 minutes.</p>
          </div>
        )}
        {notes && (
          <pre className="sp-notes-content">{notes}</pre>
        )}
        <div ref={notesEndRef} />
      </main>

      {/* Export modal */}
      {showExportModal && (
        <div className="sp-export-overlay" role="dialog" aria-modal="true" aria-label="Session complete">
          <div className="sp-export-panel">
            <h2 className="sp-export-title">Session Complete 🎉</h2>
            <p className="sp-export-desc">Your notes, flashcards, and action plan are ready.</p>
            <div className="sp-export-actions">
              <a
                href={`${WEB_APP_URL}/app/sessions`}
                target="_blank"
                rel="noopener noreferrer"
                className="sp-export-btn sp-export-btn-primary"
              >
                View in Dashboard ↗
              </a>
              <button className="sp-export-btn sp-export-btn-ghost" onClick={() => setShowExportModal(false)}>
                Continue Reviewing
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
    DRM_PROTECTED: 'DRM-Protected Content',
    MIC_DENIED: 'Microphone Access Denied',
    NETWORK_ERROR: 'Network Error',
    SESSION_EXPIRED: 'Session Expired',
    INACTIVITY_TIMEOUT: 'Session Paused',
    DEEPGRAM_ERROR: 'Transcription Error',
    AI_API_ERROR: 'AI Processing Error',
    STORAGE_FULL: 'Storage Full',
    UNKNOWN: 'Something went wrong',
  }
  return titles[code] ?? 'Error'
}

export default SidePanel
