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
    // Step 1: ask all open web-app tabs to sync their session immediately.
    // We match multiple localhost ports for dev (Next.js sometimes picks 3001).
    const WEB_ORIGINS = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://clarvo.ai',
      'https://www.clarvo.ai',
      'https://app.clarvo.ai',
    ]
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id && tab.url && WEB_ORIGINS.some((o) => tab.url!.startsWith(o))) {
          chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_SESSION' }).catch(() => {
            // Tab may not have authBridge yet — ignore
          })
        }
      }
    })

    // Step 2: bootstrap from storage, with a retry after 1.5 s in case the
    // authBridge content script hasn't synced yet (e.g. user just signed in).
    const tryBootstrap = async () => {
      const s = await bootstrapAuth()
      if (s) {
        setSession(s)
        setAuthState('signed-in')
        return true
      }
      return false
    }

    tryBootstrap().then((ok) => {
      if (ok) return
      // Not found on first try — show signed-out immediately but retry once
      setAuthState('signed-out')
      setTimeout(() => {
        tryBootstrap().then((ok2) => {
          if (!ok2) setAuthState('signed-out')
        })
      }, 1500)
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

  const handleOpenSidePanel = useCallback(() => {
    chrome.windows.getCurrent((win) => {
      if (win.id !== undefined) {
        chrome.sidePanel.open({ windowId: win.id })
        window.close()
      }
    })
  }, [])

  const isRecording = sessionState?.state === 'RECORDING'
  const isDone = sessionState?.state === 'COMPLETED' || sessionState?.state === 'POST_PROCESSING'

  return (
    <div className="clarvo-popup">
      {/* ── Header ── */}
      <header className="popup-header">
        <div className="popup-logo">
          <div className="popup-logo-icon" aria-hidden>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
              <path d="M7.5 1L2 7.5h4.5L5 12l6.5-7H7L7.5 1Z" fill="#a78bfa" stroke="#a78bfa" strokeWidth="0.5" strokeLinejoin="round"/>
            </svg>
          </div>
          Clarvo AI
        </div>

        {authState === 'loading' && (
          <span className="popup-status idle" aria-live="polite">
            <span className="load-dot" /><span className="load-dot" /><span className="load-dot" />
          </span>
        )}
        {authState === 'signed-in' && isRecording && (
          <span className="popup-status recording" aria-live="polite">
            <span className="rec-dot" aria-hidden />
            Live
          </span>
        )}
        {authState === 'signed-in' && isDone && (
          <span className="popup-status done">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
              <path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Done
          </span>
        )}
      </header>

      {/* ── Content ── */}
      <main className="popup-content">
        {/* Loading */}
        {authState === 'loading' && (
          <div className="popup-loading">
            <div className="popup-spinner" aria-hidden />
            <p className="popup-hint">Starting up…</p>
          </div>
        )}

        {/* Signed out */}
        {authState === 'signed-out' && (
          <div className="popup-idle">
            <div className="popup-idle-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <p className="popup-hint">
              Sign in to start capturing notes from videos.
            </p>
            <button className="popup-btn popup-btn-primary" onClick={handleSignIn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Sign In to Clarvo
            </button>
          </div>
        )}

        {/* Signed in — recording */}
        {authState === 'signed-in' && isRecording && (
          <div className="popup-recording">
            <div className="popup-recording-info">
              <p className="popup-session-label">Now recording</p>
              <p className="popup-session-title" title={sessionState?.videoTitle ?? ''}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{flexShrink: 0, opacity: 0.5}}>
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                {sessionState?.videoTitle ?? 'Detecting video…'}
              </p>
            </div>
            <button className="popup-btn popup-btn-stop" onClick={handleStop} aria-label="Stop Clarvo session">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                <rect x="1.5" y="1.5" width="9" height="9" rx="2" />
              </svg>
              Stop Session
            </button>
          </div>
        )}

        {/* Signed in — done */}
        {authState === 'signed-in' && isDone && (
          <div className="popup-idle">
            <div className="popup-idle-icon popup-idle-icon--green" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <p className="popup-hint">Session complete! Open the dashboard to view your notes.</p>
            <a
              href={`${WEB_APP_URL}/app`}
              target="_blank"
              rel="noopener noreferrer"
              className="popup-btn popup-btn-outline"
            >
              View Notes
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        )}

        {/* Signed in — idle */}
        {authState === 'signed-in' && !isRecording && !isDone && (
          <div className="popup-idle">
            <div className="popup-idle-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <p className="popup-hint">
              Navigate to a video, then open the
              <strong> Side Panel</strong> to start capturing.
            </p>
            <button className="popup-btn popup-btn-primary" onClick={handleOpenSidePanel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
              Open Side Panel
            </button>
            {session?.user?.email && (
              <p className="popup-email">{session.user.email}</p>
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
              Open Dashboard
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </a>
            <button
              onClick={handleSignOut}
              className="popup-footer-link"
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
