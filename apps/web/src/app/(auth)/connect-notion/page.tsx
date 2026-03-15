import type { Metadata } from 'next'
import { ConnectNotionButton } from './ConnectNotionButton'
import { Cards, ChartBar, CheckCircle, NotePencil, Sparkle } from '@phosphor-icons/react'

export const metadata: Metadata = { title: 'Connect Notion — Clarvo AI' }

interface Props {
  searchParams: Promise<{ return_to?: string; session_id?: string; notion_error?: string }>
}

export default async function ConnectNotionPage({ searchParams }: Props) {
  const params = await searchParams
  const returnTo = params.return_to ?? '/app/sessions'
  const hasError = !!params.notion_error

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      background: 'var(--color-base)',
      fontFamily: 'var(--font-body)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(108,99,255,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: 440,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1.375rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
          }}>
            <span style={{
              width: 32, height: 32,
              background: 'var(--color-accent)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Sparkle size={14} weight="fill" color="#fff" /></span>
            Clarvo AI
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem 2rem 2.5rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}>
          {/* Notion icon header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: 64, height: 64,
              background: '#fff',
              borderRadius: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.792 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933l3.222-.187z" fill="#1a1a1a" />
              </svg>
            </div>
            <h1 style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              margin: '0 0 0.5rem',
            }}>
              Connect Notion
            </h1>
            <p style={{
              fontSize: '0.9375rem',
              color: 'var(--color-text-secondary)',
              margin: 0,
              lineHeight: 1.6,
            }}>
              Export your AI-structured learning notes, flashcards, and action plans directly into your Notion workspace.
            </p>
          </div>

          {hasError && (
            <div style={{
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
              color: '#f87171',
            }}>
              Connection failed. Please try again.
            </div>
          )}

          {/* What you get */}
          <ul style={{
            listStyle: 'none',
            margin: '0 0 1.75rem',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
          }}>
            {[
              [ChartBar, 'Auto-create the "Clarvo AI Workspace" database'],
              [NotePencil, 'Export structured notes with inline screenshots'],
              [CheckCircle, 'Action plan as checklist items'],
              [Cards, 'Flashcards as an organized table'],
            ].map(([Icon, label]) => (
              <li key={label} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}><Icon size={16} weight="fill" /></span>
                {label}
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ConnectNotionButton returnTo={returnTo} />
          </div>

          <p style={{
            textAlign: 'center',
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            marginTop: '1.25rem',
            marginBottom: 0,
            opacity: 0.7,
          }}>
            Clarvo will only create and update pages it generates. Your existing Notion content is never modified.
          </p>
        </div>
      </div>
    </div>
  )
}

