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
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}
