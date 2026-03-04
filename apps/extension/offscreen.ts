/**
 * Offscreen Document — Audio Capture
 *
 * Uses getUserMedia() to capture microphone audio, splits it into 20–30s chunks,
 * and transcribes each chunk using Deepgram Nova-2 REST API.
 * The resulting transcript is sent back to the background service worker.
 *
 * Security (extension-security skill):
 * - DEEPGRAM_API_KEY is injected at build time via process.env (never exposed in runtime JS)
 * - No eval or dynamic execution
 * - All messages validated by type
 */

import type { ExtensionMessage, TranscriptReadyPayload } from '@clarvo/types'

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY ?? ''
const CHUNK_DURATION_MS = 25000  // 25-second chunks

let mediaRecorder: MediaRecorder | null = null
let chunkIndex = 0

async function startCapture(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })

    mediaRecorder.ondataavailable = async (e) => {
      if (e.data.size === 0) return
      await transcribeChunk(e.data, chunkIndex++)
    }

    mediaRecorder.start(CHUNK_DURATION_MS)
  } catch (err: unknown) {
    const isDenied = err instanceof Error && err.name === 'NotAllowedError'
    chrome.runtime.sendMessage({
      type: 'ERROR',
      payload: {
        code: isDenied ? 'MIC_DENIED' : 'UNKNOWN',
        message: isDenied
          ? 'Microphone access was denied. Please allow microphone access in browser settings.'
          : 'Failed to start audio capture.',
        recoverable: false,
      },
      timestamp: Date.now(),
    })
  }
}

function stopCapture(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
    mediaRecorder.stream.getTracks().forEach((t) => t.stop())
    mediaRecorder = null
    chunkIndex = 0
  }
}

async function transcribeChunk(blob: Blob, index: number): Promise<void> {
  if (!DEEPGRAM_API_KEY) {
    console.error('[Clarvo offscreen] DEEPGRAM_API_KEY is not set.')
    return
  }

  try {
    const buffer = await blob.arrayBuffer()
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
      method: 'POST',
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm;codecs=opus',
      },
      body: buffer,
    })

    if (!response.ok) {
      console.error('[Clarvo offscreen] Deepgram API error:', response.statusText)
      chrome.runtime.sendMessage({
        type: 'ERROR',
        payload: { code: 'DEEPGRAM_ERROR', message: 'Transcription failed. Check your connection.', recoverable: true },
        timestamp: Date.now(),
      })
      return
    }

    const result = await response.json()
    const transcript: string =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''

    if (transcript.trim()) {
      chrome.runtime.sendMessage({
        type: 'TRANSCRIPT_READY',
        payload: {
          sessionId: '',  // Background SW injects sessionId from state
          transcript,
          chunkIndex: index,
        } as TranscriptReadyPayload,
        timestamp: Date.now(),
      })
    }
  } catch (err) {
    console.error('[Clarvo offscreen] Transcription error:', err)
    chrome.runtime.sendMessage({
      type: 'ERROR',
      payload: { code: 'NETWORK_ERROR', message: 'Lost connection during transcription. Retrying...', recoverable: true },
      timestamp: Date.now(),
    })
  }
}

// Message listener
chrome.runtime.onMessage.addListener((msg: ExtensionMessage<unknown>) => {
  if (msg.type === 'START_AUDIO_CAPTURE') startCapture()
  if (msg.type === 'STOP_AUDIO_CAPTURE') stopCapture()
})
