/**
 * Side Panel — Clarvo AI
 *
 * States:
 *   IDLE       → "No video detected"
 *   DETECTED   → Video found — "Start Session" button (extension gesture!)
 *   RECORDING  → Unified rich-text editor + waveform + live capture
 *   COMPLETED  → Notes view with left sidebar (Notes / Flashcards / Action Plan)
 *
 * The Start Session button MUST live here (extension surface) so
 * chrome.tabCapture.getMediaStreamId() receives a valid user gesture.
 */

import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react'
import gsap from 'gsap'
import './sidepanel.css'

import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import { Node, mergeAttributes } from '@tiptap/react'

import type {
  ExtensionMessage,
  ExtensionSessionState,
  TranscriptReadyPayload,
  NotesUpdatedPayload,
  ErrorPayload,
  SessionStateChangedPayload,
  VideoDetectedPayload,
} from '@clarvo/types'

type ViewState = 'idle' | 'detected' | 'recording' | 'completed'
type CompletedPage = 'notes' | 'flashcards' | 'action-plan'

interface Alert {
  id: number
  type: 'error' | 'warning'
  title: string
  message: string
}

interface Flashcard {
  front: string
  back: string
}

interface ActionItem {
  id: number
  text: string
  completed: boolean
}

const WEB_APP_URL = process.env.PLASMO_PUBLIC_WEB_APP_URL ?? 'http://localhost:3000'
const WAVE_BAR_COUNT = 24

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

let alertCounter = 0
let actionItemCounter = 0

// ── Markdown → HTML parser ────────────────────────────────────────────────────

function inlineFormat(text: string): string {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>')
  // Italic
  text = text.replace(/\*([^*]+?)\*/g, '<em>$1</em>')
  text = text.replace(/_([^_]+?)_/g, '<em>$1</em>')
  // Inline code
  text = text.replace(/`(.+?)`/g, '<code>$1</code>')
  return text
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inUl = false
  let inOl = false

  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (/^# /.test(line)) {
      closeList()
      out.push(`<h1>${inlineFormat(line.slice(2).trim())}</h1>`)
    } else if (/^## /.test(line)) {
      closeList()
      out.push(`<h2>${inlineFormat(line.slice(3).trim())}</h2>`)
    } else if (/^### /.test(line)) {
      closeList()
      out.push(`<h3>${inlineFormat(line.slice(4).trim())}</h3>`)
    } else if (/^[-*] /.test(line)) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul>'); inUl = true }
      out.push(`<li>${inlineFormat(line.slice(2).trim())}</li>`)
    } else if (/^\d+\. /.test(line)) {
      const content = line.replace(/^\d+\.\s*/, '')
      if (inUl) { out.push('</ul>'); inUl = false }
      if (!inOl) { out.push('<ol>'); inOl = true }
      out.push(`<li>${inlineFormat(content)}</li>`)
    } else if (line.trim() === '') {
      closeList()
    } else {
      closeList()
      out.push(`<p>${inlineFormat(line.trim())}</p>`)
    }
  }

  closeList()
  return out.join('\n')
}

// ── Screenshot NodeView Component (TipTap) ───────────────────────────────────

const ScreenshotNodeView: React.FC<NodeViewProps> = ({ node, deleteNode, updateAttributes }) => {
  const [caption, setCaption] = useState<string>((node.attrs.caption as string) || '')
  const [showCaption, setShowCaption] = useState<boolean>(!!(node.attrs.caption as string))
  const figRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (figRef.current) {
      gsap.from(figRef.current, { scale: 0.95, opacity: 0, duration: 0.35, ease: 'back.out(1.5)' })
      figRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [])

  return (
    <NodeViewWrapper>
      <figure
        ref={figRef as React.RefObject<HTMLElement>}
        className="screenshot-block"
        data-drag-handle
      >
        <button
          className="screenshot-remove"
          onClick={deleteNode}
          onMouseDown={(e) => e.preventDefault()}
          title="Remove screenshot"
        >
          ✕
        </button>
        <img src={node.attrs.src as string} alt="Screenshot" draggable={false} />
        <div className="screenshot-footer">
          <span className="screenshot-timestamp">📷 {node.attrs.timestamp as string}</span>
          {!showCaption ? (
            <button
              className="screenshot-add-caption-btn"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
              onClick={() => setShowCaption(true)}
            >
              + Add Caption
            </button>
          ) : (
            <textarea
              className="screenshot-caption-input"
              placeholder="Add a caption…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onBlur={() => updateAttributes({ caption })}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              rows={2}
              autoFocus
            />
          )}
        </div>
      </figure>
    </NodeViewWrapper>
  )
}

// ── Screenshot TipTap Extension ──────────────────────────────────────────────

const ScreenshotExtension = Node.create({
  name: 'screenshot',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      timestamp: { default: '' },
      caption: { default: '' },
      id: { default: '' }, // unique ID for tracking background upload
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-type="screenshot"]',
        getAttrs: (dom: HTMLElement | string) => {
          if (typeof dom === 'string') return {}
          const img = dom.querySelector('img')
          return {
            // Support both new format (img child) and legacy format (attrs on figure)
            src: img?.getAttribute('src') ?? dom.getAttribute('src') ?? null,
            timestamp: dom.getAttribute('data-timestamp') ?? dom.getAttribute('timestamp') ?? '',
            caption: img?.getAttribute('alt') ?? dom.getAttribute('caption') ?? '',
            id: dom.getAttribute('data-id') ?? dom.getAttribute('id') ?? '',
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const { src, timestamp, caption, id, ...rest } = HTMLAttributes as {
      src: string; timestamp: string; caption: string; id: string;
      [key: string]: unknown
    }
    return [
      'figure',
      mergeAttributes(rest, {
        'data-type': 'screenshot',
        'data-timestamp': timestamp,
        'data-id': id,
      }),
      ['img', { src, alt: caption || 'Screenshot' }],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ScreenshotNodeView)
  },
})

// ── Shared TipTap extensions ─────────────────────────────────────────────────

const EDITOR_EXTENSIONS = [
  StarterKit,
  Underline,
  Highlight.configure({ multicolor: true }),
  Link.configure({ openOnClick: false }),
  ScreenshotExtension,
]

// ── Action plan text → items ──────────────────────────────────────────────────

function parseActionPlan(text: string): ActionItem[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^[-*\d.]\s*/, '').trim())
    .filter(Boolean)
    .map((t) => ({ id: ++actionItemCounter, text: t, completed: false }))
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SidePanel() {
  const [view, setView] = useState<ViewState>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState<string>('')
  const [elapsed, setElapsed] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [noteChunks, setNoteChunks] = useState<string[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  // Completed-view state
  const [completedPage, setCompletedPage] = useState<CompletedPage>('notes')
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isCardFlipped, setIsCardFlipped] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [isExportingNotion, setIsExportingNotion] = useState(false)
  const [notionExportUrl, setNotionExportUrl] = useState<string | null>(null)
  const [notionExportError, setNotionExportError] = useState<string | null>(null)
  const [newActionText, setNewActionText] = useState('')


  // Floating toolbar
  const [toolbar, setToolbar] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Refs for GSAP targets
  const idleRef = useRef<HTMLDivElement>(null)
  const detectedRef = useRef<HTMLDivElement>(null)
  const recordingRef = useRef<HTMLDivElement>(null)
  const completedRef = useRef<HTMLDivElement>(null)
  const waveRef = useRef<HTMLDivElement>(null)
  const notesEndRef = useRef<HTMLDivElement>(null)
  const recordingScrollRef = useRef<HTMLDivElement>(null)
  const completedScrollRef = useRef<HTMLDivElement>(null)
  const waveTimeline = useRef<gsap.core.Timeline | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Persisted notes HTML + chunk tracking
  const savedNotesHtml = useRef<string>('')
  const processedChunksRef = useRef(0)
  // Track elapsed for screenshot timestamps
  const elapsedAtCapture = useRef(0)
  // Ref to always hold the latest insertScreenshot (fixes stale closure in message handler)
  const insertScreenshotRef = useRef<((dataUrl: string) => void) | null>(null)

  // ── TipTap editors ──────────────────────────────────────────────────────────
  const recordingEditor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    editorProps: {
      attributes: {
        class: 'unified-editor',
        'data-placeholder': 'Start typing your notes…',
      },
    },
  })
  const completedEditor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    editorProps: {
      attributes: { class: 'unified-editor' },
    },
  })
  // Stable refs so message handler ([] deps) can access current editors
  const recordingEditorRef = useRef(recordingEditor)
  useEffect(() => { recordingEditorRef.current = recordingEditor }, [recordingEditor])
  const completedEditorRef = useRef(completedEditor)
  useEffect(() => { completedEditorRef.current = completedEditor }, [completedEditor])

  // Stable ref for sessionId (used in callbacks with [] deps)
  const sessionIdRef = useRef<string | null>(null)
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])

  // Track in-flight screenshot uploads so SESSION_COMPLETED can wait for them
  const pendingUploadsRef = useRef<Set<string>>(new Set())

  // ── Restore persisted state on mount ────────────────────────────────────────
  useEffect(() => {
    chrome.storage.local.get(['clarvoSession', 'detectedVideo']).then((result) => {
      const s = result['clarvoSession'] as ExtensionSessionState | undefined
      const detected = result['detectedVideo'] as {
        pageTitle: string; pageUrl: string; videoSrc: string
      } | undefined

      if (s?.sessionId) {
        setSessionId(s.sessionId)
        setVideoTitle(s.videoTitle ?? '')

        if (s.state === 'RECORDING') {
          setView('recording')
          setIsPaused(false)
          if (s.lastActivityAt) {
            setElapsed(Math.floor((Date.now() - s.lastActivityAt) / 1000))
          }
        } else if (s.state === 'PAUSED') {
          setView('recording')
          setIsPaused(true)
        } else if (s.state === 'COMPLETED') {
          setView('completed')
        }
      } else if (detected) {
        setVideoTitle(detected.pageTitle)
        setView('detected')
      }
    })
  }, [])

  // ── Message listener ────────────────────────────────────────────────────────
  useEffect(() => {
    function handleMessage(msg: ExtensionMessage<unknown>) {
      switch (msg.type) {
        case 'VIDEO_DETECTED': {
          const p = msg.payload as VideoDetectedPayload
          setVideoTitle(p.pageTitle)
          setView((prev) => (prev === 'idle' ? 'detected' : prev))
          break
        }

        case 'VIDEO_LOST': {
          setView((prev) => (prev === 'detected' ? 'idle' : prev))
          setVideoTitle('')
          break
        }

        case 'SESSION_STATE_CHANGED': {
          const p = msg.payload as SessionStateChangedPayload
          setSessionId(p.sessionId)
          if (p.newState === 'RECORDING') {
            setView('recording')
            setIsPaused(false)
            setIsStarting(false)
            if (p.previousState === null) {
              setElapsed(0)
              setLiveTranscript('')
              setNoteChunks([])
              processedChunksRef.current = 0
              savedNotesHtml.current = ''
              pendingUploadsRef.current.clear()
              recordingEditorRef.current?.commands.clearContent()
              setAlerts([])
            }
          } else if (p.newState === 'PAUSED') {
            setIsPaused(true)
          }
          break
        }

        case 'TRANSCRIPT_READY': {
          const p = msg.payload as TranscriptReadyPayload
          setLiveTranscript((prev) => (prev ? prev + ' ' + p.transcript : p.transcript))
          setIsExtracting(true)
          setTimeout(() => setIsExtracting(false), 4000)
          break
        }

        case 'NOTES_UPDATED': {
          const p = msg.payload as NotesUpdatedPayload
          setNoteChunks((prev) => [...prev, p.appendedNotes])
          setIsExtracting(false)
          break
        }

        case 'SESSION_STOPPING':
          // Background is processing (flush + final LLM) — show loader over recording view
          setIsProcessing(true)
          break

        case 'SESSION_COMPLETED': {
          const p = msg.payload as { sessionId: string }

          // Wait for any in-flight screenshot uploads (max 8 s) so the HTML
          // saved to the DB contains public https:// URLs, not base64 blobs.
          const waitAndSave = async () => {
            const deadline = Date.now() + 8000
            while (pendingUploadsRef.current.size > 0 && Date.now() < deadline) {
              await new Promise((r) => setTimeout(r, 200))
            }

            const finalHtml = recordingEditorRef.current?.getHTML() ?? ''
            savedNotesHtml.current = finalHtml
            setIsProcessing(false)
            setView('completed')
            setIsStarting(false)

            // Persist the rich HTML (screenshots + manual edits + AI notes) to DB
            chrome.storage.local.get('clarvoAuthToken').then((result) => {
              const token = result['clarvoAuthToken'] as string | undefined
              if (token && p.sessionId) {
                fetch(`${WEB_APP_URL}/api/sessions/${p.sessionId}`, {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ notes: finalHtml }),
                }).catch((err) => console.error('[SidePanel] Failed to save final notes:', err))
              }
            })
          }

          void waitAndSave()
          break
        }

        case 'SCREENSHOT_READY': {
          const p = msg.payload as { dataUrl: string }
          insertScreenshotRef.current?.(p.dataUrl)
          break
        }

        case 'FLASHCARDS_ACTION_PLAN_READY': {
          const p = msg.payload as { flashcards: Flashcard[]; actionPlan: string }
          setFlashcards(p.flashcards ?? [])
          setActionItems(parseActionPlan(p.actionPlan ?? ''))
          setIsGenerating(false)
          setIsGenerated(true)
          setGenerateError(null)
          break
        }

        case 'GENERATE_FLASHCARDS_ACTION_PLAN_ERROR': {
          const p = msg.payload as { message: string; upgradeRequired?: boolean }
          setIsGenerating(false)
          setGenerateError(p.message)
          break
        }

        case 'ERROR': {
          const p = msg.payload as ErrorPayload
          setAlerts((prev) => [
            ...prev,
            { id: ++alertCounter, type: 'error', title: 'Error', message: p.message },
          ])
          setIsStarting(false)
          break
        }

        case 'INACTIVITY_WARNING': {
          const p = msg.payload as ErrorPayload
          setAlerts((prev) => [
            ...prev,
            { id: ++alertCounter, type: 'warning', title: 'Inactivity', message: p.message },
          ])
          break
        }
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (view === 'recording' && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          elapsedAtCapture.current = e + 1
          return e + 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [view, isPaused])

  // ── Append new AI note chunks to the editor ─────────────────────────────────
  useEffect(() => {
    if (!recordingEditor) return
    const unprocessed = noteChunks.slice(processedChunksRef.current)
    if (unprocessed.length === 0) return

    for (const chunk of unprocessed) {
      const html = markdownToHtml(chunk)
      const pos = recordingEditor.state.doc.content.size
      recordingEditor.chain().insertContentAt(pos, html).run()
    }
    processedChunksRef.current = noteChunks.length
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [noteChunks, recordingEditor])

  // ── Populate completed editor when switching to completed/notes ─────────────
  useEffect(() => {
    if (view === 'completed' && completedPage === 'notes' && completedEditor) {
      completedEditor.commands.setContent(savedNotesHtml.current || '<p></p>')
    }
  }, [view, completedPage, completedEditor])

  // ── Floating formatting toolbar on text selection ───────────────────────────
  const updateToolbarFromSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setToolbar({ visible: false, x: 0, y: 0 })
      return
    }
    const range = sel.getRangeAt(0)
    const recDom = recordingEditor?.view.dom
    const comDom = completedEditor?.view.dom
    if (
      !recDom?.contains(range.commonAncestorContainer) &&
      !comDom?.contains(range.commonAncestorContainer)
    ) {
      setToolbar({ visible: false, x: 0, y: 0 })
      return
    }
    const rangeRect = range.getBoundingClientRect()
    const panelEl = document.querySelector('.side-panel')
    const panelRect = panelEl?.getBoundingClientRect()
    if (!panelRect) return

    const toolbarWidth = 220
    const rawX = rangeRect.left - panelRect.left + rangeRect.width / 2 - toolbarWidth / 2
    setToolbar({
      visible: true,
      x: Math.max(4, Math.min(rawX, panelRect.width - toolbarWidth - 4)),
      y: rangeRect.top - panelRect.top - 46,
    })
  }, [recordingEditor, completedEditor])

  useEffect(() => {
    document.addEventListener('selectionchange', updateToolbarFromSelection)
    return () => document.removeEventListener('selectionchange', updateToolbarFromSelection)
  }, [updateToolbarFromSelection])

  // ── GSAP: Idle entrance ─────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (view !== 'idle' || !idleRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('.idle-glyph', { scale: 0.6, opacity: 0, duration: 0.6, ease: 'back.out(1.7)' })
      gsap.from('.idle-title', { y: 12, opacity: 0, duration: 0.5, delay: 0.15, ease: 'power3.out' })
      gsap.from('.idle-body', { y: 12, opacity: 0, duration: 0.5, delay: 0.25, ease: 'power3.out' })
    }, idleRef)
    return () => ctx.revert()
  }, [view])

  // ── GSAP: Detected entrance ─────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (view !== 'detected' || !detectedRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('.detected-icon', { scale: 0.6, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' })
      gsap.from('.detected-title', { y: 12, opacity: 0, duration: 0.5, delay: 0.1, ease: 'power3.out' })
      gsap.from('.detected-video-title', { y: 12, opacity: 0, duration: 0.5, delay: 0.2, ease: 'power3.out' })
      gsap.from('.detected-body', { y: 12, opacity: 0, duration: 0.5, delay: 0.3, ease: 'power3.out' })
      gsap.from('.sp-start-btn', { scale: 0.9, duration: 0.4, delay: 0.35, ease: 'back.out(1.4)' })
    }, detectedRef)
    return () => ctx.revert()
  }, [view])

  // ── GSAP: Recording entrance + waveform ─────────────────────────────────────
  useLayoutEffect(() => {
    if (view !== 'recording' || !recordingRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('.sp-rec-badge, .sp-timer, .sp-stop-btn', {
        y: -8, opacity: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out',
      })

      if (waveRef.current) {
        const bars = waveRef.current.querySelectorAll('.wave-bar')
        waveTimeline.current = gsap.timeline({ repeat: -1 })
        bars.forEach((bar, i) => {
          gsap.set(bar, { scaleY: 0.3 })
          waveTimeline.current!.to(bar, {
            scaleY: gsap.utils.random(0.5, 1),
            duration: gsap.utils.random(0.4, 0.8),
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: i * 0.08,
          }, 0)
        })
      }

      gsap.from('.sp-editor-area', {
        y: 16, opacity: 0, duration: 0.5, delay: 0.2, ease: 'power3.out',
      })
    }, recordingRef)

    return () => {
      waveTimeline.current?.kill()
      waveTimeline.current = null
      ctx.revert()
    }
  }, [view])

  // ── GSAP: Pause/resume waveform ─────────────────────────────────────────────
  useEffect(() => {
    if (isPaused) waveTimeline.current?.pause()
    else waveTimeline.current?.resume()
  }, [isPaused])

  // ── Auto-scroll scroll areas during node drag (screenshot drag) ──────────────
  useEffect(() => {
    const ZONE = 60
    const SPEED = 10
    const attachDragScroll = (el: HTMLDivElement | null) => {
      if (!el) return () => {}
      const onDragOver = (e: DragEvent) => {
        const rect = el.getBoundingClientRect()
        const y = e.clientY
        const distTop = y - rect.top
        const distBottom = rect.bottom - y
        if (distTop < ZONE) {
          el.scrollTop -= SPEED * (1 - distTop / ZONE)
        } else if (distBottom < ZONE) {
          el.scrollTop += SPEED * (1 - distBottom / ZONE)
        }
      }
      el.addEventListener('dragover', onDragOver)
      return () => el.removeEventListener('dragover', onDragOver)
    }
    const cleanupRecording = attachDragScroll(recordingScrollRef.current)
    const cleanupCompleted = attachDragScroll(completedScrollRef.current)
    return () => { cleanupRecording(); cleanupCompleted() }
  }, [view])

  // ── GSAP: Completed entrance ─────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (view !== 'completed' || !completedRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('.sp-sidebar', { x: -20, opacity: 0, duration: 0.4, ease: 'power2.out' })
      gsap.from('.sp-notes-header', { y: -8, opacity: 0, duration: 0.4, delay: 0.1, ease: 'power2.out' })
      gsap.from('.sp-action-bar', { y: 16, opacity: 0, duration: 0.4, delay: 0.2, ease: 'power2.out' })
    }, completedRef)
    return () => ctx.revert()
  }, [view])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    setIsStarting(true)
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'START_SESSION',
        payload: {},
        timestamp: Date.now(),
      })
      const res = response as { ok?: boolean; error?: string } | null
      if (!res?.ok) setIsStarting(false)
    } catch {
      setIsStarting(false)
    }
  }, [])

  const handleEndSession = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'STOP_SESSION', payload: {}, timestamp: Date.now() })
  }, [])

  const handleTogglePause = useCallback(() => {
    if (isPaused) {
      chrome.runtime.sendMessage({ type: 'RESUME_SESSION', payload: {}, timestamp: Date.now() })
      return
    }
    chrome.runtime.sendMessage({ type: 'PAUSE_SESSION', payload: {}, timestamp: Date.now() })
  }, [isPaused])

  const dismissAlert = useCallback((id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleDiscardSession = useCallback(() => {
    setShowDiscardConfirm(true)
  }, [])

  const handleClose = useCallback(() => {
    setView('idle')
    setSessionId(null)
    setVideoTitle('')
    setElapsed(0)
    elapsedAtCapture.current = 0
    setLiveTranscript('')
    setNoteChunks([])
    processedChunksRef.current = 0
    savedNotesHtml.current = ''
    recordingEditorRef.current?.commands.clearContent()
    setAlerts([])
    setIsPaused(false)
    setIsStarting(false)
    setFlashcards([])
    setActionItems([])
    setCompletedPage('notes')
    setIsGenerating(false)
    setIsGenerated(false)
    setGenerateError(null)
  }, [])

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardConfirm(false)
    handleClose()  // Optimistic — reset UI immediately
    // Fire-and-forget: background handles billing update + server delete
    chrome.runtime.sendMessage({ type: 'DISCARD_SESSION', payload: {}, timestamp: Date.now() })
  }, [handleClose])

  const handleCancelDiscard = useCallback(() => {
    setShowDiscardConfirm(false)
  }, [])



  // ── Screenshot capture ─────────────────────────────────────────
  const insertScreenshot = useCallback((dataUrl: string) => {
    const t = elapsedAtCapture.current
    const targetEditor = view === 'recording' ? recordingEditor : completedEditor
    if (!targetEditor) return

    // Unique ID for tracking this screenshot's upload lifecycle
    const ssId = `ss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    // ➊ Insert immediately with base64 — instant feedback, no UX delay
    targetEditor.chain().focus().insertContent({
      type: 'screenshot',
      attrs: { src: dataUrl, timestamp: formatTime(t), caption: '', id: ssId },
    }).run()

    setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    // ➋ Upload in background — swap base64 for a public Supabase URL
    const currentSessionId = sessionIdRef.current
    if (!currentSessionId) return

    pendingUploadsRef.current.add(ssId)
    chrome.storage.local.get('clarvoAuthToken').then((result) => {
      const token = result['clarvoAuthToken'] as string | undefined
      if (!token) { pendingUploadsRef.current.delete(ssId); return }

      fetch(`${WEB_APP_URL}/api/upload-screenshot`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, sessionId: currentSessionId, screenshotId: ssId }),
      })
        .then((r) => r.json())
        .then(({ url }: { url?: string }) => {
          pendingUploadsRef.current.delete(ssId)
          if (!url) return
          // Update the node's src in whichever editor contains it
          for (const ed of [recordingEditorRef.current, completedEditorRef.current]) {
            if (!ed) continue
            let found = false
            ed.state.doc.descendants((node, pos) => {
              if (found) return false
              if (node.type.name === 'screenshot' && (node.attrs as { id: string }).id === ssId) {
                ed.view.dispatch(
                  ed.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: url })
                )
                found = true
                return false
              }
            })
            if (found) break
          }
        })
        .catch(() => { pendingUploadsRef.current.delete(ssId) })
    })
  }, [view, recordingEditor, completedEditor])

  // Keep the ref current so the message handler (which has [] deps) always calls the latest version
  useEffect(() => {
    insertScreenshotRef.current = insertScreenshot
  }, [insertScreenshot])

  const handleScreenshotBtn = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'TRIGGER_SCREENSHOT', payload: {}, timestamp: Date.now() })
  }, [])

  // ── Formatting toolbar ─────────────────────────────────────────
  const applyFormat = useCallback((format: string, value?: string) => {
    const editor = recordingEditor?.isFocused ? recordingEditor
      : completedEditor?.isFocused ? completedEditor
      : recordingEditor
    if (!editor) return
    const chain = editor.chain().focus()
    switch (format) {
      case 'bold': chain.toggleBold().run(); break
      case 'italic': chain.toggleItalic().run(); break
      case 'underline': chain.toggleUnderline().run(); break
      case 'strikeThrough': chain.toggleStrike().run(); break
      case 'hiliteColor': chain.toggleHighlight({ color: value ?? '' }).run(); break
      case 'formatBlock':
        if (value === 'pre') chain.toggleCodeBlock().run()
        break
    }
    setToolbar({ visible: false, x: 0, y: 0 })
  }, [recordingEditor, completedEditor])

  const applyLink = useCallback(() => {
    const url = prompt('Enter URL (include https://):')
    if (url) {
      const editor = recordingEditor?.isFocused ? recordingEditor : completedEditor
      editor?.chain().focus().setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run()
    }
    setToolbar({ visible: false, x: 0, y: 0 })
  }, [recordingEditor, completedEditor])

  // ── Flashcard / Action Plan generation ────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (isGenerating) return
    setIsGenerating(true)
    setGenerateError(null)
    chrome.runtime.sendMessage({ type: 'GENERATE_FLASHCARDS_ACTION_PLAN', payload: {}, timestamp: Date.now() })
  }, [isGenerating])

  // ── Export to Notion ───────────────────────────────────────────────────────
  const handleExportToNotion = useCallback(async () => {
    if (!sessionId || isExportingNotion) return
    setIsExportingNotion(true)
    setNotionExportError(null)
    setNotionExportUrl(null)

    const result = await chrome.storage.local.get('clarvoAuthToken')
    const token = result['clarvoAuthToken'] as string | undefined
    if (!token) {
      setNotionExportError('Not signed in. Please sign in via the web app.')
      setIsExportingNotion(false)
      return
    }

    let data: { success?: boolean; notionPageUrl?: string; error?: string; notionRequired?: boolean }
    try {
      const res = await fetch(`${WEB_APP_URL}/api/export/notion`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      data = await res.json()
    } catch {
      setNotionExportError('Network error. Please try again.')
      setIsExportingNotion(false)
      return
    }

    if (data.notionRequired) {
      chrome.tabs.create({ url: `${WEB_APP_URL}/connect-notion?return_to=${encodeURIComponent(`/app/sessions/${sessionId}`)}` })
    } else if (data.success && data.notionPageUrl) {
      setNotionExportUrl(data.notionPageUrl)
      chrome.tabs.create({ url: data.notionPageUrl })
    } else {
      setNotionExportError(data.error ?? 'Export failed. Please try again.')
    }
    setIsExportingNotion(false)
  }, [sessionId, isExportingNotion])

  // ── Action plan handlers ───────────────────────────────────────────────────
  const toggleActionItem = useCallback((id: number) => {
    setActionItems((prev) => prev.map((item) => item.id === id ? { ...item, completed: !item.completed } : item))
  }, [])

  const addActionItem = useCallback(() => {
    const text = newActionText.trim()
    if (!text) return
    setActionItems((prev) => [...prev, { id: ++actionItemCounter, text, completed: false }])
    setNewActionText('')
  }, [newActionText])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="side-panel">
      {/* ── Header ── */}
      <header className="sp-header">
        <div className="sp-logo">
          <div className="sp-logo-icon">✦</div>
          Clarvo
        </div>
        {view === 'recording' && (
          <>
            <div className={`sp-rec-badge ${isPaused ? 'paused' : ''}`}>
              {isPaused ? (
                <>
                  <span className="sp-pause-icon">❚❚</span>
                  PAUSED
                </>
              ) : (
                <>
                  <span className="sp-pulse" />
                  REC
                </>
              )}
            </div>
            <span className="sp-timer">{formatTime(elapsed)}</span>
            <button className="sp-ctrl-btn sp-pause-btn" onClick={handleTogglePause}>
              {isPaused ? '▶' : '❚❚'}
            </button>
            <button className="sp-stop-btn" onClick={handleEndSession}>
              ⏹ End
            </button>
          </>
        )}
        {view === 'completed' && (
          <span className="sp-done-badge">✓ Done</span>
        )}
      </header>

      {/* ── Alerts ── */}
      {alerts.map((alert) => (
        <div key={alert.id} className={`sp-alert ${alert.type}`}>
          <div className="sp-alert-header">
            <span className="sp-alert-icon">{alert.type === 'error' ? '✕' : '⚠'}</span>
            <span className="sp-alert-title">{alert.title}</span>
          </div>
          <p>{alert.message}</p>
          <button className="sp-dismiss" onClick={() => dismissAlert(alert.id)}>
            Dismiss
          </button>
        </div>
      ))}

      {/* ═══ IDLE STATE ═══ */}
      {view === 'idle' && (
        <div className="sp-idle" ref={idleRef}>
          <div className="idle-glyph">🎧</div>
          <h2 className="idle-title">No video detected</h2>
          <p className="idle-body">
            Navigate to a page with a video (YouTube, Coursera, etc.) to get started.
          </p>
        </div>
      )}

      {/* ═══ DETECTED STATE ═══ */}
      {view === 'detected' && (
        <div className="sp-detected" ref={detectedRef}>
          <div className="detected-icon">🎬</div>
          <h2 className="detected-title">Video Detected</h2>
          <p className="detected-video-title">{videoTitle || 'Untitled Video'}</p>
          <p className="detected-body">
            Click below to start capturing audio and generating AI notes.
          </p>
          <button className="sp-start-btn" onClick={handleStart} disabled={isStarting}>
            {isStarting ? '⏳ Starting…' : '▶ Start Session'}
          </button>
        </div>
      )}

      {/* ═══ RECORDING STATE ═══ */}
      {view === 'recording' && (
        <div className="sp-recording" ref={recordingRef}>
          {/* Video info bar */}
          {videoTitle && (
            <div className="session-video-bar">
              <span className="video-bar-label">SOURCE</span>
              <span className="video-bar-title">{videoTitle}</span>
            </div>
          )}

          {/* Waveform visualizer */}
          <div className="wave-container">
            <div className="wave-bars" ref={waveRef}>
              {Array.from({ length: WAVE_BAR_COUNT }).map((_, i) => (
                <div key={i} className="wave-bar" />
              ))}
            </div>
            <span className="wave-label">
              {isPaused ? 'Paused…' : isExtracting ? '✦ Thinking…' : 'Listening…'}
            </span>
          </div>

          {/* Persistent formatting bar */}
          <div className="sp-format-bar">
            <button className="sp-format-btn" title="Bold" onMouseDown={() => applyFormat('bold')}><strong>B</strong></button>
            <button className="sp-format-btn" title="Italic" onMouseDown={() => applyFormat('italic')}><em>I</em></button>
            <button className="sp-format-btn" title="Underline" onMouseDown={() => applyFormat('underline')}><u>U</u></button>
            <button className="sp-format-btn" title="Strikethrough" onMouseDown={() => applyFormat('strikeThrough')}><s>S</s></button>
            <div className="sp-format-sep" />
            <button className="sp-format-btn highlight" title="Highlight" onMouseDown={() => applyFormat('hiliteColor', 'rgba(108,99,255,0.25)')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 14.5l-10-10L7 6 6 5l-2 2 1 1-3 3 5.5 5.5L5 19l1 1 3.5-2.5L15 23l2-2-5-5 4-4 1 1 2-2-1-1 2-2-1.5-1.5z"/></svg>
            </button>
            <button className="sp-format-btn" title="Link" onMouseDown={applyLink}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
          </div>

          {/* Live transcript section */}
          <div className="sp-live-transcript">
            <div className="sp-live-transcript-label">
              <span className="sp-live-dot" />
              Live Transcript
            </div>
            <div className="sp-live-transcript-text">
              {liveTranscript ? (
                <>
                  {liveTranscript}
                  {!isPaused && <span className="sp-blink-cursor" />}
                </>
              ) : (
                <span className="sp-live-transcript-placeholder">Waiting for audio…</span>
              )}
            </div>
          </div>

          {/* Processing overlay — shown while background flushes and runs final LLM */}
          {isProcessing && (
            <div className="sp-processing-overlay">
              <div className="sp-processing-spinner" />
              <p className="sp-processing-text">Processing session notes…</p>
            </div>
          )}

          {/* Unified editor area */}
          <div className="sp-scroll-area sp-editor-area" ref={recordingScrollRef}>
            {noteChunks.length === 0 && !isExtracting && (
              <div className="editor-placeholder">
                <p>AI notes will appear here as the session progresses.</p>
                <p className="editor-placeholder-hint">You can type your own notes at any time — AI always appends below.</p>
              </div>
            )}
            {isExtracting && noteChunks.length === 0 && (
              <div className="shimmer-loading">
                <div className="shimmer-line" style={{ width: '80%' }} />
                <div className="shimmer-line" style={{ width: '65%' }} />
                <div className="shimmer-line" style={{ width: '50%' }} />
                <p className="shimmer-hint">AI is extracting key concepts…</p>
              </div>
            )}
            <EditorContent editor={recordingEditor} />
            <div ref={notesEndRef} />
          </div>

          {/* Bottom bar with screenshot button + discard */}
          <div className="sp-bottom-bar">
            <button className="sp-screenshot-btn" onClick={handleScreenshotBtn} title="Capture screenshot (Ctrl+K)" disabled={isProcessing}>
              <span className="screenshot-icon">📷</span>
              Screenshot
            </button>
            <button className="sp-discard-btn" onClick={handleDiscardSession} disabled={isProcessing}>
              🗑 Discard
            </button>
          </div>
        </div>
      )}

      {/* ═══ COMPLETED STATE ═══ */}
      {view === 'completed' && (
        <div className="sp-completed" ref={completedRef}>
          {/* Left sidebar */}
          <div className={`sp-sidebar ${isSidebarExpanded ? 'expanded' : ''}`}>
            <nav className="sp-sidebar-nav">
              <button
                className={`sp-sidebar-item ${completedPage === 'notes' ? 'active' : ''}`}
                onClick={() => setCompletedPage('notes')}
                title="Notes"
              >
                <span className="sidebar-icon">📝</span>
                {isSidebarExpanded && <span className="sidebar-label">Notes</span>}
              </button>
              <button
                className={`sp-sidebar-item ${completedPage === 'flashcards' ? 'active' : ''}`}
                onClick={() => setCompletedPage('flashcards')}
                title="Flashcards"
              >
                <span className="sidebar-icon">🃏</span>
                {isSidebarExpanded && <span className="sidebar-label">Flashcards</span>}
              </button>
              <button
                className={`sp-sidebar-item ${completedPage === 'action-plan' ? 'active' : ''}`}
                onClick={() => setCompletedPage('action-plan')}
                title="Action Plan"
              >
                <span className="sidebar-icon">✅</span>
                {isSidebarExpanded && <span className="sidebar-label">Action Plan</span>}
              </button>
            </nav>
            <button
              className="sp-sidebar-toggle"
              onClick={() => setIsSidebarExpanded((v) => !v)}
              title={isSidebarExpanded ? 'Collapse' : 'Expand'}
            >
              {isSidebarExpanded ? '‹' : '›'}
            </button>
          </div>

          {/* Main content */}
          <div className="sp-completed-main">
            {/* ── NOTES PAGE ── */}
            {completedPage === 'notes' && (
              <>
                <div className="sp-notes-header">
                  <span className="sp-complete-badge">✓ Session Complete</span>
                  <span className="sp-session-title" title={videoTitle}>{videoTitle || 'Session Notes'}</span>
                </div>

                {/* Persistent formatting bar for completed notes */}
                <div className="sp-format-bar">
                  <button className="sp-format-btn" title="Bold" onMouseDown={() => applyFormat('bold')}><strong>B</strong></button>
                  <button className="sp-format-btn" title="Italic" onMouseDown={() => applyFormat('italic')}><em>I</em></button>
                  <button className="sp-format-btn" title="Underline" onMouseDown={() => applyFormat('underline')}><u>U</u></button>
                  <button className="sp-format-btn" title="Strikethrough" onMouseDown={() => applyFormat('strikeThrough')}><s>S</s></button>
                  <div className="sp-format-sep" />
                  <button className="sp-format-btn highlight" title="Highlight" onMouseDown={() => applyFormat('hiliteColor', 'rgba(108,99,255,0.25)')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 14.5l-10-10L7 6 6 5l-2 2 1 1-3 3 5.5 5.5L5 19l1 1 3.5-2.5L15 23l2-2-5-5 4-4 1 1 2-2-1-1 2-2-1.5-1.5z"/></svg>
                  </button>
                  <button className="sp-format-btn" title="Link" onMouseDown={applyLink}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </button>
                </div>

                <div className="sp-scroll-area sp-editor-area" ref={completedScrollRef}>
                  {savedNotesHtml.current === '' && (
                    <div className="editor-placeholder">
                      <p>No notes were generated in this session.</p>
                    </div>
                  )}
                  <EditorContent editor={completedEditor} />
                  <div ref={notesEndRef} />
                </div>

                <div className="sp-action-bar">
                  <div className="sp-action-grid">
                    <a
                      className="sp-action-btn sp-action-primary"
                      href={`${WEB_APP_URL}/app/sessions/${sessionId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Dashboard →
                    </a>
                    <button
                      className={`sp-action-btn sp-action-secondary ${isGenerating ? 'loading' : ''}`}
                      onClick={handleGenerate}
                      disabled={isGenerating || isGenerated}
                    >
                      {isGenerating ? (
                        <><span className="sp-spinner" />Generating…</>
                      ) : (
                        '✦ Flashcards'
                      )}
                    </button>
                    <button
                      className={`sp-action-btn sp-action-ghost ${isExportingNotion ? 'loading' : ''}`}
                      onClick={handleExportToNotion}
                      disabled={isExportingNotion || !sessionId}
                      title="Export notes, flashcards & action plan to Notion"
                    >
                      {isExportingNotion ? (
                        <><span className="sp-spinner" />Exporting…</>
                      ) : notionExportUrl ? (
                        '✓ Notion ↗'
                      ) : (
                        'Export to Notion'
                      )}
                    </button>
                    <button className="sp-action-btn sp-action-ghost" onClick={handleClose}>
                      Close
                    </button>
                  </div>
                  {generateError && <p className="sp-generate-error">{generateError}</p>}
                  {notionExportError && <p className="sp-generate-error">{notionExportError}</p>}
                </div>
              </>
            )}

            {/* ── FLASHCARDS PAGE ── */}
            {completedPage === 'flashcards' && (
              <div className="sp-page">
                <div className="sp-page-header">
                  <span className="sp-page-title-text">Flashcards</span>
                  {flashcards.length > 0 && (
                    <span className="sp-count-badge">{flashcards.length} cards</span>
                  )}
                </div>

                {flashcards.length === 0 ? (
                  <div className="sp-empty-state">
                    <div className="sp-empty-icon">🃏</div>
                    <h3 className="sp-empty-title">No flashcards yet</h3>
                    <p className="sp-empty-body">Generate flashcards from your session notes to review and retain key concepts.</p>
                    {generateError && <p className="sp-generate-error">{generateError}</p>}
                    <button
                      className={`sp-gen-btn ${isGenerating ? 'loading' : ''}`}
                      onClick={handleGenerate}
                      disabled={isGenerating || isGenerated}
                    >
                      {isGenerating ? <><span className="sp-spinner" /> Generating…</> : '✦ Generate Flashcards & Action Plan'}
                    </button>
                  </div>
                ) : (
                  <div className="sp-flashcard-area">
                    <div className="sp-card-counter">Card {currentCardIndex + 1} of {flashcards.length}</div>
                    <div
                      className={`sp-flashcard ${isCardFlipped ? 'flipped' : ''}`}
                      onClick={() => setIsCardFlipped((f) => !f)}
                    >
                      <div className="sp-card-inner">
                        <div className="sp-card-front">
                          <span className="sp-card-side-label">QUESTION</span>
                          <p>{flashcards[currentCardIndex]?.front}</p>
                          <span className="sp-card-flip-hint">Tap to reveal answer</span>
                        </div>
                        <div className="sp-card-back">
                          <span className="sp-card-side-label">ANSWER</span>
                          <p>{flashcards[currentCardIndex]?.back}</p>
                          <span className="sp-card-flip-hint">Tap to see question</span>
                        </div>
                      </div>
                    </div>
                    <div className="sp-card-nav">
                      <button
                        className="sp-card-arrow"
                        onClick={() => { setCurrentCardIndex((i) => Math.max(0, i - 1)); setIsCardFlipped(false) }}
                        disabled={currentCardIndex === 0}
                      >‹</button>
                      <div className="sp-card-dots">
                        {flashcards.slice(0, Math.min(flashcards.length, 8)).map((_, i) => (
                          <span
                            key={i}
                            className={`sp-card-dot ${i === currentCardIndex ? 'active' : ''}`}
                            onClick={() => { setCurrentCardIndex(i); setIsCardFlipped(false) }}
                          />
                        ))}
                        {flashcards.length > 8 && <span className="sp-card-dot-more">…</span>}
                      </div>
                      <button
                        className="sp-card-arrow"
                        onClick={() => { setCurrentCardIndex((i) => Math.min(flashcards.length - 1, i + 1)); setIsCardFlipped(false) }}
                        disabled={currentCardIndex === flashcards.length - 1}
                      >›</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ACTION PLAN PAGE ── */}
            {completedPage === 'action-plan' && (
              <div className="sp-page">
                <div className="sp-page-header">
                  <span className="sp-page-title-text">Action Plan</span>
                  {actionItems.length > 0 && (
                    <span className="sp-count-badge">{actionItems.length} tasks</span>
                  )}
                </div>

                {actionItems.length === 0 ? (
                  <div className="sp-empty-state">
                    <div className="sp-empty-icon">✅</div>
                    <h3 className="sp-empty-title">No action plan yet</h3>
                    <p className="sp-empty-body">Generate a structured action plan from your session to turn learning into results.</p>
                    {generateError && <p className="sp-generate-error">{generateError}</p>}
                    <button
                      className={`sp-gen-btn ${isGenerating ? 'loading' : ''}`}
                      onClick={handleGenerate}
                      disabled={isGenerating || isGenerated}
                    >
                      {isGenerating ? <><span className="sp-spinner" /> Generating…</> : '✦ Generate Flashcards & Action Plan'}
                    </button>
                  </div>
                ) : (
                  <div className="sp-action-plan-area">
                    <ul className="sp-checklist">
                      {actionItems.map((item) => (
                        <li key={item.id} className={`sp-checklist-item ${item.completed ? 'done' : ''}`}>
                          <button
                            className="sp-checkbox"
                            onClick={() => toggleActionItem(item.id)}
                            aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {item.completed ? '✓' : ''}
                          </button>
                          <span className="sp-checklist-text">{item.text}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="sp-add-task">
                      <input
                        className="sp-add-task-input"
                        placeholder="Add a task…"
                        value={newActionText}
                        onChange={(e) => setNewActionText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addActionItem() }}
                      />
                      <button className="sp-add-task-btn" onClick={addActionItem}>+</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floating formatting toolbar ── */}
      {toolbar.visible && (
        <div
          ref={toolbarRef}
          className="floating-toolbar"
          style={{ top: toolbar.y, left: toolbar.x }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button className="ft-btn" title="Bold" onMouseDown={() => applyFormat('bold')}><strong>B</strong></button>
          <button className="ft-btn" title="Italic" onMouseDown={() => applyFormat('italic')}><em>I</em></button>
          <button className="ft-btn" title="Underline" onMouseDown={() => applyFormat('underline')}><u>U</u></button>
          <button className="ft-btn" title="Strikethrough" onMouseDown={() => applyFormat('strikeThrough')}><s>S</s></button>
          <div className="ft-divider" />
          <button className="ft-btn" title="Code" onMouseDown={() => applyFormat('formatBlock', 'pre')}>{'<>'}</button>
          <button className="ft-btn" title="Link" onMouseDown={applyLink}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </button>
          <button className="ft-btn ft-highlight" title="Highlight" onMouseDown={() => applyFormat('hiliteColor', 'rgba(108,99,255,0.25)')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 20h16v2H4zM18.5 4.5l-13 13-2 4.5 4.5-2 13-13-2.5-2.5zM14.5 2l2.5 2.5-1 1L13.5 3z"/></svg>
          </button>
        </div>
      )}

      {/* ── Discard confirmation dialog ── */}
      {showDiscardConfirm && (
        <div className="sp-confirm-backdrop" onClick={handleCancelDiscard}>
          <div className="sp-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sp-confirm-icon">🗑</div>
            <h3 className="sp-confirm-title">Discard this session?</h3>
            <p className="sp-confirm-body">
              Your notes and transcript will be permanently deleted. Watch time will still be counted.
            </p>
            <div className="sp-confirm-actions">
              <button className="sp-confirm-cancel" onClick={handleCancelDiscard}>
                Keep Recording
              </button>
              <button className="sp-confirm-delete" onClick={handleConfirmDiscard}>
                Discard Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
