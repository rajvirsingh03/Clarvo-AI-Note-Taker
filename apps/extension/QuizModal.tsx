/**
 * QuizModal — Full-screen overlay quiz experience for Clarvo AI
 *
 * Shows one MCQ question at a time with progressive difficulty,
 * animated transitions, and reveal-on-submit answer feedback.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'
import { ArrowRight } from '@phosphor-icons/react'

export interface QuizQuestion {
  id: string
  question_number: number
  difficulty: number
  question: string
  options: string[]
  correct_answer_index: number
  explanation: string
  user_answer_index: number | null
}

interface QuizModalProps {
  questions: QuizQuestion[]
  startIndex?: number            // resume from a specific question
  reviewMode?: boolean           // show all answers immediately (review)
  onClose: () => void
  onAnswerSave: (questionId: string, answerIndex: number) => void
}

const OPTION_LABELS = ['A', 'B', 'C', 'D']

const DIFFICULTY_COLORS: Record<number, string> = {
  1: '#22c55e',  // green
  2: '#84cc16',  // lime
  3: '#f59e0b',  // amber
  4: '#f97316',  // orange
  5: '#f04444',  // red
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Easy',
  2: 'Easy+',
  3: 'Medium',
  4: 'Hard',
  5: 'Expert',
}

export function QuizModal({ questions, startIndex = 0, reviewMode = false, onClose, onAnswerSave }: QuizModalProps) {
  const [currentIdx, setCurrentIdx] = useState(() => {
    if (reviewMode) return 0
    // In fresh-start mode, find first unanswered
    const firstUnanswered = questions.findIndex((q) => q.user_answer_index === null)
    return firstUnanswered === -1 ? 0 : Math.max(startIndex, firstUnanswered)
  })

  const [selectedOption, setSelectedOption] = useState<number | null>(() =>
    reviewMode ? (questions[0]?.user_answer_index ?? null) : null
  )
  const [isRevealed, setIsRevealed] = useState(reviewMode)

  const backdropRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const explanationRef = useRef<HTMLDivElement>(null)

  const q = questions[currentIdx]!
  const isLast = currentIdx === questions.length - 1

  // ── Mount animation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!backdropRef.current || !cardRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(backdropRef.current, { opacity: 0, duration: 0.2, ease: 'power2.out' })
      gsap.from(cardRef.current, {
        scale: 0.9, opacity: 0, y: 16,
        duration: 0.3, ease: 'back.out(1.5)',
      })
    })
    return () => ctx.revert()
  }, [])

  // ── Question transition animation ─────────────────────────────────────────
  const animateNextQuestion = useCallback((direction: 1 | -1 = 1) => {
    if (!contentRef.current) return
    const exitX = direction === 1 ? -28 : 28
    const enterX = direction === 1 ? 28 : -28
    gsap.to(contentRef.current, {
      x: exitX, opacity: 0, duration: 0.18, ease: 'power2.in',
      onComplete: () => {
        gsap.fromTo(contentRef.current, { x: enterX, opacity: 0 }, {
          x: 0, opacity: 1, duration: 0.22, ease: 'power2.out',
        })
      },
    })
  }, [])

  // ── Reveal explanation animation ──────────────────────────────────────────
  useEffect(() => {
    if (!isRevealed || !explanationRef.current) return
    gsap.from(explanationRef.current, {
      y: 10, opacity: 0, duration: 0.25, ease: 'power2.out',
    })
  }, [isRevealed])

  // ── Sync selectedOption when switching questions in review mode ───────────
  useEffect(() => {
    if (reviewMode) {
      setSelectedOption(questions[currentIdx]?.user_answer_index ?? null)
      setIsRevealed(true)
    }
  }, [currentIdx, reviewMode, questions])

  const handleOptionClick = useCallback((idx: number) => {
    if (isRevealed) return
    setSelectedOption(idx)
  }, [isRevealed])

  const handleSubmit = useCallback(() => {
    if (selectedOption === null || !q) return
    onAnswerSave(q.id, selectedOption)
    setIsRevealed(true)
  }, [selectedOption, q, onAnswerSave])

  const handleNext = useCallback(() => {
    if (isLast) {
      onClose()
      return
    }
    animateNextQuestion(1)
    const nextIdx = currentIdx + 1
    const nextQ = questions[nextIdx]
    setTimeout(() => {
      setCurrentIdx(nextIdx)
      setSelectedOption(reviewMode ? (nextQ?.user_answer_index ?? null) : null)
      setIsRevealed(reviewMode)
    }, 18)
  }, [isLast, currentIdx, questions, reviewMode, animateNextQuestion, onClose])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose()
  }, [onClose])

  if (!q) return null

  const diffColor = DIFFICULTY_COLORS[q.difficulty] ?? '#6c63ff'

  const getOptionState = (optIdx: number): 'default' | 'selected' | 'correct' | 'wrong' | 'muted' => {
    if (!isRevealed) return selectedOption === optIdx ? 'selected' : 'default'
    if (optIdx === q.correct_answer_index) return 'correct'
    if (optIdx === selectedOption && selectedOption !== q.correct_answer_index) return 'wrong'
    return 'muted'
  }

  return (
    <div className="quiz-backdrop" ref={backdropRef} onClick={handleBackdropClick}>
      <div className="quiz-card" ref={cardRef}>
        {/* Header */}
        <div className="quiz-header">
          <span
            className="quiz-diff-badge"
            style={{ '--diff-color': diffColor } as React.CSSProperties}
          >
            {DIFFICULTY_LABELS[q.difficulty] ?? `L${q.difficulty}`}
          </span>
          <span className="quiz-counter">Q {currentIdx + 1} / {questions.length}</span>
          <button className="quiz-close-btn" onClick={onClose} aria-label="Close quiz">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="quiz-scroll" ref={contentRef}>
          {/* Question */}
          <p className="quiz-question">{q.question}</p>

          {/* Options */}
          <div className="quiz-options">
            {q.options.map((opt, idx) => {
              const state = getOptionState(idx)
              return (
                <button
                  key={idx}
                  className={`quiz-option quiz-option--${state}`}
                  onClick={() => handleOptionClick(idx)}
                  disabled={isRevealed}
                  aria-pressed={selectedOption === idx}
                >
                  <span className="quiz-option-letter">{OPTION_LABELS[idx]}</span>
                  <span className="quiz-option-text">{opt}</span>
                  {isRevealed && state === 'correct' && (
                    <svg className="quiz-option-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                  {isRevealed && state === 'wrong' && (
                    <svg className="quiz-option-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  )}
                </button>
              )
            })}
          </div>

          {/* Explanation (shown after reveal) */}
          {isRevealed && (
            <div className="quiz-explanation" ref={explanationRef}>
              <div className="quiz-explanation-header">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>Explanation</span>
              </div>
              <p className="quiz-explanation-text">{q.explanation}</p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="quiz-footer">
          {!isRevealed ? (
            <button
              className="quiz-submit-btn"
              onClick={handleSubmit}
              disabled={selectedOption === null}
            >
              Submit Answer
            </button>
          ) : (
            <button className="quiz-next-btn" onClick={handleNext}>
              {isLast ? 'Finish Quiz' : <>Next <ArrowRight size={14} weight="bold" aria-hidden="true" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
