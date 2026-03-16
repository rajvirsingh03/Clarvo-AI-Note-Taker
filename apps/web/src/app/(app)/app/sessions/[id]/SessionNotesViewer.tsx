'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import {
  Cards,
  ClipboardText,
  Hourglass,
  Note,
  PencilSimple,
  Sparkle,
  WarningCircle,
} from '@/components/phosphor-icons'
// ReactMarkdown's exported type can sometimes be incompatible with JSX typings
// in this workspace's TS setup. Cast to `any` for JSX usage to avoid TS errors
const RM: any = ReactMarkdown

const PROSE_CLASSES =
  'prose prose-invert max-w-none ' +
  'prose-headings:font-display prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg ' +
  'prose-strong:font-bold prose-strong:text-white ' +
  'prose-code:text-purple-300 prose-code:bg-[#1a1a24] prose-code:px-1 prose-code:rounded ' +
  'prose-li:marker:text-accent prose-a:text-accent ' +
  '[&_figure[data-type=screenshot]_figcaption]:text-[0.8125rem] ' +
  '[&_figure[data-type=screenshot]_figcaption]:text-[color:var(--color-text-secondary)] ' +
  '[&_figure[data-type=screenshot]_figcaption]:not-italic ' +
  '[&_figure[data-type=screenshot]_figcaption]:mt-1'

/** Inject <figcaption> into screenshot figures that have a non-default alt text. */
function addScreenshotCaptions(html: string): string {
  return html.replace(
    /(<figure[^>]*data-type="screenshot"[^>]*>)([\s\S]*?)(<\/figure>)/gi,
    (_, open: string, inner: string, close: string) => {
      if (inner.includes('<figcaption')) return open + inner + close
      const altMatch = inner.match(/<img[^>]*alt="([^"]+)"/i)
      const alt = altMatch?.[1]?.trim()
      if (!alt || alt === 'Screenshot') return open + inner + close
      return `${open}${inner}<figcaption>${alt}</figcaption>${close}`
    }
  )
}

/** Render any note content — raw markdown, TipTap HTML, or a mix — without showing * or # */
function NoteContent({ content }: { content: string }) {
  return (
    <div className={PROSE_CLASSES}>
      <RM rehypePlugins={[rehypeRaw]}>{addScreenshotCaptions(content)}</RM>
    </div>
  )
}

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

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [currentNotes, setCurrentNotes] = useState<string | null>(notes)
  const editorRef = useRef<HTMLDivElement>(null)

  // Populate the contentEditable div with current HTML when entering edit mode
  useEffect(() => {
    if (isEditing && editorRef.current && currentNotes) {
      editorRef.current.innerHTML = currentNotes
      editorRef.current.focus()
    }
  }, [isEditing])

  function toggleFlip(id: string) {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleSaveNotes() {
    const content = editorRef.current?.innerHTML ?? currentNotes ?? ''
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: content }),
      })
      if (!res.ok) {
        const data = await res.json()
        setSaveError(data.error ?? 'Failed to save notes.')
      } else {
        setCurrentNotes(content)
        setIsEditing(false)
      }
    } catch {
      setSaveError('Failed to save notes. Please try again.')
    } finally {
      setIsSaving(false)
    }
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
            {currentNotes ? (
              <>
                {/* Edit / Save toolbar */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-4)' }}>
                  {isEditing ? (
                    <>
                      {saveError && (
                        <span style={{ fontSize: '0.8125rem', color: '#f87171' }}>{saveError}</span>
                      )}
                      <button
                        onClick={() => { setIsEditing(false); setSaveError(null) }}
                        disabled={isSaving}
                        style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 14px', fontSize: '0.875rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        disabled={isSaving}
                        style={{ background: 'var(--color-accent)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 14px', fontSize: '0.875rem', fontWeight: 600, color: '#fff', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
                      >
                        {isSaving ? 'Saving…' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '6px 14px', fontSize: '0.875rem', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <PencilSimple size={14} weight="fill" aria-hidden="true" /> Edit
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className={PROSE_CLASSES}
                    style={{
                      outline: 'none',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-4)',
                      minHeight: '400px',
                      cursor: 'text',
                      background: 'var(--color-surface-raised)',
                    }}
                  />
                ) : (
                  <NoteContent content={currentNotes} />
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ marginBottom: 'var(--space-3)', display: 'inline-flex' }}><Note size={40} weight="fill" aria-hidden="true" /></div>
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
                <div style={{ marginBottom: 'var(--space-3)', display: 'inline-flex' }}><Hourglass size={40} weight="fill" aria-hidden="true" /></div>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Generating flashcards…</p>
                <p style={{ fontSize: '0.875rem', marginTop: 'var(--space-2)' }}>This may take a few seconds.</p>
              </div>
            ) : generateError ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ marginBottom: 'var(--space-3)', display: 'inline-flex' }}><WarningCircle size={40} weight="fill" aria-hidden="true" /></div>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                  Could not generate
                </p>
                <p style={{ fontSize: '0.875rem' }}>{generateError}</p>
              </div>
            ) : flashcards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ marginBottom: 'var(--space-3)', display: 'inline-flex' }}><Cards size={40} weight="fill" aria-hidden="true" /></div>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                  No flashcards yet
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-4)' }}>
                  Generate flashcards from your session notes.
                </p>
                {notes && (
                  <button style={generateButtonStyle} onClick={handleGenerateBoth} disabled={isGenerating}>
                    <Sparkle size={14} weight="fill" aria-hidden="true" /> Generate Flashcards
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
                <div style={{ marginBottom: 'var(--space-3)', display: 'inline-flex' }}><Hourglass size={40} weight="fill" aria-hidden="true" /></div>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Generating action plan…</p>
                <p style={{ fontSize: '0.875rem', marginTop: 'var(--space-2)' }}>This may take a few seconds.</p>
              </div>
            ) : generateError ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ marginBottom: 'var(--space-3)', display: 'inline-flex' }}><WarningCircle size={40} weight="fill" aria-hidden="true" /></div>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                  Could not generate action plan
                </p>
                <p style={{ fontSize: '0.875rem' }}>{generateError}</p>
              </div>
            ) : actionPlan ? (
              <NoteContent content={actionPlan} />
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ marginBottom: 'var(--space-3)', display: 'inline-flex' }}><ClipboardText size={40} weight="fill" aria-hidden="true" /></div>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                  No action plan yet
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-4)' }}>
                  Generate a personalised action plan from your session notes.
                </p>
                {notes && (
                  <button style={generateButtonStyle} onClick={handleGenerateBoth} disabled={isGenerating}>
                    <Sparkle size={14} weight="fill" aria-hidden="true" /> Generate Action Plan
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
