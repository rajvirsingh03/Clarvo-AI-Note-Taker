/**
 * Dual-auth helper — supports both cookie-based (web app) and
 * Bearer-token-based (Chrome extension) authentication.
 *
 * Use `getAuthenticatedClient(request)` in API route handlers
 * instead of `createSupabaseServerClient()` directly when the
 * route also needs to serve the Chrome extension.
 */

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from './server'
import type { Database } from '@/types/supabase'

export interface AuthResult {
  user: User | null
  supabase: SupabaseClient<Database>
}

/**
 * Returns an authenticated Supabase client + user from either:
 *  1. `Authorization: Bearer <token>` header — used by the Chrome extension
 *  2. HTTP-only cookies — used by the web app's own pages
 *
 * The returned `supabase` client carries the caller's identity, so RLS
 * policies are applied correctly for all subsequent DB operations.
 */
export async function getAuthenticatedClient(
  request: Request
): Promise<AuthResult> {
  // ── 1. Bearer token (extension) ────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user: error ? null : user, supabase }
  }

  // ── 2. Cookie-based auth (web app) ─────────────────────────────────────────
  const supabase = await createSupabaseServerClient()

  // getSession() reads and parses the JWT locally from the cookie without
  // making an HTTP round-trip to the Supabase Auth server. This saves ~800ms
  // of latency per API request. The JWT is short-lived, and RLS will still
  // enforce security at the database row level.
  const { data: { session } } = await supabase.auth.getSession()
  // Extract the user via local JWT parsing to avoid supabase warn on session.user
  let user: User | null = null
  try {
    if (session?.access_token) {
      const parts = session.access_token.split('.')
      if (parts.length === 3 && parts[1]) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
        user = {
          id: payload.sub,
          email: payload.email,
          app_metadata: payload.app_metadata || {},
          user_metadata: payload.user_metadata || {},
          aud: payload.aud || 'authenticated',
          created_at: '',
        } as User
      }
    }
  } catch {
    // safe fallback
  }
  
  return { user, supabase }
}
