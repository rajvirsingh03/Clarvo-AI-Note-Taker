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
 *   2. This script detects it (on load + via polling every 1.5s)
 *   3. Tokens written to chrome.storage.local under clarvoAuthToken / clarvoRefreshToken
 *   4. Extension popup → bootstrapAuth() → supabase.auth.setSession() → ✅ signed in
 *
 * Also responds to REQUEST_SESSION messages from the popup so it can
 * proactively pull a fresh session without relying on passive storage events.
 *
 * NOTE: window.addEventListener('storage') does NOT fire for same-tab writes.
 * Supabase writes its session from the same tab, so we poll every 1.5s instead.
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

type RawSession = {
  access_token: string
  refresh_token: string
  user?: { id: string; email?: string }
}

/**
 * Scan window.localStorage for a Supabase auth session.
 * Key pattern: sb-<project-ref>-auth-token
 */
function findSupabaseSession(): RawSession | null {
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
    // localStorage inaccessible
  }
  return null
}

function syncToExtension(session: RawSession | null): void {
  if (session) {
    chrome.storage.local.set({
      [ACCESS_KEY]: session.access_token,
      [REFRESH_KEY]: session.refresh_token,
      [USER_KEY]: { id: session.user?.id ?? '', email: session.user?.email ?? '' },
    })
    console.debug('[Clarvo authBridge] ✅ Session synced.')
  } else {
    chrome.storage.local.remove([ACCESS_KEY, REFRESH_KEY, USER_KEY])
    console.debug('[Clarvo authBridge] ❌ No session — storage cleared.')
  }
}

// ── Initial sync immediately when content script loads ───────────────────────
let lastToken = ''
const initial = findSupabaseSession()
lastToken = initial?.access_token ?? ''
syncToExtension(initial)

// ── Poll for auth state changes every 1.5s ────────────────────────────────────
// Supabase writes to localStorage from the same tab so window.storage event
// never fires for it. Polling is the only reliable way to detect the change.
const authPoller = setInterval(() => {
  const s = findSupabaseSession()
  const token = s?.access_token ?? ''
  if (token !== lastToken) {
    lastToken = token
    syncToExtension(s)
  }
}, 1500)

window.addEventListener('beforeunload', () => clearInterval(authPoller))

// ── Respond to REQUEST_SESSION from popup / background SW ────────────────────
chrome.runtime.onMessage.addListener((msg: { type?: string }, _sender, sendResponse) => {
  if (msg?.type === 'REQUEST_SESSION') {
    const s = findSupabaseSession()
    syncToExtension(s)
    sendResponse({
      ok:            !!s,
      access_token:  s?.access_token  ?? null,
      refresh_token: s?.refresh_token ?? null,
      user:          s?.user          ?? null,
    })
    return true
  }
})

