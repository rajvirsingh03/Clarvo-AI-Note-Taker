/**
 * Background Service Worker — Clarvo AI Extension
 *
 * Responsibilities:
 * - State machine: IDLE → RECORDING → COMPLETED → POST_PROCESSING
 * - Manages the Offscreen Document for audio capture
 * - Batches audio into 20–30s chunks, sends to Deepgram Nova-2
 * - Every 3 minutes: sends accumulated transcript to /api/ai/extract
 * - Crash recovery: persists state to chrome.storage.local
 * - Handles Ctrl+K screenshot pipeline
 *
 * Security (extension-security skill):
 * - All API keys come from process.env at build time (Plasmo .env)
 * - Typed message bus — all messages validated before processing
 * - No eval, no dynamic script injection
 */

import type {
  ExtensionMessage,
  ExtensionSessionState,
  SessionState,
  TranscriptReadyPayload,
  NotesUpdatedPayload,
  ErrorPayload,
  ScreenshotReadyPayload,
} from '@clarvo/types'

const WEB_APP_URL = process.env.PLASMO_PUBLIC_WEB_APP_URL ?? 'http://localhost:3000'
const EXTRACTION_INTERVAL_MS = 3 * 60 * 1000  // 3 minutes
const INACTIVITY_TIMEOUT_MS  = 5 * 60 * 1000  // 5 minutes

// ── Persisted State ──────────────────────────────────────────────────────────

const DEFAULT_STATE: ExtensionSessionState = {
  sessionId: null,
  state: null,
  videoUrl: null,
  videoTitle: null,
  chunkCount: 0,
  lastActivityAt: null,
  accumulatedTranscript: '',
}

async function getState(): Promise<ExtensionSessionState> {
  const result = await chrome.storage.local.get('clarvoSession')
  return (result['clarvoSession'] as ExtensionSessionState) ?? DEFAULT_STATE
}

async function setState(updates: Partial<ExtensionSessionState>): Promise<void> {
  const current = await getState()
  await chrome.storage.local.set({ clarvoSession: { ...current, ...updates } })
}

async function clearState(): Promise<void> {
  await chrome.storage.local.set({ clarvoSession: DEFAULT_STATE })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let extractionTimer: ReturnType<typeof setInterval> | null = null
let inactivityTimer: ReturnType<typeof setTimeout> | null = null

function broadcastToSidePanel(msg: ExtensionMessage<unknown>): void {
  chrome.runtime.sendMessage(msg).catch(() => {
    // Side panel may be closed — ignore
  })
}

const AUTH_TOKEN_KEY = 'clarvoAuthToken'

async function getUserAuthToken(): Promise<string | null> {
  // Token is written to local storage by the popup (lib/supabase.ts syncTokenToStorage)
  const result = await chrome.storage.local.get(AUTH_TOKEN_KEY)
  return (result[AUTH_TOKEN_KEY] as string) ?? null
}

// ── Session Lifecycle ────────────────────────────────────────────────────────

async function startSession(
  payload: { videoSrc: string; pageTitle: string; pageUrl: string },
  tabId?: number
): Promise<void> {
  const token = await getUserAuthToken()
  if (!token) {
    broadcastToSidePanel({
      type: 'ERROR',
      payload: { code: 'SESSION_EXPIRED', message: 'Please sign in to Clarvo AI.', recoverable: true } as ErrorPayload,
      timestamp: Date.now(),
    })
    return
  }

  // Create session via web API
  const res = await fetch(`${WEB_APP_URL}/api/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl: payload.videoSrc, videoTitle: payload.pageTitle }),
  })

  if (!res.ok) {
    const data = await res.json()
    broadcastToSidePanel({
      type: 'ERROR',
      payload: { code: 'AI_API_ERROR', message: data.error ?? 'Failed to create session', recoverable: false } as ErrorPayload,
      timestamp: Date.now(),
    })
    return
  }

  const { session } = await res.json()

  await setState({
    sessionId: session.id,
    state: 'RECORDING',
    videoUrl: payload.videoSrc,
    videoTitle: payload.pageTitle,
    chunkCount: 0,
    lastActivityAt: Date.now(),
    accumulatedTranscript: '',
  })

  broadcastToSidePanel({ type: 'SESSION_STATE_CHANGED', payload: { sessionId: session.id, previousState: null, newState: 'RECORDING' as SessionState }, timestamp: Date.now() })

  // Open the side panel so the user sees notes immediately
  if (tabId !== undefined) {
    try {
      await (chrome.sidePanel as unknown as { open: (opts: { tabId: number }) => Promise<void> }).open({ tabId })
    } catch {
      // sidePanel.open may fail if the tab is not focused; non-fatal
    }
  }

  // Start offscreen audio capture
  await ensureOffscreenDocument()
  chrome.runtime.sendMessage({ type: 'START_AUDIO_CAPTURE', payload: {} })

  // Start 3-minute extraction interval
  extractionTimer = setInterval(runExtractionCycle, EXTRACTION_INTERVAL_MS)

  // Start inactivity monitor
  resetInactivityTimer()
}

async function stopSession(): Promise<void> {
  const s = await getState()
  if (!s.sessionId) return

  // Stop audio capture
  chrome.runtime.sendMessage({ type: 'STOP_AUDIO_CAPTURE', payload: {} })

  if (extractionTimer) { clearInterval(extractionTimer); extractionTimer = null }
  if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null }

  // Run final extraction pass
  if (s.accumulatedTranscript.trim()) {
    await runExtractionCycle()
  }

  await setState({ state: 'COMPLETED' })
  broadcastToSidePanel({ type: 'SESSION_COMPLETED', payload: { sessionId: s.sessionId }, timestamp: Date.now() })
}

// ── 3-Minute Extraction Cycle ────────────────────────────────────────────────

async function runExtractionCycle(): Promise<void> {
  const s = await getState()
  if (!s.sessionId || !s.accumulatedTranscript.trim()) return

  const token = await getUserAuthToken()
  if (!token) return

  try {
    // Get last 500 words of existing notes for context window
    const notesRes = await fetch(`${WEB_APP_URL}/api/sessions/${s.sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const { session } = await notesRes.json()
    const existingNotesTail = session?.notes
      ? session.notes.split(' ').slice(-500).join(' ')
      : ''

    const res = await fetch(`${WEB_APP_URL}/api/ai/extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: s.sessionId,
        chunk: s.accumulatedTranscript,
        existingNotesTail,
      }),
    })

    if (res.ok) {
      const { extractedNotes } = await res.json()
      broadcastToSidePanel({
        type: 'NOTES_UPDATED',
        payload: { sessionId: s.sessionId, appendedNotes: extractedNotes, totalNotes: '' } as NotesUpdatedPayload,
        timestamp: Date.now(),
      })
      // Clear accumulated transcript after successful extraction
      await setState({ accumulatedTranscript: '' })
    }
  } catch (err) {
    console.error('[Clarvo background] Extraction cycle failed:', err)
  }
}

// ── Offscreen Document (audio capture) ──────────────────────────────────────

async function ensureOffscreenDocument(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  })
  if (existingContexts.length > 0) return

  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL('offscreen.html'),
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Audio capture for Clarvo AI learning session transcription.',
  })
}

// ── Inactivity Detection ─────────────────────────────────────────────────────

function resetInactivityTimer(): void {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(async () => {
    broadcastToSidePanel({
      type: 'INACTIVITY_WARNING',
      payload: { code: 'INACTIVITY_TIMEOUT', message: 'No activity detected. Session will auto-pause.', recoverable: true } as ErrorPayload,
      timestamp: Date.now(),
    })
    await stopSession()
  }, INACTIVITY_TIMEOUT_MS)
}

// ── Message Router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage<unknown>, _sender, sendResponse) => {
  // Validate message structure
  if (!message?.type || typeof message.timestamp !== 'number') {
    console.warn('[Clarvo background] Received malformed message:', message)
    return
  }

  switch (message.type) {
    case 'START_SESSION':
      startSession(
        message.payload as { videoSrc: string; pageTitle: string; pageUrl: string },
        _sender.tab?.id
      )
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true  // Keep channel open for async

    case 'STOP_SESSION':
      stopSession().then(() => sendResponse({ ok: true }))
      return true

    case 'TRANSCRIPT_READY': {
      const { transcript } = message.payload as TranscriptReadyPayload
      getState().then((s) => {
        setState({ accumulatedTranscript: (s.accumulatedTranscript + ' ' + transcript).trim(), lastActivityAt: Date.now() })
        resetInactivityTimer()
      })
      break
    }

    case 'SCREENSHOT_REQUESTED': {
      const screenshotPayload = message.payload as ScreenshotReadyPayload
      getState().then(async (s) => {
        if (!s.sessionId) return
        const token = await getUserAuthToken()
        if (!token) return

        await fetch(`${WEB_APP_URL}/api/ai/screenshot`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: s.sessionId,
            imageDataUrl: screenshotPayload.dataUrl,
            audioContext: s.accumulatedTranscript.split(' ').slice(-50).join(' '),
          }),
        })
      })
      break
    }

    case 'VIDEO_PLAY':
      resetInactivityTimer()
      break

    case 'VIDEO_ENDED':
      stopSession()
      break
  }
})

// ── Install Handler ──────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  clearState()
})
