import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * GET /api/me
 *
 * Returns the current authenticated user and session tokens.
 * Used by the Chrome extension's authBridge content script to bridge
 * the web app's cookie-based session into chrome.storage.local.
 *
 * The content script runs on clarvo.ai pages so browser cookies are
 * included automatically — no Authorization header needed.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    // Validate the session (checks JWT signature + expiry)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Retrieve the raw session tokens for the extension
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      access_token: session?.access_token ?? null,
      refresh_token: session?.refresh_token ?? null,
    })
  } catch (error) {
    console.error('[GET /api/me]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
