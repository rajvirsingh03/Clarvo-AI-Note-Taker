/**
 * Auth Bridge Content Script — Clarvo AI
 *
 * Runs on the Clarvo web app pages. Reads the Supabase session from the
 * page's localStorage (which content scripts can access directly) and
 * mirrors access_token + refresh_token into chrome.storage.local so the
 * extension popup and background SW can use them without a separate login.
 *
 * Flow:
 *   1. User signs in on the web app → Supabase writes session to page localStorage
 *   2. This script detects it (on load + via Window storage event)
 *   3. Tokens are written to chrome.storage.local under clarvoAuthToken / clarvoRefreshToken
 *   4. Extension popup → bootstrapAuth() → supabase.auth.setSession() → ✅ signed in
 */

import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: [
    'http://localhost:3000/*',
    'https://clarvo.ai/*',
    'https://www.clarvo.ai/*',
    'https://app.clarvo.ai/*',
  ],
  run_at: 'document_idle',
  all_frames: false,
}

const ACCESS_KEY  = 'clarvoAuthToken'
const REFRESH_KEY = 'clarvoRefreshToken'
const USER_KEY    = 'clarvoUser'

/**
 * Scan window.localStorage for a Supabase auth token
 * (key pattern: sb-<project-ref>-auth-token)
 */
function findSupabaseSession(): { access_token: string; refresh_token: string; user?: { id: string; email?: string } } | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw) as { access_token?: unknown; refresh_token?: unknown; user?: { id: string; email?: string } }
        if (typeof parsed?.access_token === 'string') {
          return {
            access_token:  parsed.access_token,
            refresh_token: typeof parsed.refresh_token === 'string' ? parsed.refresh_token : '',
            user:          parsed.user,
          }
        }
      }
    }
  } catch {
    // localStorage may be inaccessible (should not happen for content scripts)
  }
  return null
}

function syncToExtension(): void {
  const session = findSupabaseSession()
  if (session) {
    chrome.storage.local.set({
      [ACCESS_KEY]: session.access_token,
      [REFRESH_KEY]: session.refresh_token,
      [USER_KEY]: {
        id:    session.user?.id    ?? '',
        email: session.user?.email ?? '',
      },
    })
    console.debug('[Clarvo authBridge] Session synced to extension storage.')
  } else {
    // User signed out — clear extension storage too
    chrome.storage.local.remove([ACCESS_KEY, REFRESH_KEY, USER_KEY])
    console.debug('[Clarvo authBridge] No session found — cleared extension storage.')
  }
}

// ── Initial sync ─────────────────────────────────────────────────
syncToExtension()

// ── Supabase writes session on SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT ──────
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith('sb-') && e.key?.endsWith('-auth-token')) {
    syncToExtension()
  }
})
