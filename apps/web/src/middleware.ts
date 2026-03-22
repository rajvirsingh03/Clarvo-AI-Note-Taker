import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required for Server Components.
  // Use getSession() first (local cookie read, no network call) to determine if
  // a refresh is needed, then only call getUser() to validate when there IS a
  // session. This avoids a full network round-trip for unauthenticated requests.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Only validate with the Supabase server when there is an existing session
  // token that needs to be verified. For unauthenticated pages this saves a
  // network round-trip entirely.
  let user = session?.user ?? null
  if (session) {
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  // Protect /app/** routes
  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from /login
  if (user && request.nextUrl.pathname === '/login') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/app'
    redirectUrl.searchParams.delete('next')
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico and image assets
     * - /api/** routes — API routes perform their own authentication via
     *   getAuthenticatedClient(); running middleware auth on top doubles the
     *   Supabase network calls per API request.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
