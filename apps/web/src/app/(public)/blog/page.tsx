import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from '@/components/phosphor-icons'

export const metadata: Metadata = { title: 'Blog' }

const COMING_SOON_POSTS = [
  {
    tag: 'Product',
    title: 'How Clarvo turns 30 minutes of video into 5 minutes of mastery',
    desc: 'A deep dive into the capture → chunk → extract → structure pipeline we built to replace passive watching with active learning.',
    date: 'Coming soon',
  },
  {
    tag: 'Learning Science',
    title: 'Why spaced repetition beats re-watching every time',
    desc: 'The research behind why auto-generated flashcards from your own sessions are 3× more effective than pre-made decks.',
    date: 'Coming soon',
  },
  {
    tag: 'Engineering',
    title: 'Building a real-time audio pipeline in a Chrome Extension',
    desc: 'How we use the Offscreen API, AudioWorklets, and Deepgram Nova-2 to transcribe your tab audio with near-zero latency.',
    date: 'Coming soon',
  },
]

export default function BlogPage() {
  return (
    <div style={{ background: 'var(--color-base)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        padding: 'clamp(60px,10vw,120px) 1.5rem clamp(48px,6vw,80px)',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <div aria-hidden style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '300px',
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(108,99,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>
            Clarvo Blog
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            letterSpacing: '-0.03em',
            color: 'var(--color-text-primary)',
            lineHeight: 1.1,
            marginBottom: '1rem',
          }}>Thoughts on learning,<br />AI, and focus</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', lineHeight: 1.65 }}>
            Product updates, learning science, and engineering deep-dives from the Clarvo team.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem clamp(80px,10vw,120px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--color-border)' }}>
          {COMING_SOON_POSTS.map((post) => (
            <article
              key={post.title}
              style={{
                padding: 'clamp(1.5rem,3vw,2.25rem) 0',
                borderBottom: '1px solid var(--color-border)',
                display: 'grid',
                gap: '1rem',
                opacity: 0.7,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  display: 'inline-block',
                  background: 'rgba(108,99,255,0.12)',
                  border: '1px solid rgba(108,99,255,0.2)',
                  color: 'var(--color-accent)',
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>{post.tag}</span>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>{post.date}</span>
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                margin: 0,
              }}>{post.title}</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>{post.desc}</p>
            </article>
          ))}
        </div>

        <div style={{
          marginTop: '3rem',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem', lineHeight: 1.65 }}>
            Articles are being written. Get notified when they drop.
          </p>
          <Link href="/login?signup=1" style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'var(--color-accent)',
            color: '#fff',
            padding: '0.75rem 1.75rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}>
            Create a free account <ArrowRight size={14} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  )
}
