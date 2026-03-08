import type { SessionState } from './session'

/**
 * All messages that pass between extension surfaces (content script ↔ background ↔ popup ↔ side panel).
 * Must be validated on receipt — never trust untyped messages.
 */

export type ExtensionMessageType =
  | 'VIDEO_DETECTED'
  | 'VIDEO_LOST'
  | 'VIDEO_PLAY'
  | 'VIDEO_PAUSE'
  | 'VIDEO_ENDED'
  | 'START_SESSION'
  | 'STOP_SESSION'
  | 'PAUSE_SESSION'
  | 'RESUME_SESSION'
  | 'AUDIO_CHUNK_READY'
  | 'TRANSCRIPT_READY'
  | 'NOTES_UPDATED'
  | 'SCREENSHOT_REQUESTED'
  | 'SCREENSHOT_READY'
  | 'SESSION_STATE_CHANGED'
  | 'SESSION_COMPLETED'
  | 'SESSION_STOPPING'
  | 'EXPORT_NOTION'
  | 'EXPORT_NOTION_RESULT'
  | 'ERROR'
  | 'INACTIVITY_WARNING'
  | 'START_AUDIO_CAPTURE'
  | 'STOP_AUDIO_CAPTURE'
  | 'PAUSE_AUDIO_CAPTURE'
  | 'RESUME_AUDIO_CAPTURE'
  // ── Offscreen document handshake ──
  | 'OFFSCREEN_READY'    // offscreen → background: doc is loaded and listener is registered
  | 'CAPTURE_STARTED'    // offscreen → background: audio capture started successfully
  | 'CAPTURE_FAILED'     // offscreen → background: audio capture failed to start
  | 'AUDIO_CAPTURE_STOPPED' // offscreen → background: final stop flush is complete
  | 'TRIGGER_SCREENSHOT'     // side panel / background → content script: capture frame now
  | 'GENERATE_FLASHCARDS_ACTION_PLAN' // side panel → background: trigger AI generation
  | 'FLASHCARDS_ACTION_PLAN_READY'    // background → side panel: generation succeeded
  | 'GENERATE_FLASHCARDS_ACTION_PLAN_ERROR' // background → side panel: generation failed

export interface ExtensionMessage<T = unknown> {
  type: ExtensionMessageType
  payload?: T
  timestamp?: number
}

export interface VideoDetectedPayload {
  videoSrc: string
  pageTitle: string
  pageUrl: string
}

export interface AudioChunkReadyPayload {
  sessionId: string
  audioBase64: string  // Base64-encoded WebM/Opus chunk
  durationMs: number
}

export interface TranscriptReadyPayload {
  sessionId: string
  transcript: string
  chunkIndex: number
}

export interface NotesUpdatedPayload {
  sessionId: string
  appendedNotes: string
  totalNotes: string
}

export interface SessionStateChangedPayload {
  sessionId: string
  previousState: SessionState | null
  newState: SessionState
}

export interface ScreenshotReadyPayload {
  sessionId: string
  dataUrl: string
  audioContext: string
}

export interface ErrorPayload {
  code: ExtensionErrorCode
  message: string
  recoverable: boolean
}

export type ExtensionErrorCode =
  | 'DRM_PROTECTED'
  | 'MIC_DENIED'
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'INACTIVITY_TIMEOUT'
  | 'DEEPGRAM_ERROR'
  | 'AI_API_ERROR'
  | 'STORAGE_FULL'
  | 'UNKNOWN'

/** Persisted extension state (stored in chrome.storage.local for crash recovery) */
export interface ExtensionSessionState {
  sessionId: string | null
  state: SessionState | null
  videoUrl: string | null
  videoTitle: string | null
  chunkCount: number
  lastActivityAt: number | null
  accumulatedTranscript: string
  watchTimeSeconds: number
}
