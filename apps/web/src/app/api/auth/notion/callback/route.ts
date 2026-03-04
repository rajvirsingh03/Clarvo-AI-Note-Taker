import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Notion OAuth callback — exchanges the temporary code for an access token
 * and stores it encrypted in the user's profile.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/connect-notion?error=${error}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/connect-notion?error=no_code`)
  }

  try {
    // Exchange code for access token
    const credentials = Buffer.from(
      `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
    ).toString('base64')

    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.NOTION_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Notion token exchange failed: ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json()

    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${origin}/login?next=/connect-notion`)
    }

    // Store Notion credentials in user profile
    await supabase
      .from('users')
      .update({
        notion_access_token: tokenData.access_token,
        notion_workspace_id: tokenData.workspace_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    return NextResponse.redirect(`${origin}/app/settings?notion=connected`)
  } catch (err) {
    console.error('[/api/auth/notion/callback]', err)
    return NextResponse.redirect(`${origin}/connect-notion?error=exchange_failed`)
  }
}
