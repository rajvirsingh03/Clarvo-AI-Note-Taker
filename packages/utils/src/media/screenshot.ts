/**
 * Strip the data: URL prefix from a base64 image data URL.
 * Input:  "data:image/png;base64,iVBORw0K..."
 * Output: "iVBORw0K..."
 */
export function screenshotToBase64(dataUrl: string): string {
  const [, base64] = dataUrl.split(',')
  if (!base64) throw new Error('Invalid data URL: no base64 data found')
  return base64
}

/**
 * Get the MIME type from a data URL.
 * Input:  "data:image/png;base64,..."
 * Output: "image/png"
 */
export function getMimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/)
  return match?.[1] ?? 'image/png'
}

/**
 * Estimate the size of a base64 string in bytes.
 */
export function estimateBase64Size(base64: string): number {
  return Math.ceil((base64.length * 3) / 4)
}

/**
 * Check whether a data URL represents a valid image.
 */
export function isValidImageDataUrl(dataUrl: string): boolean {
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(dataUrl)
}
