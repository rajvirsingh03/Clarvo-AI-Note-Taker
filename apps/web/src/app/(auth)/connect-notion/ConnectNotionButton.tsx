'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Props {
  returnTo: string
}

export function ConnectNotionButton({ returnTo }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setLoading(true)
    setError(null)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const callbackUrl = `${window.location.origin}/api/auth/notion-callback?return_to=${encodeURIComponent(returnTo)}`

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'notion',
      options: {
        redirectTo: callbackUrl,
        scopes: 'read_user,insert_content,read_content',
      },
    })

    if (oauthError) {
      console.error('Notion OAuth error:', oauthError)
      setError('Failed to start Notion sign-in. Please try again.')
      setLoading(false)
    }
    // On success, browser is redirected to Notion — no further action needed here
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          background: loading ? 'rgba(255,255,255,0.05)' : '#fff',
          color: '#1a1a1a',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: '10px',
          padding: '0.875rem 1.75rem',
          fontSize: '0.9375rem',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          fontFamily: 'var(--font-body)',
          minHeight: '52px',
          transition: 'all 0.15s',
        }}
      >
        {loading ? (
          <>
            <span style={{
              width: 18, height: 18,
              border: '2px solid rgba(26,26,26,0.2)',
              borderTopColor: '#1a1a1a',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.8s linear infinite',
            }} />
            Connecting…
          </>
        ) : (
          <>
            {/* Notion icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.792 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933l3.222-.187z" fill="#1a1a1a" />
            </svg>
            Sign in with Notion
          </>
        )}
      </button>
      {error && (
        <p style={{ color: '#f87171', fontSize: '0.875rem', marginTop: '0.75rem' }}>{error}</p>
      )}
    </div>
  )
}
