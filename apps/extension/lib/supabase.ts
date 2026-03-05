/**
 * Supabase client for the Clarvo extension popup.
 * Uses @supabase/supabase-js with localStorage (available in popup/sidepanel pages).
 *
 * Token bridging:
 *   - On SIGNED_IN: writes access_token to chrome.storage.local['clarvoAuthToken']
 *   - On SIGNED_OUT / TOKEN_REFRESHED: updates accordingly
 *   - Background SW reads from chrome.storage.local so it gets a fresh token
 */

import { createClient, type Session } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.PLASMO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY!

export const AUTH_TOKEN_KEY   = 'clarvoAuthToken'
export const AUTH_REFRESH_KEY = 'clarvoRefreshToken'
export const AUTH_USER_KEY    = 'clarvoUser'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

/** Write session token into chrome.storage.local so the background SW can use it. */
export async function syncTokenToStorage(session: Session | null): Promise<void> {
  if (session?.access_token) {
    await chrome.storage.local.set({
      [AUTH_TOKEN_KEY]: session.access_token,
      [AUTH_REFRESH_KEY]: session.refresh_token ?? '',
      [AUTH_USER_KEY]: {
        id: session.user.id,
        email: session.user.email,
      },
    })
  } else {
    await chrome.storage.local.remove([AUTH_TOKEN_KEY, AUTH_REFRESH_KEY, AUTH_USER_KEY])
  }
}

/** Bootstrap: get current session and sync it. Returns the session or null.
 *
 * Two-phase strategy:
 *  1. Check Supabase native session in the popup's own localStorage.
 *  2. If missing, try to restore from chrome.storage.local tokens synced
 *     by the authBridge content script running on the web app tab.
 */
export async function bootstrapAuth(): Promise<Session | null> {
  // Phase 1: native session (will exist if popup already called setSession before)
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    await syncTokenToStorage(data.session)
    return data.session
  }

  // Phase 2: restore from tokens synced by authBridge content script
  const stored = await chrome.storage.local.get([AUTH_TOKEN_KEY, AUTH_REFRESH_KEY])
  const accessToken  = stored[AUTH_TOKEN_KEY]  as string | undefined
  const refreshToken = stored[AUTH_REFRESH_KEY] as string | undefined

  if (accessToken && refreshToken) {
    const { data: restored, error } = await supabase.auth.setSession({
      access_token:  accessToken,
      refresh_token: refreshToken,
    })
    if (!error && restored.session) {
      await syncTokenToStorage(restored.session)
      return restored.session
    }
  }

  return null
}
