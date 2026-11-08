/**
 * Canvas shim for the print server preview endpoint.
 *
 * Uses `canvas` (node-canvas) if installed, otherwise falls back
 * to a minimal raw-PNG encoder that doesn't need native deps.
 */

import { deflateSync } from 'node:zlib'

let nativeCanvas = null
try {
  nativeCanvas = await import('canvas')
} catch {
  // node-canvas not installed — use fallback
}

export function createCanvas(width, height) {
  if (nativeCanvas) {
    return nativeCanvas.createCanvas(width, height)
  }
  return new SoftCanvas(width, height)
}

/**
 * Minimal canvas substitute that supports:
 *   - getContext('2d') → { createImageData, putImageData }
 *   - toBuffer('image/png') → raw PNG
 *
 * No drawing API — just pixel manipulation + PNG export.
 */
class SoftCanvas {
  constructor(width, height) {
    this.width = width
    this.height = height
    this._imageData = null
  }

  getContext() {
    const self = this
    return {
      createImageData(w, h) {
        return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }
      },
      putImageData(imgData) {
        self._imageData = imgData
      },
    }
  }

  toBuffer() {
    if (!this._imageData) throw new Error('No image data')
    return encodePng(this._imageData.data, this.width, this.height)
  }
}

// ---- Minimal PNG encoder (uncompressed, no dependencies) ----

function encodePng(rgba, width, height) {
  const rowLen = 1 + width * 4 // filter byte + RGBA
  const rawData = Buffer.alloc(rowLen * height)
  for (let y = 0; y < height; y++) {
    rawData[y * rowLen] = 0 // filter: None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4
      const dst = y * rowLen + 1 + x * 4
      rawData[dst] = rgba[src]
      rawData[dst + 1] = rgba[src + 1]
      rawData[dst + 2] = rgba[src + 2]
      rawData[dst + 3] = rgba[src + 3]
    }
  }

  const compressed = deflateSync(rawData)
  const chunks = []

  // PNG signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  chunks.push(pngChunk('IHDR', ihdr))

  // IDAT
  chunks.push(pngChunk('IDAT', compressed))

  // IEND
  chunks.push(pngChunk('IEND', Buffer.alloc(0)))

  return Buffer.concat(chunks)
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = crc32(crcData)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc >>> 0, 0)
  return Buffer.concat([len, typeBuffer, data, crcBuf])
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}
