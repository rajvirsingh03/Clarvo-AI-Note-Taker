import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  run_at: 'document_idle',
}

/**
 * Video Detector Content Script — Clarvo AI
 *
 * Stripped-down to detect-only:
 * - Scans for <video> elements using MutationObserver
 * - Sends VIDEO_DETECTED / VIDEO_LOST to background (which forwards to side panel)
 * - Forwards play/pause/ended events so background can pause/resume capture
 * - Handles Ctrl+K screenshot capture
 *
 * NO overlay button — session start/stop is handled from the Side Panel
 * (extension-level gesture required for chrome.tabCapture in MV3).
 */

import type {
  ExtensionMessage,
  VideoDetectedPayload,
  ScreenshotReadyPayload,
} from '@clarvo/types'

let activeVideo: HTMLVideoElement | null = null
let sessionActive = false

// ── Message helpers ───────────────────────────────────────────────────────────

function sendMessage<T>(msg: ExtensionMessage<T>): Promise<unknown> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[Clarvo content] sendMessage error:', chrome.runtime.lastError.message)
        }
        resolve(response)
      })
    } catch (err) {
      resolve(null)
    }
  })
}

// ── Video event forwarding ────────────────────────────────────────────────────

function attachVideoListeners(video: HTMLVideoElement): void {
  video.addEventListener('play', () => {
    console.log('[Clarvo content] ▶ Video play event (sessionActive:', sessionActive, ')')
    if (!sessionActive) return
    sendMessage({ type: 'VIDEO_PLAY', payload: { videoSrc: video.src || video.currentSrc }, timestamp: Date.now() })
  })
  video.addEventListener('pause', () => {
    console.log('[Clarvo content] ⏸ Video pause event (sessionActive:', sessionActive, ', ended:', video.ended, ')')
    if (!sessionActive) return
    // Browsers fire 'pause' right before 'ended' — skip to avoid a
    // spurious pauseSession() that races with stopSession().
    if (video.ended) {
      console.log('[Clarvo content] ⏸ Already ended — skipping pause (ended handler will fire)')
      return
    }
    console.log('[Clarvo content] ⏸ Sending VIDEO_PAUSE')
    sendMessage({ type: 'VIDEO_PAUSE', payload: { videoSrc: video.src || video.currentSrc }, timestamp: Date.now() })
  })
  video.addEventListener('ended', () => {
    console.log('[Clarvo content] 🏁 Video ended event (sessionActive:', sessionActive, ')')
    if (!sessionActive) return
    console.log('[Clarvo content] 🏁 Sending VIDEO_ENDED — triggering final flush')
    sendMessage({ type: 'VIDEO_ENDED', payload: { videoSrc: video.src || video.currentSrc }, timestamp: Date.now() })
  })
}

// ── Screenshot (Ctrl+K) ───────────────────────────────────────────────────────

function captureVideoFrame(video: HTMLVideoElement): string | null {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } catch {
    return null  // DRM-protected content will throw SecurityError
  }
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k' && sessionActive && activeVideo) {
    e.preventDefault()
    const dataUrl = captureVideoFrame(activeVideo)
    if (dataUrl) {
      sendMessage<ScreenshotReadyPayload>({
        type: 'SCREENSHOT_REQUESTED',
        payload: { sessionId: '', dataUrl, audioContext: '' },
        timestamp: Date.now(),
      })
    } else {
      sendMessage({
        type: 'ERROR',
        payload: { code: 'DRM_PROTECTED', message: 'Cannot capture DRM-protected content', recoverable: false },
        timestamp: Date.now(),
      })
    }
  }
})

// ── Session state listener ────────────────────────────────────────────────────
// Keeps sessionActive flag in sync so we know when to forward video events

// On load: initialize sessionActive from persisted storage so events are
// forwarded correctly if the page reloads while a session is active.
chrome.storage.local.get('clarvoSession').then((result) => {
  const s = result['clarvoSession'] as { state?: string } | undefined
  if (s?.state === 'RECORDING' || s?.state === 'PAUSED') {
    sessionActive = true
    console.log('[Clarvo content] 🔄 Restored sessionActive=true from storage (state:', s.state, ')')
  }
})

chrome.runtime.onMessage.addListener((msg: ExtensionMessage<unknown>) => {
  if (!msg?.type) return

  switch (msg.type) {
    case 'SESSION_STATE_CHANGED': {
      const payload = msg.payload as { newState?: string } | null
      const prev = sessionActive
      if (payload?.newState === 'RECORDING' || payload?.newState === 'PAUSED') {
        sessionActive = true
      } else if (payload?.newState === 'COMPLETED' || payload?.newState === null) {
        sessionActive = false
      }
      console.log('[Clarvo content] 📡 SESSION_STATE_CHANGED:', payload?.newState, '| sessionActive:', prev, '→', sessionActive)
      break
    }
    case 'SESSION_COMPLETED':
      sessionActive = false
      break
    case 'TRIGGER_SCREENSHOT': {
      if (sessionActive && activeVideo) {
        const dataUrl = captureVideoFrame(activeVideo)
        if (dataUrl) {
          sendMessage<ScreenshotReadyPayload>({
            type: 'SCREENSHOT_REQUESTED',
            payload: { sessionId: '', dataUrl, audioContext: '' },
            timestamp: Date.now(),
          })
        } else {
          sendMessage({
            type: 'ERROR',
            payload: { code: 'DRM_PROTECTED', message: 'Cannot capture DRM-protected content', recoverable: false },
            timestamp: Date.now(),
          })
        }
      }
      break
    }
  }
})

// ── DOM Mutation Observer — Video Detection ───────────────────────────────────

function scanForVideos(): void {
  const videos = document.querySelectorAll<HTMLVideoElement>('video')

  if (videos.length === 0) {
    if (activeVideo) {
      activeVideo = null
      sendMessage({ type: 'VIDEO_LOST', payload: {}, timestamp: Date.now() })
    }
    return
  }

  // Use the most prominent video (largest width, or first with a source)
  let bestVideo: HTMLVideoElement | null = null
  for (const v of videos) {
    if (!bestVideo) {
      bestVideo = v
    } else if ((v.videoWidth || v.offsetWidth) > (bestVideo.videoWidth || bestVideo.offsetWidth)) {
      bestVideo = v
    }
  }

  if (!bestVideo) return

  if (bestVideo !== activeVideo) {
    activeVideo = bestVideo
    attachVideoListeners(activeVideo)

    // Notify background (which forwards to side panel) that video is detected
    sendMessage<VideoDetectedPayload>({
      type: 'VIDEO_DETECTED',
      payload: {
        videoSrc: activeVideo.src || activeVideo.currentSrc,
        pageTitle: document.title,
        pageUrl: window.location.href,
      },
      timestamp: Date.now(),
    })
  }
}

// Initial scan
scanForVideos()

// Observe DOM for SPA navigation (YouTube navigates without full page reload)
let _scanDebounce: ReturnType<typeof setTimeout> | null = null
const observer = new MutationObserver(() => {
  if (_scanDebounce) clearTimeout(_scanDebounce)
  _scanDebounce = setTimeout(scanForVideos, 300)
})
observer.observe(document.body, { childList: true, subtree: true })
