'use client'

import { useState } from 'react'

interface Flashcard {
  id: string
  front: string
  back: string
}

interface Props {
  notes: string | null
  flashcards: Flashcard[]
  sessionId: string
}

type Tab = 'notes' | 'flashcards'

export function SessionNotesViewer({ notes, flashcards, sessionId: _sessionId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('notes')
  const [flipped, setFlipped] = useState<Record<string, boolean>>({})

  function toggleFlip(id: string) {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }))
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
      </div>

      {/* Tab content */}
      <div style={{ padding: 'var(--space-6)' }}>
        {/* Notes tab */}
        {activeTab === 'notes' && (
          <>
            {notes ? (
              <div
                style={{
                  fontSize: '0.9375rem',
                  lineHeight: 1.75,
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {notes}
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
            {flashcards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🃏</div>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                  No flashcards yet
                </p>
                <p style={{ fontSize: '0.875rem' }}>
                  Flashcards are generated automatically after a recording is processed.
                </p>
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
      </div>
    </div>
  )
}
