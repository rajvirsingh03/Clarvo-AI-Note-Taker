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
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [newActionText, setNewActionText] = useState('')
  // Floating toolbar
  const [toolbar, setToolbar] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Refs for GSAP targets
  // Refs for GSAP targets
  const idleRef = useRef<HTMLDivElement>(null)
  const detectedRef = useRef<HTMLDivElement>(null)
  const recordingRef = useRef<HTMLDivElement>(null)
  const completedRef = useRef<HTMLDivElement>(null)
  const waveRef = useRef<HTMLDivElement>(null)
  const notesEndRef = useRef<HTMLDivElement>(null)
  const waveTimeline = useRef<gsap.core.Timeline | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Editor refs
  const editorRef = useRef<HTMLDivElement>(null)           // recording editor
  const completedEditorRef = useRef<HTMLDivElement>(null)  // completed notes editor
  const savedNotesHtml = useRef<string>('')                // saved when session ends
  const processedChunksRef = useRef(0)
  // Track elapsed for screenshot timestamps
  const elapsedAtCapture = useRef(0)
  // Ref to always hold the latest insertScreenshot (fixes stale closure in message handler)
  const insertScreenshotRef = useRef<((dataUrl: string) => void) | null>(null)

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
              if (editorRef.current) editorRef.current.innerHTML = ''
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

        case 'SESSION_COMPLETED':
          // Save editor HTML before switching to completed view
          if (editorRef.current) {
            savedNotesHtml.current = editorRef.current.innerHTML
          }
          setView('completed')
          setIsStarting(false)
          break

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
    if (!editorRef.current) return
    const unprocessed = noteChunks.slice(processedChunksRef.current)
    if (unprocessed.length === 0) return

    for (const chunk of unprocessed) {
      const html = markdownToHtml(chunk)
      const block = document.createElement('div')
      block.setAttribute('data-ai-block', 'true')
      block.innerHTML = html
      editorRef.current.appendChild(block)
      // Animate in
      gsap.from(block, { x: -8, opacity: 0, duration: 0.4, ease: 'power2.out' })
    }
    processedChunksRef.current = noteChunks.length
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [noteChunks])

  // ── Populate completed editor when switching to completed/notes ─────────────
  useEffect(() => {
    if (view === 'completed' && completedPage === 'notes' && completedEditorRef.current) {
      completedEditorRef.current.innerHTML = savedNotesHtml.current
    }
  }, [view, completedPage])

  // ── Floating formatting toolbar on text selection ───────────────────────────
  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setToolbar({ visible: false, x: 0, y: 0 })
        return
      }
      const range = sel.getRangeAt(0)
      const activeEditor = editorRef.current || completedEditorRef.current
      if (!activeEditor?.contains(range.commonAncestorContainer)) {
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
    }

    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  // ── Screenshot click handler (remove buttons inside editors) ───────────────
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const btn = (e.target as Element).closest('[data-screenshot-remove]')
      if (btn) {
        e.preventDefault()
        const id = (btn as HTMLElement).dataset.screenshotRemove
        document.querySelector(`[data-screenshot-id="${id}"]`)?.remove()
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

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
    if (editorRef.current) editorRef.current.innerHTML = ''
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

  // ── Screenshot capture ────────────────────────────────────────────────────
  const insertScreenshot = useCallback((dataUrl: string) => {
    const t = elapsedAtCapture.current
    const ssId = `ss-${Date.now()}`
    const figure = document.createElement('figure')
    figure.className = 'screenshot-block'
    figure.setAttribute('data-screenshot-id', ssId)
    figure.setAttribute('contenteditable', 'false')
    figure.innerHTML = `
      <button class="screenshot-remove" data-screenshot-remove="${ssId}" title="Remove screenshot">✕</button>
      <img src="${dataUrl}" alt="Screenshot" />
      <figcaption>📷 Screenshot at ${formatTime(t)}</figcaption>
    `

    const targetEditor = view === 'recording' ? editorRef.current : completedEditorRef.current
    if (!targetEditor) return

    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && targetEditor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const range = sel.getRangeAt(0)
      range.collapse(false)
      range.insertNode(figure)
      range.collapse(false)
      // Insert a blank paragraph after figure for continued typing
      const p = document.createElement('p')
      p.innerHTML = '<br>'
      figure.after(p)
      const newRange = document.createRange()
      newRange.setStart(p, 0)
      newRange.collapse(true)
      sel.removeAllRanges()
      sel.addRange(newRange)
    } else {
      targetEditor.appendChild(figure)
      const p = document.createElement('p')
      p.innerHTML = '<br>'
      targetEditor.appendChild(p)
    }

    gsap.from(figure, { scale: 0.95, opacity: 0, duration: 0.35, ease: 'back.out(1.5)' })
    figure.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [view])

  // Keep the ref current so the message handler (which has [] deps) always calls the latest version
  useEffect(() => {
    insertScreenshotRef.current = insertScreenshot
  }, [insertScreenshot])

  const handleScreenshotBtn = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'TRIGGER_SCREENSHOT', payload: {}, timestamp: Date.now() })
  }, [])

  // ── Formatting toolbar ────────────────────────────────────────────────────
  const applyFormat = useCallback((cmd: string, val?: string) => {
    // eslint-disable-next-line no-void
    void document.execCommand(cmd, false, val)
    setToolbar({ visible: false, x: 0, y: 0 })
  }, [])

  const applyLink = useCallback(() => {
    const url = prompt('Enter URL (include https://):')
    if (url) {
      document.execCommand('createLink', false, url)
      const sel = window.getSelection()
      if (sel?.anchorNode?.parentElement?.tagName === 'A') {
        (sel.anchorNode.parentElement as HTMLAnchorElement).target = '_blank'
        ;(sel.anchorNode.parentElement as HTMLAnchorElement).rel = 'noopener noreferrer'
      }
    }
    setToolbar({ visible: false, x: 0, y: 0 })
  }, [])

  // ── Flashcard / Action Plan generation ────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (isGenerating) return
    setIsGenerating(true)
    setGenerateError(null)
    chrome.runtime.sendMessage({ type: 'GENERATE_FLASHCARDS_ACTION_PLAN', payload: {}, timestamp: Date.now() })
  }, [isGenerating])

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

          {/* Unified editor area */}
          <div className="sp-scroll-area sp-editor-area">
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
            <div
              ref={editorRef}
              className="unified-editor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start typing your notes…"
            />
            <div ref={notesEndRef} />
          </div>

          {/* Bottom bar with screenshot button */}
          <div className="sp-bottom-bar">
            <button className="sp-screenshot-btn" onClick={handleScreenshotBtn} title="Capture screenshot (Ctrl+K)">
              <span className="screenshot-icon">📷</span>
              Screenshot
            </button>
            <span className="sp-shortcut-hint">Ctrl+K</span>
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

                <div className="sp-scroll-area sp-editor-area">
                  {savedNotesHtml.current === '' && (
                    <div className="editor-placeholder">
                      <p>No notes were generated in this session.</p>
                    </div>
                  )}
                  <div
                    ref={completedEditorRef}
                    className="unified-editor"
                    contentEditable
                    suppressContentEditableWarning
                  />
                  <div ref={notesEndRef} />
                </div>

                <div className="sp-action-bar">
                  <a
                    className="sp-action-btn sp-action-primary"
                    href={`${WEB_APP_URL}/sessions/${sessionId}`}
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
                      <>
                        <span className="sp-spinner" />
                        Generating…
                      </>
                    ) : (
                      '✦ Generate Flashcards & Action Plan'
                    )}
                  </button>
                  {generateError && <p className="sp-generate-error">{generateError}</p>}
                  <button className="sp-action-btn sp-action-ghost sp-action-disabled" disabled title="Coming soon">
                    Export to Notion
                  </button>
                  <button className="sp-action-btn sp-action-ghost" onClick={handleClose}>
                    Close
                  </button>
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
    </div>
  )
}
