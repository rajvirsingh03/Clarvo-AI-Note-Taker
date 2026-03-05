import { useEffect, useState, useCallback } from 'react'
import type { ExtensionSessionState } from '@clarvo/types'
import { supabase, bootstrapAuth, syncTokenToStorage, AUTH_TOKEN_KEY } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import './style.css'

type AuthState = 'loading' | 'signed-out' | 'signed-in'

function Popup() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [sessionState, setSessionState] = useState<ExtensionSessionState | null>(null)

  const WEB_APP_URL = process.env.PLASMO_PUBLIC_WEB_APP_URL ?? 'http://localhost:3000'

  // ── Auth bootstrap ──────────────────────────────────────
  useEffect(() => {
    // Step 1: ask all open web-app tabs to sync their session immediately
    // (authBridge.ts runs on these tabs and responds to REQUEST_SESSION)
    const WEB_ORIGINS = ['http://localhost:3000', 'https://clarvo.ai', 'https://app.clarvo.ai']
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id && tab.url && WEB_ORIGINS.some((o) => tab.url!.startsWith(o))) {
          chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_SESSION' }).catch(() => {
            // Tab may not have authBridge yet — ignore
          })
        }
      }
    })

    // Step 2: bootstrap from storage (works after authBridge has synced at least once)
    bootstrapAuth().then((s) => {
      setSession(s)
      setAuthState(s ? 'signed-in' : 'signed-out')
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      await syncTokenToStorage(s)
      setSession(s)
      setAuthState(s ? 'signed-in' : 'signed-out')
      if (!s) {
        setSessionState(null)
        await chrome.storage.local.remove('clarvoSession')
      }
    })

    // Step 3: listen for authBridge writing tokens into chrome.storage
    // (fires when user signs in on the web app while popup is open)
    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== 'local') return
      if (AUTH_TOKEN_KEY in changes) {
        const newToken = changes[AUTH_TOKEN_KEY]?.newValue as string | undefined
        if (newToken) {
          bootstrapAuth().then((s) => {
            setSession(s)
            setAuthState(s ? 'signed-in' : 'signed-out')
          })
        } else {
          setSession(null)
          setAuthState('signed-out')
          setSessionState(null)
        }
      }
    }
    chrome.storage.onChanged.addListener(onStorageChanged)

    return () => {
      listener.subscription.unsubscribe()
      chrome.storage.onChanged.removeListener(onStorageChanged)
    }
  }, [])

  // ── Extension session state ─────────────────────────────
  useEffect(() => {
    if (authState !== 'signed-in') return

    chrome.storage.local.get('clarvoSession', (result) => {
      setSessionState(result['clarvoSession'] ?? null)
    })

    const onChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes['clarvoSession']) {
        setSessionState(changes['clarvoSession'].newValue ?? null)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [authState])

  const handleSignIn = useCallback(() => {
    chrome.tabs.create({ url: `${WEB_APP_URL}/login` })
  }, [WEB_APP_URL])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const handleStop = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'STOP_SESSION', payload: {}, timestamp: Date.now() })
  }, [])

  const isRecording = sessionState?.state === 'RECORDING'
  const isDone = sessionState?.state === 'COMPLETED' || sessionState?.state === 'POST_PROCESSING'

  return (
    <div className="clarvo-popup">
      {/* ── Header ── */}
      <header className="popup-header">
        <div className="popup-logo">
          <div className="popup-logo-icon" aria-hidden>⚡</div>
          Clarvo AI
        </div>

        {authState === 'signed-in' && isRecording && (
          <span className="popup-status recording" aria-live="polite">
            <span className="rec-dot" aria-hidden />
            Live
          </span>
        )}
        {authState === 'signed-in' && isDone && (
          <span className="popup-status done">Done</span>
        )}
      </header>

      {/* ── Content ── */}
      <main className="popup-content">
        {/* Loading */}
        {authState === 'loading' && (
          <p className="popup-hint" style={{ textAlign: 'center', padding: '8px 0' }}>Loading…</p>
        )}

        {/* Signed out */}
        {authState === 'signed-out' && (
          <div className="popup-idle">
            <div className="popup-idle-icon" aria-hidden>🔐</div>
            <p className="popup-hint" style={{ marginBottom: '12px' }}>
              Sign in to start capturing notes from videos.
            </p>
            <button className="popup-btn popup-btn-primary" onClick={handleSignIn}>
              Sign In to Clarvo
            </button>
          </div>
        )}

        {/* Signed in — recording */}
        {authState === 'signed-in' && isRecording && (
          <div className="popup-recording">
            {sessionState?.videoTitle && (
              <div>
                <p className="popup-session-label">Now recording</p>
                <p className="popup-session-title" title={sessionState.videoTitle}>
                  {sessionState.videoTitle}
                </p>
              </div>
            )}
            <button className="popup-btn popup-btn-stop" onClick={handleStop} aria-label="Stop Clarvo session">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                <rect x="1" y="1" width="10" height="10" rx="2" />
              </svg>
              Stop Session
            </button>
          </div>
        )}

        {/* Signed in — done */}
        {authState === 'signed-in' && isDone && (
          <div className="popup-idle">
            <div className="popup-idle-icon" aria-hidden>✅</div>
            <p className="popup-hint">Session complete! Open the dashboard to view your notes.</p>
          </div>
        )}

        {/* Signed in — idle */}
        {authState === 'signed-in' && !isRecording && !isDone && (
          <div className="popup-idle">
            <div className="popup-idle-icon" aria-hidden>🎧</div>
            <p className="popup-hint">
              Navigate to any video and click<br />
              <strong>"Start Clarvo Copilot"</strong> to begin.
            </p>
            {session?.user?.email && (
              <p className="popup-hint" style={{ opacity: 0.5, fontSize: '10px', marginTop: '6px' }}>
                {session.user.email}
              </p>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="popup-footer">
        {authState === 'signed-in' ? (
          <>
            <a
              href={`${WEB_APP_URL}/app`}
              target="_blank"
              rel="noopener noreferrer"
              className="popup-footer-link"
            >
              Open Dashboard ↗
            </a>
            <button
              onClick={handleSignOut}
              className="popup-footer-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Sign out
            </button>
          </>
        ) : (
          <span className="popup-footer-version">v0.0.1</span>
        )}
      </footer>
    </div>
  )
}

export default Popup
