import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  run_at: 'document_idle',
}

/**
 * Video Detector Content Script — Clarvo AI
 *
 * - Scans for <video> elements using MutationObserver
 * - Injects an overlay button ("Start Clarvo Copilot") positioned over the video
 * - Forwards play/pause/ended events to the background SW
 * - Updates button state based on SESSION_STATE_CHANGED / SESSION_COMPLETED messages
 *
 * Bugs fixed:
 * - stopPropagation() on button click prevents YouTube toggling play/pause
 * - Button state is driven by background messages, not optimistically
 * - Sessions clean up properly when stopped from popup or video ends
 */

import type {
  ExtensionMessage,
  VideoDetectedPayload,
  ScreenshotReadyPayload,
} from '@clarvo/types'

let activeVideo: HTMLVideoElement | null = null
let overlayButton: HTMLButtonElement | null = null
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

// ── Button state helpers ──────────────────────────────────────────────────────

function setButtonIdle(): void {
  if (!overlayButton) return
  overlayButton.textContent = '▶ Start Clarvo Copilot'
  overlayButton.removeAttribute('data-clarvo-active')
  overlayButton.style.background = '#6c63ff'
  overlayButton.style.opacity = '1'
  overlayButton.disabled = false
  sessionActive = false
}

function setButtonRecording(): void {
  if (!overlayButton) return
  overlayButton.textContent = '⏹ Stop Clarvo'
  overlayButton.setAttribute('data-clarvo-active', 'true')
  overlayButton.style.background = '#dc2626'
  overlayButton.style.opacity = '1'
  overlayButton.disabled = false
  sessionActive = true
}

function setButtonLoading(): void {
  if (!overlayButton) return
  overlayButton.textContent = '⏳ Starting…'
  overlayButton.disabled = true
  overlayButton.style.opacity = '0.7'
}

// ── Overlay creation ──────────────────────────────────────────────────────────

function createOverlayButton(video: HTMLVideoElement): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.textContent = '▶ Start Clarvo Copilot'
  btn.setAttribute('aria-label', 'Start Clarvo AI learning session for this video')
  btn.setAttribute('data-clarvo-overlay', 'true')

  Object.assign(btn.style, {
    position: 'absolute',
    bottom: '72px',
    left: '12px',
    zIndex: '9999',
    padding: '8px 16px',
    borderRadius: '8px',
    background: '#6c63ff',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    boxShadow: '0 2px 12px rgba(108,99,255,0.45)',
    transition: 'background 0.2s, opacity 0.15s',
    letterSpacing: '-0.01em',
  })

  btn.addEventListener('mouseenter', () => {
    if (!btn.disabled) btn.style.filter = 'brightness(1.1)'
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.filter = ''
  })

  btn.addEventListener('click', (e) => {
    // ⚠️ CRITICAL: stop propagation so YouTube/other players don't intercept click
    e.stopPropagation()
    e.stopImmediatePropagation()
    e.preventDefault()

    if (sessionActive) {
      // Stop session
      setButtonLoading()
      sendMessage({ type: 'STOP_SESSION', payload: {}, timestamp: Date.now() })
        .then(() => setButtonIdle())
        .catch(() => setButtonIdle())
    } else {
      // Start session
      setButtonLoading()
      sendMessage<VideoDetectedPayload>({
        type: 'START_SESSION',
        payload: {
          videoSrc: video.src || video.currentSrc,
          pageTitle: document.title,
          pageUrl: window.location.href,
        },
        timestamp: Date.now(),
      }).then((response) => {
        const res = response as { ok?: boolean } | null
        if (res?.ok) {
          setButtonRecording()
        } else {
          // Auth error or network error — revert button
          setButtonIdle()
        }
      }).catch(() => setButtonIdle())
    }
  })

  return btn
}

function injectOverlay(video: HTMLVideoElement): void {
  if (video.dataset['clarvoInjected']) return

  // Ensure parent is positioned so absolute overlay works
  const parent = video.parentElement
  if (parent) {
    const pos = getComputedStyle(parent).position
    if (pos === 'static') parent.style.position = 'relative'
  }

  overlayButton = createOverlayButton(video)
  video.parentElement?.appendChild(overlayButton)
  video.dataset['clarvoInjected'] = 'true'
}

function removeOverlay(): void {
  if (overlayButton) {
    overlayButton.remove()
    overlayButton = null
  }
  sessionActive = false
}

// ── Video event forwarding ────────────────────────────────────────────────────

function attachVideoListeners(video: HTMLVideoElement): void {
  video.addEventListener('play', () => {
    if (!sessionActive) return
    sendMessage({ type: 'VIDEO_PLAY', payload: { videoSrc: video.src }, timestamp: Date.now() })
  })
  video.addEventListener('pause', () => {
    if (!sessionActive) return
    sendMessage({ type: 'VIDEO_PAUSE', payload: { videoSrc: video.src }, timestamp: Date.now() })
  })
  video.addEventListener('ended', () => {
    if (!sessionActive) return
    sendMessage({ type: 'VIDEO_ENDED', payload: { videoSrc: video.src }, timestamp: Date.now() })
    setButtonIdle()
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

// ── Background message listener ───────────────────────────────────────────────
// Keeps button state in sync with actual session state

chrome.runtime.onMessage.addListener((msg: ExtensionMessage<unknown>) => {
  if (!msg?.type) return

  switch (msg.type) {
    case 'SESSION_STATE_CHANGED': {
      const payload = msg.payload as { newState?: string } | null
      if (payload?.newState === 'RECORDING') {
        setButtonRecording()
      } else if (payload?.newState === 'COMPLETED' || payload?.newState === null) {
        setButtonIdle()
      }
      break
    }
    case 'SESSION_COMPLETED':
      setButtonIdle()
      break
    case 'ERROR': {
      // If session failed to start, revert button
      const err = msg.payload as { recoverable?: boolean } | null
      if (!sessionActive || err?.recoverable === false) {
        setButtonIdle()
      }
      break
    }
  }
})

// ── DOM Mutation Observer ─────────────────────────────────────────────────────

function scanForVideos(): void {
  const videos = document.querySelectorAll<HTMLVideoElement>('video')

  if (videos.length === 0) {
    if (activeVideo) {
      removeOverlay()
      activeVideo = null
    }
    return
  }

  // Use the most prominent video (largest width, or first with a source)
  let bestVideo: HTMLVideoElement | null = null
  for (const v of videos) {
    if (v.dataset['clarvoInjected']) {
      // Already injected on this video — keep it
      if (v === activeVideo) return
    }
    if (!bestVideo) {
      bestVideo = v
    } else if ((v.videoWidth || v.offsetWidth) > (bestVideo.videoWidth || bestVideo.offsetWidth)) {
      bestVideo = v
    }
  }

  if (!bestVideo) return

  if (bestVideo !== activeVideo) {
    if (activeVideo) removeOverlay()
    activeVideo = bestVideo
    injectOverlay(activeVideo)
    attachVideoListeners(activeVideo)
  }
}

// Initial scan
scanForVideos()

// Observe DOM for SPA navigation (YouTube navigates without full page reload).
// Debounced to avoid hammering scanForVideos on every YouTube DOM mutation.
let _scanDebounce: ReturnType<typeof setTimeout> | null = null
const observer = new MutationObserver(() => {
  if (_scanDebounce) clearTimeout(_scanDebounce)
  _scanDebounce = setTimeout(scanForVideos, 300)
})
observer.observe(document.body, { childList: true, subtree: true })
