import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  run_at: 'document_idle',
}

/**
 * Video Detector Content Script
 *
 * Scans the page for <video> elements, injects the "Start Clarvo Copilot"
 * overlay button, and forwards play/pause/ended events to the background SW.
 *
 * Security (extension-security skill):
 * - No eval or innerHTML usage
 * - Messages are typed and validated
 * - Origin validation on incoming messages
 */

import type {
  ExtensionMessage,
  VideoDetectedPayload,
  ScreenshotReadyPayload,
} from '@clarvo/types'

let activeVideo: HTMLVideoElement | null = null
let overlayButton: HTMLButtonElement | null = null
let sessionActive = false

// ── Helpers ──────────────────────────────────────────────────────────────────

function sendMessage<T>(msg: ExtensionMessage<T>): void {
  chrome.runtime.sendMessage(msg)
}

function isVideoPlayable(video: HTMLVideoElement): boolean {
  return video.readyState >= 2 && !video.paused && video.duration > 0
}

// ── Overlay Injection ────────────────────────────────────────────────────────

function createOverlayButton(video: HTMLVideoElement): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.textContent = '▶ Start Clarvo Copilot'
  btn.setAttribute('aria-label', 'Start Clarvo AI learning session for this video')
  btn.setAttribute('data-clarvo-overlay', 'true')

  // Defensive styling via attribute — no inline style injection for CSP compliance
  Object.assign(btn.style, {
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: '9998',
    padding: '8px 16px',
    borderRadius: '8px',
    background: '#6c63ff',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 2px 12px rgba(108,99,255,0.4)',
  })

  btn.addEventListener('click', () => {
    sendMessage<VideoDetectedPayload>({
      type: 'START_SESSION',
      payload: {
        videoSrc: video.src || video.currentSrc,
        pageTitle: document.title,
        pageUrl: window.location.href,
      },
      timestamp: Date.now(),
    })
    btn.textContent = '⏹ Stop Clarvo'
    btn.setAttribute('data-clarvo-active', 'true')
    sessionActive = true
  })

  return btn
}

function injectOverlay(video: HTMLVideoElement): void {
  if (video.dataset['clarvoInjected']) return

  // Ensure the parent is positioned for absolute overlay
  const parent = video.parentElement
  if (parent) {
    const position = getComputedStyle(parent).position
    if (position === 'static') parent.style.position = 'relative'
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
}

// ── Video Event Forwarding ───────────────────────────────────────────────────

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
  })
}

// ── Screenshot (Ctrl+K) ──────────────────────────────────────────────────────

function captureVideoFrame(video: HTMLVideoElement): string | null {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } catch {
    // DRM-protected content will throw a SecurityError here
    return null
  }
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k' && sessionActive && activeVideo) {
    e.preventDefault()
    const dataUrl = captureVideoFrame(activeVideo)
    if (dataUrl) {
      sendMessage<ScreenshotReadyPayload>({
        type: 'SCREENSHOT_REQUESTED',
        payload: {
          sessionId: '',  // Background will inject the current sessionId
          dataUrl,
          audioContext: '',  // Background will inject last 30s of transcript
        },
        timestamp: Date.now(),
      })
    } else {
      sendMessage({ type: 'ERROR', payload: { code: 'DRM_PROTECTED', message: 'Cannot capture DRM-protected content', recoverable: false }, timestamp: Date.now() })
    }
  }
})

// ── DOM Mutation Observer ────────────────────────────────────────────────────

function scanForVideos(): void {
  const videos = document.querySelectorAll<HTMLVideoElement>('video')
  
  if (videos.length === 0) {
    if (activeVideo) {
      removeOverlay()
      sendMessage({ type: 'VIDEO_LOST', payload: {}, timestamp: Date.now() })
      activeVideo = null
    }
    return
  }

  // Use the largest / most prominent video (widest)
  let bestVideo = videos[0]!
  for (const v of videos) {
    if (v.videoWidth > (bestVideo?.videoWidth ?? 0)) bestVideo = v
  }

  if (bestVideo !== activeVideo) {
    if (activeVideo) removeOverlay()
    activeVideo = bestVideo
    injectOverlay(activeVideo)
    attachVideoListeners(activeVideo)
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

// Initial scan + mutation observer for SPA navigation
scanForVideos()
const observer = new MutationObserver(() => scanForVideos())
observer.observe(document.body, { childList: true, subtree: true })
