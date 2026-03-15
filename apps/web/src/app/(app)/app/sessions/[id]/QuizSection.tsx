'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Sparkle, Star, X } from '@phosphor-icons/react'

interface QuizQuestion {
  id: string
  question_number: number
  difficulty: number
  question: string
  options: string[]
  correct_answer_index: number
  explanation: string
  user_answer_index: number | null
}

type QuizFlow = 'idle' | 'loading' | 'open' | 'prompt'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

const DIFF_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#84cc16',
  3: '#f59e0b',
  4: '#f97316',
  5: '#f04444',
}

const DIFF_LABELS: Record<number, string> = {
  1: 'Easy', 2: 'Easy+', 3: 'Medium', 4: 'Hard', 5: 'Expert',
}

// ── Inner quiz modal ──────────────────────────────────────────────────────────

interface QuizModalProps {
  questions: QuizQuestion[]
  reviewMode: boolean
  onClose: () => void
  onAnswerSave: (questionId: string, answerIndex: number) => void
}

function QuizModal({ questions, reviewMode, onClose, onAnswerSave }: QuizModalProps) {
  const [currentIdx, setCurrentIdx] = useState(() => {
    if (reviewMode) return 0
    const first = questions.findIndex((q) => q.user_answer_index === null)
    return first === -1 ? 0 : first
  })
  const [selectedOption, setSelectedOption] = useState<number | null>(() =>
    reviewMode ? (questions[0]?.user_answer_index ?? null) : null
  )
  const [isRevealed, setIsRevealed] = useState(reviewMode)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (reviewMode) {
      setSelectedOption(questions[currentIdx]?.user_answer_index ?? null)
      setIsRevealed(true)
    }
  }, [currentIdx, reviewMode, questions])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!mounted) return null

  const q = questions[currentIdx]!
  const isLast = currentIdx === questions.length - 1
  const diffColor = DIFF_COLORS[q.difficulty] ?? '#6c63ff'

  const getOptionState = (idx: number): 'default' | 'selected' | 'correct' | 'wrong' | 'muted' => {
    if (!isRevealed) return selectedOption === idx ? 'selected' : 'default'
    if (idx === q.correct_answer_index) return 'correct'
    if (idx === selectedOption && selectedOption !== q.correct_answer_index) return 'wrong'
    return 'muted'
  }

  const optionBg = (state: string) => {
    if (state === 'selected') return 'var(--color-accent-dim)'
    if (state === 'correct') return 'rgba(34,197,94,0.12)'
    if (state === 'wrong') return 'rgba(240,68,68,0.12)'
    return 'var(--color-surface-raised)'
  }

  const optionBorder = (state: string) => {
    if (state === 'selected') return '1px solid var(--color-accent)'
    if (state === 'correct') return '1px solid #22c55e'
    if (state === 'wrong') return '1px solid #f04444'
    return '1px solid var(--color-border)'
  }

  const optionColor = (state: string) => {
    if (state === 'correct') return '#22c55e'
    if (state === 'wrong') return '#f04444'
    return 'var(--color-text-primary)'
  }

  const handleSubmit = () => {
    if (selectedOption === null) return
    onAnswerSave(q.id, selectedOption)
    setIsRevealed(true)
  }

  const handleNext = () => {
    if (isLast) { onClose(); return }
    const nextIdx = currentIdx + 1
    const nextQ = questions[nextIdx]
    setCurrentIdx(nextIdx)
    setSelectedOption(reviewMode ? (nextQ?.user_answer_index ?? null) : null)
    setIsRevealed(reviewMode)
  }

  const modal = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(8,8,12,0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '540px',
        maxHeight: 'calc(100vh - 40px)',
        background: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(108,99,255,0.08)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '14px 16px', borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', padding: '2px 8px', borderRadius: '999px',
            color: diffColor, background: `${diffColor}22`, border: `1px solid ${diffColor}44`,
          }}>
            {DIFF_LABELS[q.difficulty] ?? `L${q.difficulty}`}
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: '11px',
            color: 'var(--color-text-secondary)', fontFamily: 'monospace',
          }}>
            {currentIdx + 1} / {questions.length}
          </span>
          <button
            onClick={onClose}
            style={{
              width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
              border: '1px solid var(--color-border)', background: 'transparent',
              color: 'var(--color-text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            <X size={14} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 16px 12px',
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}>
          <p style={{
            fontWeight: 700, fontSize: '15px', lineHeight: 1.55,
            margin: 0, color: 'var(--color-text-primary)',
          }}>
            {q.question}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {q.options.map((opt, idx) => {
              const state = getOptionState(idx)
              return (
                <button
                  key={idx}
                  onClick={() => { if (!isRevealed) setSelectedOption(idx) }}
                  disabled={isRevealed}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: optionBorder(state), background: optionBg(state),
                    color: optionColor(state), cursor: isRevealed ? 'default' : 'pointer',
                    textAlign: 'left', fontSize: '13.5px', lineHeight: 1.5,
                    opacity: state === 'muted' ? 0.35 : 1,
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                >
                  <span style={{
                    width: '22px', height: '22px', flexShrink: 0, borderRadius: '6px',
                    border: `1px solid ${state === 'correct' ? '#22c55e' : state === 'wrong' ? '#f04444' : state === 'selected' ? 'var(--color-accent)' : 'currentColor'}`,
                    opacity: state === 'default' ? 0.5 : 1,
                    fontSize: '10px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: state === 'selected' ? 'var(--color-accent)' : 'inherit',
                  }}>
                    {OPTION_LABELS[idx]}
                  </span>
                  <span style={{ flex: 1 }}>{opt}</span>
                  {isRevealed && state === 'correct' && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {isRevealed && state === 'wrong' && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f04444" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {isRevealed && (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', padding: '12px 14px',
            }}>
              <div style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                textTransform: 'uppercase', color: 'var(--color-text-secondary)',
                marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Explanation
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: 0 }}>
                {q.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
          {!isRevealed ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              style={{
                width: '100%', height: '42px', borderRadius: 'var(--radius-md)',
                border: 'none', background: 'var(--color-accent)', color: '#fff',
                fontSize: '14px', fontWeight: 600,
                cursor: selectedOption === null ? 'not-allowed' : 'pointer',
                opacity: selectedOption === null ? 0.4 : 1,
                boxShadow: selectedOption !== null ? '0 2px 16px rgba(108,99,255,0.4)' : 'none',
              }}
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              style={{
                width: '100%', height: '42px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-accent)', background: 'var(--color-accent-dim)',
                color: 'var(--color-accent)', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {isLast ? 'Finish Quiz' : <>Next <ArrowRight size={14} weight="bold" aria-hidden="true" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// ── QuizSection sidebar card ──────────────────────────────────────────────────

interface QuizSectionProps {
  sessionId: string
  notes: string | null
}

export function QuizSection({ sessionId, notes }: QuizSectionProps) {
  const [quizFlow, setQuizFlow] = useState<QuizFlow>('idle')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [reviewMode, setReviewMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleTakeQuiz = async () => {
    setError(null)
    setQuizFlow('loading')
    try {
      const getRes = await fetch(`/api/ai/quiz?sessionId=${sessionId}`)
      if (!getRes.ok) throw new Error(`Failed to load quiz (${getRes.status})`)
      const data = await getRes.json()
      const existing: QuizQuestion[] = Array.isArray(data) ? data : (data?.questions ?? [])

      if (existing.length === 0) {
        const postRes = await fetch('/api/ai/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        if (!postRes.ok) {
          const err = await postRes.json().catch(() => ({})) as { error?: string; upgradeRequired?: boolean }
          throw new Error(
            err.upgradeRequired
              ? 'Quiz generation requires Clarvo Pro.'
              : (err.error ?? `Generation failed (${postRes.status})`)
          )
        }
        const postData = await postRes.json()
        const generated: QuizQuestion[] = Array.isArray(postData) ? postData : (postData?.questions ?? [])
        setQuestions(generated)
        setReviewMode(false)
        setQuizFlow('open')
      } else {
        const allAnswered = existing.every((q) => q.user_answer_index !== null)
        setQuestions(existing)
        if (allAnswered) {
          setQuizFlow('prompt')
        } else {
          setReviewMode(false)
          setQuizFlow('open')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz')
      setQuizFlow('idle')
    }
  }

  const handleAnswerSave = async (questionId: string, answerIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, user_answer_index: answerIndex } : q))
    )
    try {
      await fetch('/api/ai/quiz', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answers: { [questionId]: answerIndex } }),
      })
    } catch { /* non-critical */ }
  }

  const handleRetake = async () => {
    setQuizFlow('loading')
    try {
      await fetch(`/api/ai/quiz?sessionId=${sessionId}`, { method: 'DELETE' })
      setQuestions((prev) => prev.map((q) => ({ ...q, user_answer_index: null })))
      setReviewMode(false)
      setQuizFlow('open')
    } catch {
      setQuizFlow('prompt')
    }
  }

  const score = questions.filter((q) => q.user_answer_index === q.correct_answer_index).length

  return (
    <>
      <div className="card">
        <h3 className="section-title" style={{ fontSize: '0.9375rem' }}>Quiz</h3>
        {!notes ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            Notes are required to generate a quiz.
          </p>
        ) : (
          <>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
              {questions.length > 0
                ? `${questions.length} questions generated`
                : 'Test your understanding with AI-generated questions.'}
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', opacity: quizFlow === 'loading' ? 0.7 : 1 }}
              onClick={handleTakeQuiz}
              disabled={quizFlow === 'loading'}
            >
              {quizFlow === 'loading'
                ? 'Preparing…'
                : questions.length > 0
                ? 'Open Quiz'
                : <><Sparkle size={14} weight="fill" aria-hidden="true" /> Take Quiz</>}
            </button>
            {error && (
              <p style={{ fontSize: '0.8125rem', color: '#f87171', marginTop: 'var(--space-3)', marginBottom: 0 }}>
                {error}
              </p>
            )}
          </>
        )}
      </div>

      {/* Quiz modal overlay */}
      {mounted && quizFlow === 'open' && questions.length > 0 && (
        <QuizModal
          questions={questions}
          reviewMode={reviewMode}
          onClose={() => setQuizFlow('idle')}
          onAnswerSave={handleAnswerSave}
        />
      )}

      {/* Quiz-complete prompt */}
      {mounted && quizFlow === 'prompt' && (
        createPortal(
          <div
            onClick={() => setQuizFlow('idle')}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(8,8,12,0.88)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '340px',
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)', padding: '28px 24px 24px',
                boxShadow: '0 24px 48px rgba(0,0,0,0.65)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
              }}
            >
              <div style={{ display: 'inline-flex' }}><Star size={40} weight="fill" aria-hidden="true" /></div>
              <h3 style={{ fontWeight: 700, fontSize: '17px', margin: 0, color: 'var(--color-text-primary)' }}>
                Quiz Complete
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>
                You&apos;ve answered all questions.
              </p>
              <div style={{
                padding: '6px 16px', borderRadius: '999px',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-text-secondary)',
              }}>
                Score:{' '}
                <strong style={{ color: 'var(--color-accent)', fontSize: '15px' }}>
                  {score} / {questions.length}
                </strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '4px' }}>
                <button
                  className="btn btn-primary"
                  style={{ justifyContent: 'center' }}
                  onClick={() => { setReviewMode(true); setQuizFlow('open') }}
                >
                  Review with Answers
                </button>
                <button
                  onClick={handleRetake}
                  style={{
                    width: '100%', padding: '10px 0',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                    background: 'transparent', color: 'var(--color-text-secondary)',
                    fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  Retake Quiz
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </>
  )
}
