/**
 * Offscreen Document — Audio Capture
 *
 * Architecture:
 *  1. On load → broadcasts OFFSCREEN_READY to background SW (handshake step 1)
 *  2. On START_AUDIO_CAPTURE → acquires stream, then sends CAPTURE_STARTED or
 *     CAPTURE_FAILED (handshake step 2)
 *  3. Records audio in 25s chunks → sends TRANSCRIPT_READY to background
 *
 * Audio source priority:
 *  a) Chrome: uses `chromeMediaSource: 'tab'` with the streamId from
 *     chrome.tabCapture.getMediaStreamId() — captures the video's audio
 *  b) Fallback (Firefox / no streamId): getUserMedia microphone
 *
 * Security (extension-security skill):
 * - DEEPGRAM key injected at build time via Plasmo .env — never in runtime JS
 * - No eval, no dynamic script injection
 */

import type { ExtensionMessage, TranscriptReadyPayload } from '@clarvo/types'

const DEEPGRAM_API_KEY =
  process.env.PLASMO_PUBLIC_DEEPGRAM_API_KEY ??
  process.env.DEEPGRAM_API_KEY ??
  ''
const CHUNK_DURATION_MS = 25000  // 25-second chunks

let mediaRecorder: MediaRecorder | null = null
let captureStream: MediaStream | null = null
let activeMimeType = ''
let chunkIndex = 0
let segmentTimer: ReturnType<typeof setTimeout> | null = null
let segmentStartTime = 0   // when the current segment recorder started (ms epoch)
let shouldCapture = false
let isCapturePaused = false
let activeTranscriptions = 0
let pendingRecorderStops = 0
let stopCompletionNotified = false

let audioContext: AudioContext | null = null
let loopbackSource: MediaStreamAudioSourceNode | null = null
let loopbackGain: GainNode | null = null

// ── Announce to background SW that this document is ready ────────────────────
// This MUST happen before registering the onMessage listener so the background
// knows it can safely send START_AUDIO_CAPTURE.
chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' }).catch(() => {
  // Background SW might not be listening yet on the very first load — harmless
})

// ── Audio capture ─────────────────────────────────────────────────────────────

async function startCapture(streamId?: string | null): Promise<void> {
  // Stop any existing capture first
  stopCapture()

  // Tab audio capture ONLY — no microphone fallback
  if (!streamId) {
    console.error('[Clarvo offscreen] No streamId provided — cannot capture tab audio')
    chrome.runtime.sendMessage({ type: 'CAPTURE_FAILED' }).catch(() => {})
    chrome.runtime.sendMessage({
      type: 'ERROR',
      payload: {
        code: 'UNKNOWN',
        message: 'No audio stream available. Please refresh the page and try again.',
        recoverable: true,
      },
      timestamp: Date.now(),
    }).catch(() => {})
    return
  }

  try {
    // Chrome tab audio capture — uses chromeMediaSource: 'tab' with the
    // streamId from chrome.tabCapture.getMediaStreamId(). Captures the
    // video's audio output directly, NOT the microphone.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      } as unknown as MediaTrackConstraints,
      video: false,
    })
    console.log('[Clarvo offscreen] ✅ Tab audio capture started (streamId:', streamId.slice(0, 20) + '...)')

    // Pick the best supported mimeType
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
      .find((m) => MediaRecorder.isTypeSupported(m)) ?? ''

    captureStream = stream
    activeMimeType = mimeType
    shouldCapture = true
    isCapturePaused = false
    stopCompletionNotified = false

    // Chrome tab capture intercepts tab audio; loop it back so the user still hears playback.
    await setupAudioLoopback(stream)

    startRecordingSegment()

    // Notify background SW that capture started successfully
    chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED' }).catch(() => {})
  } catch (err: unknown) {
    console.error('[Clarvo offscreen] Failed to start tab audio capture:', err)
    const isNotAllowed = err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
    const isNotFound = err instanceof Error && err.name === 'NotFoundError'

    // Notify background SW that capture FAILED so it can handle the error
    chrome.runtime.sendMessage({ type: 'CAPTURE_FAILED' }).catch(() => {})

    // Also send a user-visible error
    chrome.runtime.sendMessage({
      type: 'ERROR',
      payload: {
        code: 'UNKNOWN',
        message: isNotAllowed
          ? 'Tab audio capture was denied. Please try again.'
          : isNotFound
          ? 'No audio source found in this tab.'
          : `Tab audio capture error: ${err instanceof Error ? err.message : String(err)}`,
        recoverable: true,
      },
      timestamp: Date.now(),
    }).catch(() => {})
  }
}

function checkCompletion(): void {
  console.log('[Clarvo offscreen] checkCompletion: shouldCapture=', shouldCapture,
    'pendingStops=', pendingRecorderStops, 'activeTranscriptions=', activeTranscriptions,
    'notified=', stopCompletionNotified)
  if (
    !shouldCapture
    && pendingRecorderStops === 0
    && activeTranscriptions === 0
    && !stopCompletionNotified
  ) {
    stopCompletionNotified = true
    console.log('[Clarvo offscreen] ✅ All transcriptions done — sending AUDIO_CAPTURE_STOPPED')
    chrome.runtime.sendMessage({ type: 'AUDIO_CAPTURE_STOPPED' }).catch(() => {})
  }
}

function releaseCaptureResources(): void {
  if (captureStream) {
    try {
      captureStream.getTracks().forEach((t) => t.stop())
    } catch {
      // Tracks may already be ended.
    }
  }

  captureStream = null
  activeMimeType = ''
  chunkIndex = 0
  teardownAudioLoopback()
}

function stopCapture(): void {
  console.log('[Clarvo offscreen] ⏹ stopCapture called — flushing final audio chunk')
  shouldCapture = false
  isCapturePaused = false
  stopCompletionNotified = false

  clearSegmentTimer()

  const recorder = mediaRecorder
  if (recorder && recorder.state !== 'inactive') {
    pendingRecorderStops++
    try {
      recorder.stop()
    } catch {
      // Recorder may already be stopping.
      pendingRecorderStops = Math.max(0, pendingRecorderStops - 1)
    }
  } else {
    mediaRecorder = null
    if (pendingRecorderStops === 0) {
      // No timer-initiated stop in flight — safe to release immediately
      releaseCaptureResources()
      checkCompletion()
    }
    // else: the 25s rotation timer just called recorder.stop() a moment ago;
    // ondataavailable + onstop are still queued — let onstop handle cleanup
  }

  console.log('[Clarvo offscreen] ⏹ Capture stopped.')
}

function startRecordingSegment(): void {
  if (!captureStream || !shouldCapture || isCapturePaused) return

  const recorder = new MediaRecorder(captureStream, activeMimeType ? { mimeType: activeMimeType } : undefined)
  mediaRecorder = recorder

  recorder.ondataavailable = async (e) => {
    if (e.data.size === 0) return
    const durationMs = Date.now() - segmentStartTime
    if (durationMs < 2000) {
      console.log(`[Clarvo offscreen] ⏭ Skipping tiny chunk (${durationMs}ms < 2s) — likely end-of-silence`)
      return
    }
    await transcribeChunk(e.data, chunkIndex++, activeMimeType)
  }

  recorder.onerror = (e) => {
    console.error('[Clarvo offscreen] MediaRecorder error:', e)
  }

  recorder.onstop = () => {
    if (pendingRecorderStops > 0) {
      pendingRecorderStops--
    }

    if (segmentTimer) {
      clearTimeout(segmentTimer)
      segmentTimer = null
    }

    if (mediaRecorder === recorder) {
      mediaRecorder = null
    }

    if (shouldCapture && !isCapturePaused && captureStream?.active) {
      startRecordingSegment()
      return
    }

    // Session has ended; only release stream/audio resources after recorder
    // has emitted its final dataavailable callback.
    if (!shouldCapture) {
      releaseCaptureResources()
      checkCompletion()
    }
  }

  recorder.start()
  segmentStartTime = Date.now()

  // Force rotation to ensure every chunk has a fresh container header.
  segmentTimer = setTimeout(() => {
    if (!recorder || recorder.state !== 'recording') return
    try {
      // Track this timer-initiated stop so stopCapture() knows data is in flight
      // if it runs before ondataavailable/onstop fire.
      pendingRecorderStops++
      recorder.stop()
    } catch {
      pendingRecorderStops = Math.max(0, pendingRecorderStops - 1)
    }
  }, CHUNK_DURATION_MS)
}

function clearSegmentTimer(): void {
  if (!segmentTimer) return
  clearTimeout(segmentTimer)
  segmentTimer = null
}

async function setupAudioLoopback(stream: MediaStream): Promise<void> {
  teardownAudioLoopback()

  audioContext = new AudioContext()
  loopbackSource = audioContext.createMediaStreamSource(stream)
  loopbackGain = audioContext.createGain()
  loopbackGain.gain.value = 1

  loopbackSource.connect(loopbackGain)
  loopbackGain.connect(audioContext.destination)

  try {
    await audioContext.resume()
  } catch (err) {
    console.warn('[Clarvo offscreen] AudioContext resume failed:', err)
  }
}

function teardownAudioLoopback(): void {
  try {
    loopbackSource?.disconnect()
  } catch {
    // Ignore disconnect errors.
  }

  try {
    loopbackGain?.disconnect()
  } catch {
    // Ignore disconnect errors.
  }

  if (audioContext) {
    audioContext.close().catch(() => {
      // Ignore close errors.
    })
  }

  loopbackSource = null
  loopbackGain = null
  audioContext = null
}

// ── Transcription ─────────────────────────────────────────────────────────────

async function transcribeChunk(blob: Blob, index: number, mimeType: string): Promise<void> {
  if (!DEEPGRAM_API_KEY) {
    console.warn('[Clarvo offscreen] DEEPGRAM_API_KEY not set — transcription skipped.')
    checkCompletion()
    return
  }

  activeTranscriptions++
  const contentType = mimeType || blob.type || 'audio/webm'

  try {
    const buffer = await blob.arrayBuffer()
    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&detect_language=true&smart_format=true&punctuate=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': contentType,
        },
        body: buffer,
      }
    )

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      console.error('[Clarvo offscreen] Deepgram error:', response.status, errText)
      chrome.runtime.sendMessage({
        type: 'ERROR',
        payload: { code: 'DEEPGRAM_ERROR', message: 'Transcription failed. Check your connection.', recoverable: true },
        timestamp: Date.now(),
      }).catch(() => {})
      return
    }

    const result = await response.json()
    const transcript: string =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''

    if (transcript.trim()) {
      console.log(`[Clarvo offscreen] 🎤 Chunk ${index}: "${transcript.slice(0, 80)}..." (${transcript.length} chars)`)
      chrome.runtime.sendMessage({
        type: 'TRANSCRIPT_READY',
        payload: {
          sessionId: '',  // Background SW injects sessionId from persisted state
          transcript,
          chunkIndex: index,
        } as TranscriptReadyPayload,
        timestamp: Date.now(),
      }).catch(() => {})
    }
  } catch (err) {
    console.error('[Clarvo offscreen] Transcription network error:', err)
    chrome.runtime.sendMessage({
      type: 'ERROR',
      payload: { code: 'NETWORK_ERROR', message: 'Lost connection during transcription.', recoverable: true },
      timestamp: Date.now(),
    }).catch(() => {})
  } finally {
    activeTranscriptions = Math.max(0, activeTranscriptions - 1)
    checkCompletion()
  }
}

// ── Pause / Resume ────────────────────────────────────────────────────────────

function pauseCapture(): void {
  if (!shouldCapture || isCapturePaused) return

  isCapturePaused = true
  clearSegmentTimer()

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    console.log('[Clarvo offscreen] ⏸ Pausing capture — flushing current audio segment')
    try {
      mediaRecorder.stop()
    } catch {
      // Ignore if recorder is already stopping.
    }
  }

  console.log('[Clarvo offscreen] ⏸ Capture paused.')
}

function resumeCapture(): void {
  if (!shouldCapture || !isCapturePaused || !captureStream?.active) return

  isCapturePaused = false
  startRecordingSegment()
  console.log('[Clarvo offscreen] ▶ Capture resumed.')
}

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg: ExtensionMessage<unknown>) => {
  if (msg.type === 'START_AUDIO_CAPTURE') {
    const payload = msg.payload as { streamId?: string | null } | undefined
    startCapture(payload?.streamId)
  }
  if (msg.type === 'STOP_AUDIO_CAPTURE') {
    stopCapture()
  }
  if (msg.type === 'PAUSE_AUDIO_CAPTURE') {
    pauseCapture()
  }
  if (msg.type === 'RESUME_AUDIO_CAPTURE') {
    resumeCapture()
  }
})
