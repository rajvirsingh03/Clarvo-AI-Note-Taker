import Link from 'next/link'

const FEATURES = [
  {
    icon: '⚡',
    title: 'Live Transcription',
    desc: 'Word-for-word capture as you watch. Nova-2 model. Zero lag.',
  },
  {
    icon: '🧠',
    title: 'AI Concept Extraction',
    desc: 'Gemini distills raw transcript into structured notes — no fluff.',
  },
  {
    icon: '🃏',
    title: 'Auto Flashcards',
    desc: 'Spaced-repetition cards generated from your session. Study smarter.',
  },
  {
    icon: '📋',
    title: 'Action Plans',
    desc: 'Walk away knowing exactly what to do next. Clarvo maps it out.',
  },
  {
    icon: '📤',
    title: 'Notion Export',
    desc: 'Push your structured notes to any Notion page in one click.',
  },
  {
    icon: '📸',
    title: 'Screenshot Analysis',
    desc: 'Capture frames. Gemini Vision explains diagrams, slides, and charts.',
  },
]

const STEPS = [
  { n: '01', title: 'Install the extension', desc: 'Add Clarvo AI to Chrome. Takes 30 seconds. No account required to start.' },
  { n: '02', title: 'Open any video', desc: 'YouTube, Coursera, Loom, any tab. Click Record and keep watching normally.' },
  { n: '03', title: 'Get your notes', desc: 'When you\'re done, Clarvo delivers structured notes, flashcards, and an action plan automatically.' },
]

export default function HomePage() {
  return (
    <div style={{ background: 'var(--color-base)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section
        aria-label="Hero"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: 'clamp(80px, 14vw, 160px) 1.5rem clamp(80px, 10vw, 120px)',
          textAlign: 'center',
        }}
      >
        {/* Gradient mesh background */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(108,99,255,0.22) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(108,99,255,0.1) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        {/* Grid overlay */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'linear-gradient(rgba(108,99,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(108,99,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
          maskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, black 40%, transparent 100%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(108,99,255,0.12)',
            border: '1px solid rgba(108,99,255,0.3)',
            borderRadius: '9999px',
            padding: '5px 14px',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)',
            marginBottom: '1.75rem',
          }}>
            Now in public beta
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            margin: '0 0 1.5rem',
            background: 'linear-gradient(135deg, #f0f0f5 30%, rgba(108,99,255,0.85) 80%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Learn Smarter<br />from Any Video
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.65,
            maxWidth: '540px',
            margin: '0 auto 2.75rem',
          }}>
            Clarvo AI captures your lectures and video content live — then turns the transcript into structured notes, flashcards, and an action plan. Automatically.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/login?signup=1"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'var(--color-accent)',
                color: '#fff',
                padding: '0.875rem 2rem',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 0 32px rgba(108,99,255,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
            >
              Get started free →
            </Link>
            <a
              href="#how-it-works"
              style={{
                display: 'inline-flex', alignItems: 'center',
                color: 'var(--color-text-secondary)',
                padding: '0.875rem 1.75rem',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                fontSize: '0.95rem',
                fontWeight: 500,
                textDecoration: 'none',
                background: 'var(--color-surface)',
              }}
            >
              See how it works
            </a>
          </div>

          {/* Social proof */}
          <p style={{ marginTop: '2.5rem', color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>
            Free plan • No credit card required • Chrome extension
          </p>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section
        aria-label="Features"
        style={{
          padding: 'clamp(60px,8vw,100px) 1.5rem',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,5vw,64px)' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            letterSpacing: '-0.025em',
            color: 'var(--color-text-primary)',
            marginBottom: '1rem',
          }}>
            Everything you need to learn faster
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto' }}>
            Clarvo runs quietly in the background while you focus on the content.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1px',
          background: 'var(--color-border)',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: 'var(--color-surface)',
                padding: 'clamp(1.5rem, 3vw, 2.25rem)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
                transition: 'background 0.2s',
              }}
            >
              <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{f.icon}</span>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '1.05rem',
                color: 'var(--color-text-primary)',
                margin: 0,
              }}>{f.title}</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section
        id="how-it-works"
        aria-label="How it works"
        style={{
          padding: 'clamp(60px,8vw,100px) 1.5rem',
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,5vw,56px)' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              letterSpacing: '-0.025em',
              color: 'var(--color-text-primary)',
            }}>
              Three steps to better retention
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--color-border)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr',
                  gap: '2rem',
                  padding: 'clamp(1.5rem, 3vw, 2.25rem)',
                  background: 'var(--color-surface-raised)',
                  alignItems: 'start',
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '2.5rem',
                  color: i === 0 ? 'var(--color-accent)' : 'var(--color-border)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}>
                  {step.n}
                </div>
                <div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    color: 'var(--color-text-primary)',
                    margin: '0 0 0.5rem',
                  }}>{step.title}</h3>
                  <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: 0, fontSize: '0.9rem' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section
        aria-label="Stats"
        style={{ padding: 'clamp(60px,8vw,100px) 1.5rem', maxWidth: '900px', margin: '0 auto' }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1px',
          background: 'var(--color-border)',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          textAlign: 'center',
        }}>
          {[
            { val: '10×', label: 'Faster note-taking' },
            { val: '25s', label: 'Chunk interval' },
            { val: '∞', label: 'Sessions on Pro' },
            { val: '100%', label: 'Private by default' },
          ].map((stat) => (
            <div key={stat.val} style={{ background: 'var(--color-surface)', padding: '2.5rem 1rem' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                color: 'var(--color-accent)',
                letterSpacing: '-0.04em',
                lineHeight: 1,
                marginBottom: '0.5rem',
              }}>{stat.val}</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section
        aria-label="Call to action"
        style={{
          padding: 'clamp(60px,8vw,100px) 1.5rem',
          textAlign: 'center',
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(108,99,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            letterSpacing: '-0.03em',
            color: 'var(--color-text-primary)',
            marginBottom: '1.25rem',
          }}>
            Start learning smarter today
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', marginBottom: '2.5rem', lineHeight: 1.65 }}>
            Free plan available. Install the Chrome extension and record your first session in under a minute.
          </p>
          <Link
            href="/login?signup=1"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'var(--color-accent)',
              color: '#fff',
              padding: '0.9375rem 2.25rem',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 0 40px rgba(108,99,255,0.35)',
            }}
          >
            Get started free →
          </Link>
          <p style={{ marginTop: '1.25rem', color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>
            No credit card • Chrome only for now • Takes 30 seconds
          </p>
        </div>
      </section>

    </div>
  )
}
