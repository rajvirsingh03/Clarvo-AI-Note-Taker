'use client'

import React from 'react'

export interface NoteCanvasProps {
  /** Markdown content to render */
  content: string
  /** If true, the area will visually indicate live streaming (notes updating) */
  isLive?: boolean
  className?: string
}

/**
 * NoteCanvas — live Markdown preview pane.
 * Used in both the extension side-panel and the web /sessions/[id] page.
 *
 * Renders structured Markdown with support for KaTeX math.
 * TODO: integrate remark/rehype pipeline or react-markdown with remark-math + rehype-katex.
 */
export function NoteCanvas({ content, isLive = false, className = '' }: NoteCanvasProps) {
  if (!content) {
    return (
      <div
        className={[
          'flex flex-col items-center justify-center min-h-[200px] rounded-lg border border-dashed border-border text-text-tertiary font-body text-sm p-8',
          className,
        ].join(' ')}
        aria-live="polite"
        aria-label="Notes canvas — empty"
      >
        <span className="text-2xl mb-3" aria-hidden>📝</span>
        <p>Notes will appear here as Clarvo processes the audio.</p>
        <p className="text-xs mt-1 text-text-tertiary opacity-70">Processing every ~3 minutes</p>
      </div>
    )
  }

  return (
    <div
      className={[
        'relative rounded-lg border border-border bg-surface p-5 font-body text-text-primary',
        'prose prose-invert max-w-none',
        className,
      ].join(' ')}
      aria-live={isLive ? 'polite' : 'off'}
      aria-label="Learning notes"
    >
      {isLive && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 text-xs text-success font-body"
          aria-live="polite"
          aria-label="Session is live"
        >
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" aria-hidden />
          Live
        </div>
      )}
      {/* TODO: Replace with react-markdown + remark-math + rehype-katex rendering */}
      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-body">{content}</pre>
    </div>
  )
}
