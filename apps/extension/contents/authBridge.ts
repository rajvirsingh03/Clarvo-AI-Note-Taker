/**
 * Auth Bridge Content Script — Clarvo AI
 *
 * Runs on the Clarvo web app pages. Calls the `/api/me` endpoint (which reads
 * the Supabase session from httpOnly cookies) and mirrors the tokens into
 * chrome.storage.local so the extension popup/background SW can use them.
 *
 * Flow:
 *   1. User signs in on the web app → Supabase sets session cookies
 *   2. This script calls GET /api/me (cookies are included automatically)
 *   3. access_token + refresh_token written to chrome.storage.local
 *   4. Extension popup → bootstrapAuth() → supabase.auth.setSession() → ✅ signed in
 *
 * Also responds to REQUEST_SESSION messages from the popup so it can
 * proactively pull a fresh session without relying on passive polling.
 */

import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: [
    'http://localhost:3000/*',
    'http://localhost:3001/*',
    'http://localhost:3002/*',
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
 * Call the /api/me endpoint on the web app to get the current user's
 * session tokens. Because this content script runs on clarvo.ai pages,
 * the browser automatically includes the Supabase session cookies.
 */
async function fetchSession(): Promise<RawSession | null> {
  try {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.access_token) {
      return {
        access_token:  data.access_token,
        refresh_token: data.refresh_token ?? '',
        user:          data.user,
      }
    }
  } catch {
    // Network or parsing error — page probably not ready yet
  }
  return null
}

/**
 * Fallback: scan cookies directly for a Supabase auth-token cookie.
 * This works when @supabase/ssr stores the session in non-httpOnly cookies.
 */
function findSupabaseSessionFromCookies(): RawSession | null {
  try {
    const cookies = document.cookie.split(';').map((c) => c.trim())

    // Look for sb-<ref>-auth-token (non-chunked)
    for (const cookie of cookies) {
      const eqIdx = cookie.indexOf('=')
      if (eqIdx === -1) continue
      const name = cookie.substring(0, eqIdx)
      if (name.startsWith('sb-') && name.endsWith('-auth-token')) {
        const value = decodeURIComponent(cookie.substring(eqIdx + 1))
        const parsed = JSON.parse(value)
        if (parsed?.access_token) {
          return {
            access_token:  parsed.access_token,
            refresh_token: parsed.refresh_token ?? '',
            user:          parsed.user,
          }
        }
      }
    }

    // Look for chunked cookies: sb-<ref>-auth-token.0, .1, .2 …
    const chunkPrefix = cookies
      .map((c) => c.split('=')[0])
      .filter((n): n is string => n !== undefined)
      .find((n) => n.startsWith('sb-') && n.includes('-auth-token.0'))
      ?.replace('.0', '')
    if (chunkPrefix) {
      const chunks: string[] = []
      for (let i = 0; ; i++) {
        const chunk = cookies.find((c) => c.startsWith(`${chunkPrefix}.${i}=`))
        if (!chunk) break
        chunks.push(decodeURIComponent(chunk.substring(chunk.indexOf('=') + 1)))
      }
      if (chunks.length > 0) {
        const parsed = JSON.parse(chunks.join(''))
        if (parsed?.access_token) {
          return {
            access_token:  parsed.access_token,
            refresh_token: parsed.refresh_token ?? '',
            user:          parsed.user,
          }
        }
      }
    }
  } catch {
    // Cookie parsing failed
  }
  return null
}

/**
 * Fallback: scan localStorage (dev mode where vanilla @supabase/supabase-js is used)
 */
function findSupabaseSessionFromLocalStorage(): RawSession | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw)
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

// ── Main sync function ───────────────────────────────────────────────────────
let lastToken = ''

async function syncAuth(): Promise<RawSession | null> {
  // 1. Try /api/me (most reliable — validates session server-side)
  let session = await fetchSession()

  // 2. Fallback: read cookies directly
  if (!session) session = findSupabaseSessionFromCookies()

  // 3. Fallback: localStorage (dev mode)
  if (!session) session = findSupabaseSessionFromLocalStorage()

  const token = session?.access_token ?? ''
  if (token !== lastToken) {
    lastToken = token
    syncToExtension(session)
  }
  return session
}

// ── Initial sync when content script loads ───────────────────────────────────
syncAuth()

// ── Poll for auth changes every 5 seconds ────────────────────────────────────
const authPoller = setInterval(() => { syncAuth() }, 5000)

window.addEventListener('beforeunload', () => clearInterval(authPoller))

// ── Respond to REQUEST_SESSION from popup / background SW ────────────────────
chrome.runtime.onMessage.addListener((msg: { type?: string }, _sender, sendResponse) => {
  if (msg?.type === 'REQUEST_SESSION') {
    syncAuth().then((s) => {
      sendResponse({
        ok:            !!s,
        access_token:  s?.access_token  ?? null,
        refresh_token: s?.refresh_token ?? null,
        user:          s?.user          ?? null,
      })
    })
    return true  // Keep channel open for async response
  }
})

