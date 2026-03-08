import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Client as NotionClient } from '@notionhq/client'

/**
 * Notion OAuth callback — exchanges Supabase code for session and persists
 * the Notion provider_token (API access token) + workspace metadata to the
 * public.users row.
 *
 * Supabase passes: ?code=...&return_to=...
 * After saving the token we redirect the user to `return_to` (defaults to
 * /app/sessions so they can immediately export).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const returnTo = searchParams.get('return_to') ?? '/app/sessions'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=notion_oauth_failed`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error('[notion-callback] exchangeCodeForSession error:', error)
    return NextResponse.redirect(`${origin}/login?error=notion_oauth_failed`)
  }

  const { session } = data
  const notionToken = session.provider_token

  if (!notionToken) {
    // Provider token missing — Notion OAuth may not be configured to return it.
    // Redirect anyway so the user isn't stranded.
    return NextResponse.redirect(`${origin}${returnTo}?notion_error=missing_token`)
  }

  // Extract workspace metadata from Supabase user app_metadata
  const meta = session.user.app_metadata as Record<string, unknown>
  const workspaceId: string | null = (meta['provider_id'] as string | undefined) ?? null

  // Fetch workspace name directly from Notion API using the access token
  let workspaceName: string | null = null
  try {
    const notion = new NotionClient({ auth: notionToken })
    const me = await notion.users.me({}) as { type?: string; bot?: { workspace_name?: string } }
    workspaceName = me.bot?.workspace_name ?? null
  } catch {
    // Non-fatal — workspace name is cosmetic only
  }

  // Persist the Notion token to the user's profile row (service-role not needed
  // because the session is authenticated and RLS allows self-update).
  const { error: updateError } = await supabase
    .from('users')
    .update({
      notion_access_token: notionToken,
      notion_workspace_id: workspaceId,
      notion_workspace_name: workspaceName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.id)

  if (updateError) {
    console.error('[notion-callback] failed to save notion token:', updateError)
  }

  return NextResponse.redirect(`${origin}${returnTo}?notion_connected=1`)
}
