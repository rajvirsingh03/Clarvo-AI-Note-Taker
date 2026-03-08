/**
 * Background Service Worker — Clarvo AI Extension
 *
 * Architecture (MV3 user-gesture compliant):
 * - Content script detects video → sends VIDEO_DETECTED → background stores & forwards to side panel
 * - User clicks "Start Session" IN THE SIDE PANEL (extension gesture) → START_SESSION
 * - Background queries active tab → tabCapture.getMediaStreamId() → works (extension gesture)
 * - Video pause/play → pause/resume MediaRecorder → saves Deepgram credits
 * - Watch time tracked = actual video play time (excludes pauses)
 *
 * State machine: IDLE → RECORDING ⇄ PAUSED → COMPLETED → POST_PROCESSING
 */

// @ts-ignore — Plasmo's url: protocol bundles offscreen.html + its scripts into the final build
import OFFSCREEN_DOCUMENT_URL from 'url:~offscreen.html'

import type {
  ExtensionMessage,
  ExtensionSessionState,
  SessionState,
  VideoDetectedPayload,
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
  watchTimeSeconds: 0,
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

// ── In-memory state (lost on SW restart — non-critical) ──────────────────────

/** Timestamp when video last started playing (for watch time calculation) */
let playStartedAt: number | null = null

/** Tracks who initiated the current pause so VIDEO_PLAY only auto-resumes video-initiated pauses */
let _pauseSource: 'video' | 'user' | null = null

/** Tab ID of the tab currently being recorded — needed to reach the content script */
let activeTabId: number | null = null

// ── Helpers ──────────────────────────────────────────────────────────────────

let extractionTimer: ReturnType<typeof setInterval> | null = null
let inactivityTimer: ReturnType<typeof setTimeout> | null = null
let transcriptPersistQueue: Promise<void> = Promise.resolve()
let _isStoppingSession = false

function startExtractionTimer(): void {
  if (extractionTimer) clearInterval(extractionTimer)
  extractionTimer = setInterval(runExtractionCycle, EXTRACTION_INTERVAL_MS)
}

function stopExtractionTimer(): void {
  if (!extractionTimer) return
  clearInterval(extractionTimer)
  extractionTimer = null
}

function broadcastToSidePanel(msg: ExtensionMessage<unknown>): void {
  chrome.runtime.sendMessage(msg).catch(() => {
    // Side panel may be closed — ignore
  })
}

/**
 * Send a message to the content script running in the active recording tab.
 * chrome.runtime.sendMessage does NOT reach content scripts — they need tabs.sendMessage.
 */
function broadcastToContentScript(msg: ExtensionMessage<unknown>): void {
  if (activeTabId == null) return
  chrome.tabs.sendMessage(activeTabId, msg).catch(() => {
    // Content script may not be present on this tab (e.g. chrome:// pages)
  })
}

const AUTH_TOKEN_KEY = 'clarvoAuthToken'

async function getUserAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(AUTH_TOKEN_KEY)
  return (result[AUTH_TOKEN_KEY] as string) ?? null
}

// ── API helper ───────────────────────────────────────────────────────────────

async function updateSessionOnServer(
  sessionId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const token = await getUserAuthToken()
  if (!token) return

  await fetch(`${WEB_APP_URL}/api/sessions/${sessionId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  }).catch((err) => {
    console.error('[Clarvo background] Failed to update session:', err)
  })
}

// ── Offscreen Document handshake ──────────────────────────────────────────────

let _offscreenReady = false
const _offscreenReadyWaiters: Array<() => void> = []
let _offscreenCreation: Promise<void> | null = null

function onOffscreenReady(): void {
  _offscreenReady = true
  for (const resolve of _offscreenReadyWaiters) resolve()
  _offscreenReadyWaiters.length = 0
}

function waitForOffscreenReady(timeoutMs = 3000): Promise<void> {
  if (_offscreenReady) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Offscreen document did not become ready in time')),
      timeoutMs
    )
    _offscreenReadyWaiters.push(() => { clearTimeout(timer); resolve() })
  })
}

async function hasOffscreenDocument(offscreenPath: string): Promise<boolean> {
  const offscreenUrl = chrome.runtime.getURL(offscreenPath)

  if (typeof chrome.runtime.getContexts === 'function') {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
      documentUrls: [offscreenUrl],
    })
    return contexts.length > 0
  }

  const swClients = (globalThis as { clients?: { matchAll: () => Promise<Array<{ url: string }>> } }).clients
  if (!swClients?.matchAll) return false

  const clientsList = await swClients.matchAll()
  return clientsList.some((client) => client.url === offscreenUrl)
}

// ── Capture confirmation handshake ────────────────────────────────────────────

let _captureResolve: ((ok: boolean) => void) | null = null
let _captureStoppedResolve: (() => void) | null = null

function waitForCaptureConfirm(timeoutMs = 5000): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      _captureResolve = null
      resolve(false)
    }, timeoutMs)
    _captureResolve = (ok) => { clearTimeout(timer); resolve(ok) }
  })
}

function waitForCaptureStopped(timeoutMs = 7000): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      _captureStoppedResolve = null
      resolve()
    }, timeoutMs)
    _captureStoppedResolve = () => {
      clearTimeout(timer)
      resolve()
    }
  })
}

// ── Offscreen Document management ────────────────────────────────────────────

async function ensureOffscreenDocument(): Promise<void> {
  const offscreenPath = OFFSCREEN_DOCUMENT_URL.startsWith('http')
    ? new URL(OFFSCREEN_DOCUMENT_URL).pathname.replace(/^\//, '')
    : OFFSCREEN_DOCUMENT_URL

  if (await hasOffscreenDocument(offscreenPath)) {
    _offscreenReady = true
    return
  }

  if (_offscreenCreation) {
    await _offscreenCreation
    _offscreenReady = true
    return
  }

  _offscreenReady = false

  _offscreenCreation = chrome.offscreen.createDocument({
    url: offscreenPath,
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Audio capture for Clarvo AI learning session transcription.',
  })

  try {
    await _offscreenCreation
    _offscreenReady = true
  } finally {
    _offscreenCreation = null
  }
}

async function destroyOffscreenDocument(): Promise<void> {
  _offscreenReady = false
  try { await chrome.offscreen.closeDocument() } catch { /* may not exist */ }
}

// ── Tab-capture stream ID helper ──────────────────────────────────────────────

async function getTabCaptureStreamId(tabId: number): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? 'tabCapture failed'))
      } else {
        resolve(id)
      }
    })
  })
}

// ── Watch Time Tracking ──────────────────────────────────────────────────────

/** Accumulate elapsed play time since last playStartedAt */
async function accumulateWatchTime(): Promise<void> {
  if (!playStartedAt) return
  const elapsed = (Date.now() - playStartedAt) / 1000
  playStartedAt = null
  const s = await getState()
  await setState({ watchTimeSeconds: (s.watchTimeSeconds || 0) + elapsed })
}

// ── Session Lifecycle ────────────────────────────────────────────────────────

async function startSession(
  payload: { videoSrc: string; pageTitle: string; pageUrl: string },
  tabId?: number
): Promise<{ ok: boolean; error?: string }> {

  // ── 1. Auth check ──────────────────────────────────────────────────────────
  const token = await getUserAuthToken()
  if (!token) {
    broadcastToSidePanel({
      type: 'ERROR',
      payload: {
        code: 'SESSION_EXPIRED',
        message: 'Please sign in to Clarvo AI first.',
        recoverable: true,
      } as ErrorPayload,
      timestamp: Date.now(),
    })
    return { ok: false, error: 'NOT_AUTHENTICATED' }
  }

  // ── 2. Create backend session (API checks billing balance) ─────────────────
  let sessionId: string
  try {
    const res = await fetch(`${WEB_APP_URL}/api/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: payload.pageTitle,videoUrl: payload.videoSrc, videoTitle: payload.pageTitle }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to create session' }))
      broadcastToSidePanel({
        type: 'ERROR',
        payload: {
          code: data.upgradeRequired ? 'SESSION_EXPIRED' : 'AI_API_ERROR',
          message: data.error ?? 'Failed to create session',
          recoverable: false,
        } as ErrorPayload,
        timestamp: Date.now(),
      })
      return { ok: false, error: data.error ?? 'API_ERROR' }
    }

    const body = await res.json()
    sessionId = body.session.id
  } catch (err) {
    broadcastToSidePanel({
      type: 'ERROR',
      payload: { code: 'NETWORK_ERROR', message: 'Network error creating session.', recoverable: true } as ErrorPayload,
      timestamp: Date.now(),
    })
    return { ok: false, error: 'NETWORK_ERROR' }
  }

  // ── 3. Prepare offscreen document (BEFORE getting streamId) ───────────────
  try {
    await ensureOffscreenDocument()
    await waitForOffscreenReady(1500).catch(() => {
      console.warn('[Clarvo background] OFFSCREEN_READY not received; continuing with createDocument guarantee')
    })
  } catch (err) {
    console.error('[Clarvo background] Offscreen document setup failed:', err)
    broadcastToSidePanel({
      type: 'ERROR',
      payload: { code: 'UNKNOWN', message: 'Audio subsystem failed to initialize.', recoverable: true } as ErrorPayload,
      timestamp: Date.now(),
    })
    return { ok: false, error: 'OFFSCREEN_TIMEOUT' }
  }

  // ── 4. Get tabId from active tab if not provided ──────────────────────────
  if (tabId === undefined) {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
      tabId = activeTab?.id
    } catch { /* ignore */ }
  }

  // Store for content script messaging
  activeTabId = tabId ?? null
  console.log('[Clarvo background] 🎯 activeTabId set to:', activeTabId)

  if (tabId === undefined) {
    broadcastToSidePanel({
      type: 'ERROR',
      payload: { code: 'UNKNOWN', message: 'Cannot capture audio: no active tab found.', recoverable: true } as ErrorPayload,
      timestamp: Date.now(),
    })
    return { ok: false, error: 'NO_TAB_ID' }
  }

  // ── 5. Acquire tab-capture stream ID ──────────────────────────────────────
  let streamId: string
  try {
    streamId = await getTabCaptureStreamId(tabId)
  } catch (err) {
    console.error('[Clarvo background] tabCapture failed:', err)
    broadcastToSidePanel({
      type: 'ERROR',
      payload: {
        code: 'UNKNOWN',
        message: 'Failed to capture tab audio. Make sure you\'re on a page with a video playing.',
        recoverable: true,
      } as ErrorPayload,
      timestamp: Date.now(),
    })
    return { ok: false, error: 'TAB_CAPTURE_FAILED' }
  }

  // ── 6. Start capture — wait for offscreen confirmation ────────────────────
  const capturePromise = waitForCaptureConfirm(6000)
  chrome.runtime.sendMessage({
    type: 'START_AUDIO_CAPTURE',
    payload: { streamId },
    timestamp: Date.now(),
  })
  const captureOk = await capturePromise

  if (!captureOk) {
    console.error('[Clarvo background] Tab audio capture failed to start')
    broadcastToSidePanel({
      type: 'ERROR',
      payload: {
        code: 'UNKNOWN',
        message: 'Tab audio capture failed. Please refresh the page and try again.',
        recoverable: true,
      } as ErrorPayload,
      timestamp: Date.now(),
    })
    return { ok: false, error: 'CAPTURE_FAILED' }
  }

  // ── 7. Persist state and update UI ────────────────────────────────────────
  await setState({
    sessionId,
    state: 'RECORDING',
    videoUrl: payload.videoSrc,
    videoTitle: payload.pageTitle,
    chunkCount: 0,
    lastActivityAt: Date.now(),
    accumulatedTranscript: '',
    watchTimeSeconds: 0,
  })

  // Start tracking watch time from now
  playStartedAt = Date.now()

  broadcastToSidePanel({
    type: 'SESSION_STATE_CHANGED',
    payload: { sessionId, previousState: null, newState: 'RECORDING' as SessionState },
    timestamp: Date.now(),
  })
  broadcastToContentScript({
    type: 'SESSION_STATE_CHANGED',
    payload: { sessionId, previousState: null, newState: 'RECORDING' as SessionState },
    timestamp: Date.now(),
  })
  console.log('[Clarvo background] 📡 SESSION_STATE_CHANGED(RECORDING) sent to side panel + content script')

  // ── 8. Start periodic extraction and inactivity tracking ──────────────────
  startExtractionTimer()
  resetInactivityTimer()

  return { ok: true }
}

async function stopSession(): Promise<void> {
  if (_isStoppingSession) return
  _isStoppingSession = true

  const s = await getState()
  if (!s.sessionId) {
    _isStoppingSession = false
    return
  }

  // Notify the side panel immediately so it can show a processing loader
  broadcastToSidePanel({ type: 'SESSION_STOPPING', payload: {}, timestamp: Date.now() })

  console.log('[Clarvo background] ⏹ stopSession started (sessionId:', s.sessionId, 'state:', s.state, ')')

  try {
    // Accumulate any remaining watch time
    await accumulateWatchTime()

    stopExtractionTimer()
    if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null }

    // Stop audio capture and wait for offscreen to flush final transcript requests.
    console.log('[Clarvo background] 🔄 Sending STOP_AUDIO_CAPTURE — waiting for final Deepgram flush…')
    const captureStopped = waitForCaptureStopped(7000)
    chrome.runtime.sendMessage({ type: 'STOP_AUDIO_CAPTURE', payload: {}, timestamp: Date.now() })
      .catch(() => { /* offscreen may already be closed */ })
    await captureStopped
    console.log('[Clarvo background] ✅ AUDIO_CAPTURE_STOPPED received — all Deepgram transcriptions complete')

    // Ensure transcript writes triggered by TRANSCRIPT_READY are persisted first.
    await transcriptPersistQueue
    console.log('[Clarvo background] ✅ Transcript persist queue drained')

    // Run final extraction pass before marking complete.
    const stateAfterFlush = await getState()
    if (stateAfterFlush.accumulatedTranscript.trim()) {
      console.log('[Clarvo background] 🧠 Running final LLM extraction (transcript length:', stateAfterFlush.accumulatedTranscript.length, ')')
      await runExtractionCycle()
      console.log('[Clarvo background] ✅ Final LLM extraction complete')
    } else {
      console.log('[Clarvo background] ℹ️ No accumulated transcript — skipping final extraction')
    }

    // Get final watch time
    const finalState = await getState()
    const watchTimeSeconds = Math.round(finalState.watchTimeSeconds || 0)

    // Update session on server with COMPLETED state and watch time
    await updateSessionOnServer(s.sessionId, {
      state: 'COMPLETED',
      watch_time_seconds: watchTimeSeconds,
    })

    await setState({ state: 'COMPLETED' })
    const completedMsg: ExtensionMessage<unknown> = { type: 'SESSION_COMPLETED', payload: { sessionId: s.sessionId }, timestamp: Date.now() }
    broadcastToSidePanel(completedMsg)
    broadcastToContentScript(completedMsg)
    console.log('[Clarvo background] ✅ Session completed (watchTime:', watchTimeSeconds, 's)')

    // Tear down the offscreen doc
    await destroyOffscreenDocument()
  } finally {
    _pauseSource = null
    activeTabId = null
    _isStoppingSession = false
  }
}

// ── Pause / Resume ───────────────────────────────────────────────────────────

async function pauseSession(): Promise<void> {
  if (_isStoppingSession) return  // Don't pause if we're already stopping (e.g. pause fires right before ended)

  const s = await getState()
  if (!s.sessionId || s.state !== 'RECORDING') return

  console.log('[Clarvo background] ⏸ Pausing session (source:', _pauseSource ?? 'unknown', ')')

  // Accumulate watch time up to this pause
  await accumulateWatchTime()

  // Pause audio capture in offscreen (saves Deepgram credits)
  chrome.runtime.sendMessage({ type: 'PAUSE_AUDIO_CAPTURE', timestamp: Date.now() }).catch(() => {})

  // Pause periodic extraction while the session is paused.
  stopExtractionTimer()

  // Clear inactivity timer while paused
  if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null }

  // Update DB state to PAUSED
  await updateSessionOnServer(s.sessionId, { state: 'PAUSED' })
  await setState({ state: 'PAUSED' })

  broadcastToSidePanel({
    type: 'SESSION_STATE_CHANGED',
    payload: { sessionId: s.sessionId, previousState: 'RECORDING', newState: 'PAUSED' as SessionState },
    timestamp: Date.now(),
  })
  broadcastToContentScript({
    type: 'SESSION_STATE_CHANGED',
    payload: { sessionId: s.sessionId, previousState: 'RECORDING', newState: 'PAUSED' as SessionState },
    timestamp: Date.now(),
  })
}

async function resumeSession(): Promise<void> {
  const s = await getState()
  if (!s.sessionId || s.state !== 'PAUSED') return

  console.log('[Clarvo background] ▶ Resuming session')

  // Resume audio capture in offscreen
  chrome.runtime.sendMessage({ type: 'RESUME_AUDIO_CAPTURE', timestamp: Date.now() }).catch(() => {})

  // Update DB state back to RECORDING
  await updateSessionOnServer(s.sessionId, { state: 'RECORDING' })
  await setState({ state: 'RECORDING' })

  // Restart watch time tracking
  playStartedAt = Date.now()

  broadcastToSidePanel({
    type: 'SESSION_STATE_CHANGED',
    payload: { sessionId: s.sessionId, previousState: 'PAUSED', newState: 'RECORDING' as SessionState },
    timestamp: Date.now(),
  })
  broadcastToContentScript({
    type: 'SESSION_STATE_CHANGED',
    payload: { sessionId: s.sessionId, previousState: 'PAUSED', newState: 'RECORDING' as SessionState },
    timestamp: Date.now(),
  })

  startExtractionTimer()
  resetInactivityTimer()
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

// ── Inactivity Detection ─────────────────────────────────────────────────────

function resetInactivityTimer(): void {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(async () => {
    broadcastToSidePanel({
      type: 'INACTIVITY_WARNING',
      payload: { code: 'INACTIVITY_TIMEOUT', message: 'No activity detected. Session will auto-stop.', recoverable: true } as ErrorPayload,
      timestamp: Date.now(),
    })
    await stopSession()
  }, INACTIVITY_TIMEOUT_MS)
}

// ── Message Router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage<unknown>, _sender, sendResponse) => {
  // Validate message structure
  if (!message?.type) return

  // ── Offscreen document handshake (no timestamp required) ──────────────────
  if (message.type === 'OFFSCREEN_READY') { onOffscreenReady(); return }
  if (message.type === 'CAPTURE_STARTED') { _captureResolve?.(true); _captureResolve = null; return }
  if (message.type === 'CAPTURE_FAILED') { _captureResolve?.(false); _captureResolve = null; return }
  if (message.type === 'AUDIO_CAPTURE_STOPPED') { _captureStoppedResolve?.(); _captureStoppedResolve = null; return }

  switch (message.type) {
    // ── Video detection (from content script) ─────────────────────────────────
    case 'VIDEO_DETECTED': {
      const payload = message.payload as VideoDetectedPayload
      // Store detected video info + tabId for side panel to read on mount
      chrome.storage.local.set({
        detectedVideo: {
          tabId: _sender.tab?.id,
          videoSrc: payload.videoSrc,
          pageTitle: payload.pageTitle,
          pageUrl: payload.pageUrl,
        }
      })
      // Forward to side panel
      broadcastToSidePanel({ type: 'VIDEO_DETECTED', payload, timestamp: Date.now() })
      break
    }

    case 'VIDEO_LOST': {
      chrome.storage.local.remove('detectedVideo')
      broadcastToSidePanel({ type: 'VIDEO_LOST', payload: {}, timestamp: Date.now() })
      break
    }

    // ── Session start (from side panel — extension gesture!) ──────────────────
    case 'START_SESSION': {
      // Get video info from stored detection
      chrome.storage.local.get('detectedVideo').then(async (result) => {
        const detected = result.detectedVideo as {
          tabId?: number; videoSrc: string; pageTitle: string; pageUrl: string
        } | undefined

        // Try to get tabId from the active tab (most reliable)
        let tabId: number | undefined
        try {
          const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
          tabId = activeTab?.id
        } catch { /* ignore */ }

        const videoInfo = detected ?? (message.payload as VideoDetectedPayload | undefined)
        if (!videoInfo) {
          sendResponse({ ok: false, error: 'No video detected. Navigate to a video first.' })
          return
        }

        const sessionResult = await startSession(
          { videoSrc: videoInfo.videoSrc, pageTitle: videoInfo.pageTitle, pageUrl: videoInfo.pageUrl },
          tabId
        )
        sendResponse(sessionResult)
      })
      return true  // Keep channel open for async
    }

    // ── Session stop ──────────────────────────────────────────────────────────
    case 'STOP_SESSION':
      stopSession().then(() => sendResponse({ ok: true }))
      return true

    case 'PAUSE_SESSION':
      _pauseSource = 'user'
      console.log('[Clarvo background] ⏸ PAUSE_SESSION from side panel')
      pauseSession()
      break

    case 'RESUME_SESSION':
      _pauseSource = null
      console.log('[Clarvo background] ▶ RESUME_SESSION from side panel')
      resumeSession()
      break

    // ── Video pause → pause capture + track watch time ────────────────────────
    case 'VIDEO_PAUSE': {
      if (_isStoppingSession) break  // Ignore pause if we're already stopping
      console.log('[Clarvo background] ⏸ VIDEO_PAUSE received')
      _pauseSource = 'video'
      pauseSession()
      break
    }

    // ── Video play → resume capture only if paused by VIDEO (not by side panel) ──
    case 'VIDEO_PLAY': {
      console.log('[Clarvo background] ▶ VIDEO_PLAY received (pauseSource:', _pauseSource, ')')
      getState().then((s) => {
        if (s.sessionId && s.state === 'PAUSED' && _pauseSource === 'video') {
          _pauseSource = null
          resumeSession()
        } else if (s.sessionId && s.state === 'RECORDING') {
          resetInactivityTimer()
        }
      })
      break
    }

    // ── Video ended → flush remaining audio + final LLM extraction ────────────
    case 'VIDEO_ENDED': {
      console.log('[Clarvo background] 🏁 VIDEO_ENDED received — initiating final flush and stop')
      _pauseSource = null
      stopSession()
      break
    }

    // ── Transcript from offscreen ─────────────────────────────────────────────
    case 'TRANSCRIPT_READY': {
      const { transcript } = message.payload as TranscriptReadyPayload
      transcriptPersistQueue = transcriptPersistQueue.then(async () => {
        const s = await getState()
        await setState({
          accumulatedTranscript: (s.accumulatedTranscript + ' ' + transcript).trim(),
          lastActivityAt: Date.now(),
        })
        resetInactivityTimer()
      })
      .catch((err) => {
        console.error('[Clarvo background] Failed to persist transcript:', err)
      })
      // Forward to side panel for live display
      broadcastToSidePanel(message)
      break
    }

    // ── Screenshot trigger from side panel ────────────────────────────────────
    case 'TRIGGER_SCREENSHOT': {
      broadcastToContentScript({ type: 'TRIGGER_SCREENSHOT', payload: {}, timestamp: Date.now() })
      break
    }

    // ── Screenshot from content script ────────────────────────────────────────
    case 'SCREENSHOT_REQUESTED': {
      const screenshotPayload = message.payload as ScreenshotReadyPayload
      // Broadcast the data URL to the side panel so it can insert it inline
      broadcastToSidePanel({
        type: 'SCREENSHOT_READY',
        payload: { dataUrl: screenshotPayload.dataUrl },
        timestamp: Date.now(),
      })
      break
    }

    // ── Flashcard + action plan generation from side panel ────────────────────
    case 'GENERATE_FLASHCARDS_ACTION_PLAN': {
      getState().then(async (s) => {
        if (!s.sessionId) return
        const token = await getUserAuthToken()
        if (!token) {
          broadcastToSidePanel({ type: 'GENERATE_FLASHCARDS_ACTION_PLAN_ERROR', payload: { message: 'Not authenticated' }, timestamp: Date.now() })
          return
        }

        try {
          const [fcRes, apRes] = await Promise.all([
            fetch(`${WEB_APP_URL}/api/ai/flashcards`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: s.sessionId }),
            }),
            fetch(`${WEB_APP_URL}/api/ai/action-plan`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: s.sessionId }),
            }),
          ])

          const fcData = await fcRes.json().catch(() => ({}))
          const apData = await apRes.json().catch(() => ({}))

          if (fcRes.status === 402 || apRes.status === 402) {
            broadcastToSidePanel({ type: 'GENERATE_FLASHCARDS_ACTION_PLAN_ERROR', payload: { message: 'Clarvo Pro required to generate flashcards & action plan.', upgradeRequired: true }, timestamp: Date.now() })
            return
          }

          broadcastToSidePanel({
            type: 'FLASHCARDS_ACTION_PLAN_READY',
            payload: {
              flashcards: fcData.flashcards ?? [],
              actionPlan: apData.actionPlan ?? '',
            },
            timestamp: Date.now(),
          })
        } catch {
          broadcastToSidePanel({ type: 'GENERATE_FLASHCARDS_ACTION_PLAN_ERROR', payload: { message: 'Failed to generate. Please try again.' }, timestamp: Date.now() })
        }
      })
      break
    }
  }
})

// ── Install Handler ──────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  clearState()
})
