'use client'

import { useState, useCallback } from 'react'
import type { Flashcard } from '@clarvo/types'

export interface FlashcardDeckProps {
  flashcards: Flashcard[]
  onComplete?: (correct: number, total: number) => void
  className?: string
}

export function FlashcardDeck({ flashcards, onComplete, className = '' }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  const currentCard = flashcards[currentIndex]

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  const handleAnswer = useCallback(
    (gotItRight: boolean) => {
      if (gotItRight) setCorrect((c) => c + 1)

      if (currentIndex + 1 >= flashcards.length) {
        setIsCompleted(true)
        onComplete?.(correct + (gotItRight ? 1 : 0), flashcards.length)
      } else {
        setCurrentIndex((i) => i + 1)
        setIsFlipped(false)
      }
    },
    [currentIndex, flashcards.length, correct, onComplete]
  )

  if (!currentCard) return null

  if (isCompleted) {
    const score = Math.round(((correct) / flashcards.length) * 100)
    return (
      <div className={['text-center p-8', className].join(' ')}>
        <div className="text-4xl font-display font-bold text-text-primary mb-2">{score}%</div>
        <p className="text-text-secondary">
          {correct} of {flashcards.length} correct
        </p>
        <button
          onClick={() => { setCurrentIndex(0); setIsFlipped(false); setCorrect(0); setIsCompleted(false) }}
          className="mt-6 px-5 py-2.5 rounded-md bg-accent text-white font-body font-medium hover:brightness-110 transition-all"
        >
          Review Again
        </button>
      </div>
    )
  }

  return (
    <div className={['select-none', className].join(' ')}>
      {/* Progress */}
      <div className="flex items-center justify-between mb-4 text-sm text-text-secondary font-body">
        <span>{currentIndex + 1} / {flashcards.length}</span>
        <div className="flex-1 mx-4 h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
          />
        </div>
        <span>{correct} ✓</span>
      </div>

      {/* Card */}
      <button
        onClick={handleFlip}
        className="w-full min-h-[200px] rounded-xl border border-border bg-surface p-8 text-left transition-all duration-200 hover:border-accent hover:shadow-accent cursor-pointer"
        aria-label={isFlipped ? 'Card showing answer — click to see question' : 'Card showing question — click to reveal answer'}
      >
        <div className="text-xs font-body text-text-tertiary mb-3 uppercase tracking-wider">
          {isFlipped ? 'Answer' : 'Question'}
        </div>
        <p className="text-text-primary font-body text-base leading-relaxed">
          {isFlipped ? currentCard.back : currentCard.front}
        </p>
        <p className="mt-4 text-xs text-text-tertiary">
          {isFlipped ? '' : 'Tap to reveal answer'}
        </p>
      </button>

      {/* Answer buttons — only show when flipped */}
      {isFlipped && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => handleAnswer(false)}
            className="flex-1 h-11 rounded-md border border-error/40 bg-error/10 text-error font-body font-medium hover:bg-error/20 transition-all"
          >
            Need more practice
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="flex-1 h-11 rounded-md border border-success/40 bg-success/10 text-success font-body font-medium hover:bg-success/20 transition-all"
          >
            Got it ✓
          </button>
        </div>
      )}
    </div>
  )
}
