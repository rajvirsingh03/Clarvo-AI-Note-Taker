import { useEffect, useState } from 'react'
import type { ExtensionSessionState } from '@clarvo/types'
import './style.css'

/**
 * Popup toolbar — shows session status, start/stop controls,
 * tier badge, and a link to the web app.
 */
function Popup() {
  const [sessionState, setSessionState] = useState<ExtensionSessionState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const WEB_APP_URL = process.env.PLASMO_PUBLIC_WEB_APP_URL ?? 'http://localhost:3000'

  useEffect(() => {
    chrome.storage.local.get('clarvoSession', (result) => {
      setSessionState(result['clarvoSession'] ?? null)
      setIsLoading(false)
    })

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes['clarvoSession']) {
        setSessionState(changes['clarvoSession'].newValue)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const isRecording = sessionState?.state === 'RECORDING'

  return (
    <div className="clarvo-popup">
      {/* Header */}
      <header className="popup-header">
        <div className="popup-logo">
          <span aria-hidden>⚡</span> Clarvo AI
        </div>
        {sessionState?.state && (
          <span className={`popup-status ${isRecording ? 'status-recording' : 'status-idle'}`}
            aria-live="polite">
            {isRecording ? '● Recording' : sessionState.state}
          </span>
        )}
      </header>

      {/* Content */}
      <main className="popup-content">
        {isLoading ? (
          <p className="popup-hint">Loading...</p>
        ) : isRecording ? (
          <>
            <p className="popup-title" title={sessionState?.videoTitle ?? ''}>
              {sessionState?.videoTitle ?? 'Active session'}
            </p>
            <button
              className="popup-btn popup-btn-danger"
              onClick={() => chrome.runtime.sendMessage({ type: 'STOP_SESSION', payload: {}, timestamp: Date.now() })}
              aria-label="Stop Clarvo session"
            >
              ⏹ Stop Session
            </button>
          </>
        ) : (
          <p className="popup-hint">
            Navigate to any video page and click<br />
            <strong>&ldquo;Start Clarvo Copilot&rdquo;</strong> to begin.
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="popup-footer">
        <a
          href={`${WEB_APP_URL}/app`}
          target="_blank"
          rel="noopener noreferrer"
          className="popup-link"
        >
          Open Dashboard ↗
        </a>
      </footer>
    </div>
  )
}

export default Popup
