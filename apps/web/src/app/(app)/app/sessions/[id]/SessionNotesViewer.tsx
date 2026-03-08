'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
// ReactMarkdown's exported type can sometimes be incompatible with JSX typings
// in this workspace's TS setup. Cast to `any` for JSX usage to avoid TS errors
const RM: any = ReactMarkdown

interface Flashcard {
  id: string
  front: string
  back: string
}

interface Props {
  notes: string | null
  flashcards: Flashcard[]
  sessionId: string
  initialActionPlan: string | null
}

type Tab = 'notes' | 'flashcards' | 'action-plan'

export function SessionNotesViewer({ notes, flashcards: initialFlashcards, sessionId, initialActionPlan }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('notes')
  const [flipped, setFlipped] = useState<Record<string, boolean>>({})

  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards)
  const [actionPlan, setActionPlan] = useState<string | null>(initialActionPlan)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  function toggleFlip(id: string) {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleGenerateBoth() {
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/ai/generate-both', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data: { flashcards?: Flashcard[]; actionPlan?: string; error?: string; upgradeRequired?: boolean } = await res.json()
      if (data.error) {
        setGenerateError(
          data.upgradeRequired
            ? 'Generating flashcards & action plan requires Clarvo Pro.'
            : data.error
        )
      } else {
        if (data.flashcards) setFlashcards(data.flashcards)
        if (data.actionPlan) setActionPlan(data.actionPlan)
      }
    } catch {
      setGenerateError('Failed to generate. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const tabStyle = (tab: Tab) => ({
    padding: 'var(--space-2) var(--space-4)',
    fontSize: '0.9375rem',
    fontWeight: 600,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: activeTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  })

  const generateButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'var(--color-accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    opacity: isGenerating ? 0.7 : 1,
  } as const

  return (
    <div className="card" style={{ padding: 0, minHeight: '60vh' }}>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 var(--space-4)',
        }}
      >
        <button style={tabStyle('notes')} onClick={() => setActiveTab('notes')}>
          Notes
        </button>
        <button style={tabStyle('flashcards')} onClick={() => setActiveTab('flashcards')}>
          Flashcards {flashcards.length > 0 && `(${flashcards.length})`}
        </button>
        <button style={tabStyle('action-plan')} onClick={() => setActiveTab('action-plan')}>
          Action Plan
        </button>
      </div>

      {/* Tab content */}
      <div style={{ padding: 'var(--space-6)' }}>
        {/* Notes tab */}
        {activeTab === 'notes' && (
          <>
            {notes ? (
              <div className="prose prose-invert max-w-none prose-headings:font-display prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-strong:font-bold prose-code:text-purple-300 prose-code:bg-surface-raised prose-code:px-1 prose-code:rounded prose-li:marker:text-accent">
                <RM>{notes}</RM>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📄</div>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                  No notes yet
                </p>
                <p style={{ fontSize: '0.875rem' }}>
                  Notes will appear here once AI processing is complete.
                </p>
              </div>
            )}
          </>
        )}

        {/* Flashcards tab */}
        {activeTab === 'flashcards' && (
          <>
            {isGenerating ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>⏳</div>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Generating flashcards…</p>
                <p style={{ fontSize: '0.875rem', marginTop: 'var(--space-2)' }}>This may take a few seconds.</p>
              </div>
            ) : generateError ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>⚠️</div>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                  Could not generate
                </p>
                <p style={{ fontSize: '0.875rem' }}>{generateError}</p>
              </div>
            ) : flashcards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🃏</div>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                  No flashcards yet
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-4)' }}>
                  Generate flashcards from your session notes.
                </p>
                {notes && (
                  <button style={generateButtonStyle} onClick={handleGenerateBoth} disabled={isGenerating}>
                    ✦ Generate Flashcards
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 'var(--space-4)',
                }}
              >
                {flashcards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => toggleFlip(card.id)}
                    style={{
                      background: flipped[card.id] ? 'var(--color-accent)' : 'var(--color-surface-raised)',
                      border: `1px solid ${flipped[card.id] ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-4)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minHeight: '120px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)',
                      color: flipped[card.id] ? '#fff' : 'var(--color-text-primary)',
                      transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        opacity: 0.7,
                      }}
                    >
                      {flipped[card.id] ? 'ANSWER' : 'QUESTION'}
                    </span>
                    <span style={{ fontSize: '0.9375rem', lineHeight: 1.5 }}>
                      {flipped[card.id] ? card.back : card.front}
                    </span>
                    <span
                      style={{
                        marginTop: 'auto',
                        fontSize: '0.75rem',
                        opacity: 0.6,
                      }}
                    >
                      {flipped[card.id] ? 'Tap to see question' : 'Tap to reveal answer'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Action Plan tab */}
        {activeTab === 'action-plan' && (
          <>
            {isGenerating ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>⏳</div>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Generating action plan…</p>
                <p style={{ fontSize: '0.875rem', marginTop: 'var(--space-2)' }}>This may take a few seconds.</p>
              </div>
            ) : generateError ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>⚠️</div>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                  Could not generate action plan
                </p>
                <p style={{ fontSize: '0.875rem' }}>{generateError}</p>
              </div>
            ) : actionPlan ? (
              <div className="prose prose-invert max-w-none prose-headings:font-display prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-strong:font-bold prose-code:text-purple-300 prose-code:bg-surface-raised prose-code:px-1 prose-code:rounded prose-li:marker:text-accent">
                <RM>{actionPlan}</RM>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📋</div>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                  No action plan yet
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-4)' }}>
                  Generate a personalised action plan from your session notes.
                </p>
                {notes && (
                  <button style={generateButtonStyle} onClick={handleGenerateBoth} disabled={isGenerating}>
                    ✦ Generate Action Plan
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
