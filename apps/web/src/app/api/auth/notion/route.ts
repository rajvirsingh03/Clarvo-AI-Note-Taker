import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * GET /api/auth/notion
 *
 * Initiates the Notion OAuth flow by redirecting the user to Notion's
 * authorization page. Requires the user to be authenticated.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=/app/settings`)
  }

  const clientId = process.env.NOTION_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${origin}/app/settings?error=notion_not_configured`)
  }

  const redirectUri = `${origin}/api/auth/notion/callback`
  const authorizeUrl = new URL('https://api.notion.com/v1/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', clientId)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('owner', 'user')
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)

  return NextResponse.redirect(authorizeUrl.toString())
}
