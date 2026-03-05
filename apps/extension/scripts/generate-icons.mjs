/**
 * Generates Clarvo AI extension icons (PNG) using Node.js built-in zlib.
 * Run: node scripts/generate-icons.mjs
 * Output: assets/icon16.png, icon32.png, icon48.png, icon128.png
 */
import zlib from 'zlib'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_DIR = path.join(__dirname, '..', 'assets')

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true })
}

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([len, typeBytes, data, crcBuf])
}

function createPNG(size) {
  // Design: dark base (#0a0a0f) with a glowing indigo (#6c63ff) "C" lettermark
  const width = size
  const height = size
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.42
  const innerR = size * 0.26
  const strokeW = size * 0.12

  // Build RGBA pixel data
  const pixels = new Uint8Array(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx) // -pi to pi

      // Background: deep dark base with vignette
      const vignette = 1 - Math.max(0, (dist / (size * 0.5) - 0.5) * 0.8)
      const bgR = Math.round(10 * vignette)
      const bgG = Math.round(10 * vignette)
      const bgB = Math.round(20 * vignette)

      // Rounded rect background (squircle)
      const rx = Math.abs(dx) / (size * 0.44)
      const ry = Math.abs(dy) / (size * 0.44)
      const squircle = Math.pow(rx, 4) + Math.pow(ry, 4)

      if (squircle > 1) {
        // Outside bounds — transparent
        pixels[idx] = 0; pixels[idx+1] = 0; pixels[idx+2] = 0; pixels[idx+3] = 0
        continue
      }

      // Arc ring: angle from -150deg to +150deg (opening on left = "C" shape)
      // In atan2: right is 0, bottom is pi/2, left is ±pi, top is -pi/2
      // C opens on left (±pi side), so draw arc from ~-2.6 to ~2.6 rad
      const GAP_HALF = Math.PI * 0.22 // gap angle half-width
      const inArc = !(angle > (Math.PI - GAP_HALF) || angle < -(Math.PI - GAP_HALF))
      const inRing = dist >= innerR && dist <= outerR

      // Glow effect around the arc
      const ringCenter = (innerR + outerR) / 2
      const ringGlow = Math.max(0, 1 - Math.abs(dist - ringCenter) / (strokeW * 0.9))
      const glowR = 108; const glowG = 99; const glowB = 255

      if (inRing && inArc) {
        // Solid arc pixel — accent color
        const alpha = Math.pow(ringGlow, 0.5)
        pixels[idx] = Math.round(bgR + (glowR - bgR) * alpha)
        pixels[idx+1] = Math.round(bgG + (glowG - bgG) * alpha)
        pixels[idx+2] = Math.round(bgB + (glowB - bgB) * alpha)
        pixels[idx+3] = 255
      } else {
        // Background with ambient glow from arc
        const ambientDist = Math.max(0, 1 - Math.abs(dist - ringCenter) / (strokeW * 2.5))
        const ambient = inArc ? ambientDist * 0.25 : 0
        pixels[idx] = Math.min(255, Math.round(bgR + glowR * ambient))
        pixels[idx+1] = Math.min(255, Math.round(bgG + glowG * ambient))
        pixels[idx+2] = Math.min(255, Math.round(bgB + glowB * ambient))
        pixels[idx+3] = 255
      }
    }
  }

  // Convert RGBA → RGB scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (1 + width * 3))
  for (let y = 0; y < height; y++) {
    scanlines[y * (1 + width * 3)] = 0 // filter none
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4
      const dst = y * (1 + width * 3) + 1 + x * 3
      scanlines[dst] = pixels[src]
      scanlines[dst+1] = pixels[src+1]
      scanlines[dst+2] = pixels[src+2]
    }
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 })

  // IHDR
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData.writeUInt8(8, 8)   // bit depth
  ihdrData.writeUInt8(2, 9)   // color type: RGB
  ihdrData.writeUInt8(0, 10)  // compression
  ihdrData.writeUInt8(0, 11)  // filter
  ihdrData.writeUInt8(0, 12)  // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const sizes = [16, 32, 48, 128]
for (const size of sizes) {
  const png = createPNG(size)
  const outPath = path.join(ASSETS_DIR, `icon${size}.png`)
  fs.writeFileSync(outPath, png)
  console.log(`✅ Generated ${outPath} (${png.length} bytes)`)
}

// Also write icon.png (128) as the default
fs.writeFileSync(path.join(ASSETS_DIR, 'icon.png'), createPNG(128))
console.log('✅ Generated assets/icon.png (128px default)')
console.log('🎉 All icons generated successfully.')
