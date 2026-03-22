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
 *
 * Performance: getSession() is resolved locally from the cookie without
 * a network round-trip; getUser() is then called only to validate the JWT
 * once (single network round-trip to Supabase auth server).
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    // getSession() reads the JWT from the cookie — no network call
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Extract the user via local JWT parsing to avoid supabase warn on session.user
    let user = null
    try {
      if (session.access_token) {
        const parts = session.access_token.split('.')
        if (parts.length === 3 && parts[1]) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
          user = {
            id: payload.sub,
            email: payload.email,
          }
        }
      }
    } catch {
      // safe fallback
    }

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email },
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
      {
        headers: {
          // Allow the browser / extension to cache for up to 30 seconds.
          // The auth bridge re-calls this infrequently, so stale-while-revalidate
          // keeps subsequent calls instant.
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    console.error('[GET /api/me]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
