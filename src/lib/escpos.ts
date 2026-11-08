import html2canvas from 'html2canvas'

// POS80 is 80mm wide, at 203 DPI that's ~576 dots
const PRINTER_WIDTH_DOTS = 576

const CAPTURE_ATTR = 'data-escpos-capture'

export type DitherMethod = 'floyd-steinberg' | 'atkinson' | 'ordered' | 'threshold'

export interface CornerStickerData {
  imageUrl: string
  offsetX: number
  offsetY: number
  rotation: number
  scale: number
}

interface RenderToPrintOptions {
  ditherMethod?: DitherMethod
  cornerSticker?: CornerStickerData
  scale?: number
}

function inlineComputedStyles(sourceRoot: HTMLElement, clonedRoot: HTMLElement): void {
  const sourceNodes = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement>('*'))]
  const clonedNodes = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll<HTMLElement>('*'))]

  const count = Math.min(sourceNodes.length, clonedNodes.length)
  for (let i = 0; i < count; i++) {
    const source = sourceNodes[i]
    const target = clonedNodes[i]
    const computed = window.getComputedStyle(source)
    for (let j = 0; j < computed.length; j++) {
      const prop = computed.item(j)
      let value = computed.getPropertyValue(prop)

      // Filter out unsupported CSS color functions
      if ((prop.includes('color') || prop.includes('background')) &&
          (value.includes('oklab') || value.includes('oklch') || value.includes('lch'))) {
        // Skip unsupported colors, let html2canvas use defaults
        continue
      }

      target.style.setProperty(prop, value, computed.getPropertyPriority(prop))
    }

    // For img elements, use actual rendered dimensions to avoid "auto" issues
    if (source instanceof HTMLImageElement) {
      const rect = source.getBoundingClientRect()
      if (rect.width && rect.height) {
        target.style.width = rect.width + 'px'
        target.style.height = rect.height + 'px'
      }
    }

    target.removeAttribute('class')
  }
}

function applyCaptureStyle(doc: Document): HTMLStyleElement {
  const style = doc.createElement('style')
  style.setAttribute('data-escpos-capture-style', 'true')
  style.textContent = `
[${CAPTURE_ATTR}],
[${CAPTURE_ATTR}] * {
  color: #111827 !important;
  background-color: #ffffff !important;
  border-color: #d1d5db !important;
  outline-color: #d1d5db !important;
  text-shadow: none !important;
  box-shadow: none !important;
}
/* Hide selector and UI elements */
[${CAPTURE_ATTR}] select,
[${CAPTURE_ATTR}] input[type="range"],
[${CAPTURE_ATTR}] input[type="color"],
[${CAPTURE_ATTR}] button:not([data-render]) {
  display: none !important;
}
/* Hide text selection cursors and decorations */
[${CAPTURE_ATTR}] *::selection {
  background: transparent !important;
}
`
  doc.head.appendChild(style)
  return style
}


/**
 * Render a DOM element to a 1-bit bitmap ESC/POS buffer ready for the printer.
 * Returns a Uint8Array containing full ESC/POS commands (init, bitmap, cut).
 */
export interface RenderToPrintResult {
  buffer: Uint8Array
  imageBase64: string
}

export async function renderToPrintBuffer(
  element: HTMLElement,
  options: RenderToPrintOptions = {},
): Promise<RenderToPrintResult> {
  const previousCaptureAttr = element.getAttribute(CAPTURE_ATTR)
  const captureStyle = applyCaptureStyle(document)
  const captureId = Math.random().toString(36).slice(2)
  element.setAttribute(CAPTURE_ATTR, captureId)

  const cssWidth = Math.max(1, Math.round(element.getBoundingClientRect().width))
  // Scale to match printer width (576 dots)
  const scale = options.scale ?? (PRINTER_WIDTH_DOTS / cssWidth)

  try {
    // Wait for all images to load so dimensions are correct
    const images = Array.from(element.querySelectorAll('img'))

    // On iOS, convert external images to data URLs to avoid rendering issues
    await Promise.all(
      images.map(async (img) => {
        if (img.src && (img.src.startsWith('http') || img.src.includes('/assets/'))) {
          try {
            const response = await fetch(img.src)
            const blob = await response.blob()
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
            img.src = dataUrl
          } catch (e) {
            console.error('[escpos] Failed to convert image to data URL:', img.src, e)
          }
        }
      })
    )

    // Wait for all images to load (including data URL images)
    await Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve()
          // Timeout in case onload never fires
          setTimeout(() => resolve(), 1000)
        })
      })
    )


    // 1. Rasterize DOM to canvas at 576-dot effective width
    const canvas = await html2canvas(element, {
      width: cssWidth,
      scale,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.querySelector<HTMLElement>(`[${CAPTURE_ATTR}="${captureId}"]`)
        if (!clonedElement) return

        inlineComputedStyles(element, clonedElement)
        clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => node.remove())

        // Remove all class attributes to prevent oklch color parsing errors
        // but preserve classes on SVG elements since they often depend on CSS for styling
        clonedElement.removeAttribute('class')
        clonedElement.querySelectorAll('[class]:not(svg):not(svg *)').forEach((node) => {
          node.removeAttribute('class')
        })
      },
    })

    // 2. Get pixel data and convert receipt to 1-bit (dither before sticker)
    let ctx = canvas.getContext('2d')!
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const mono = ditherImage(imageData, options.ditherMethod ?? 'floyd-steinberg')


    // 4. Build ESC/POS command buffer
    const buffer = buildEscPosBuffer(mono, canvas.width, canvas.height)

    // 5. Convert dithered 1-bit image to visual PNG for archive display
    // This ensures the saved receipt looks like what will actually print
    const ditherCanvas = document.createElement('canvas')
    ditherCanvas.width = canvas.width
    ditherCanvas.height = canvas.height
    const ditherCtx = ditherCanvas.getContext('2d')!
    const ditherImageData = ditherCtx.createImageData(canvas.width, canvas.height)
    for (let i = 0; i < mono.length; i++) {
      const pixel = mono[i] ? 0 : 255 // 1 (black) → 0, 0 (white) → 255
      ditherImageData.data[i * 4] = pixel
      ditherImageData.data[i * 4 + 1] = pixel
      ditherImageData.data[i * 4 + 2] = pixel
      ditherImageData.data[i * 4 + 3] = 255 // alpha
    }
    ditherCtx.putImageData(ditherImageData, 0, 0)
    const imageBase64 = ditherCanvas.toDataURL('image/png')
    console.log('[escpos] Generated dithered image base64:', imageBase64.substring(0, 50) + '...')

    return { buffer, imageBase64 }
  } finally {
    captureStyle.remove()
    if (previousCaptureAttr === null) {
      element.removeAttribute(CAPTURE_ATTR)
    } else {
      element.setAttribute(CAPTURE_ATTR, previousCaptureAttr)
    }
  }
}

/**
 * Convert a base64 PNG image directly to ESC/POS buffer for re-printing.
 */
export async function renderBase64ToPrintBuffer(base64Image: string): Promise<RenderToPrintResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        // Create canvas from image
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)

        // Get pixel data and dither to 1-bit
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const mono = ditherImage(imageData, 'floyd-steinberg')

        // Build ESC/POS buffer
        const buffer = buildEscPosBuffer(mono, canvas.width, canvas.height)

        // Return both buffer and the original base64 image
        resolve({ buffer, imageBase64: base64Image })
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = base64Image
  })
}

function toGrayscaleFloat(imageData: ImageData): Float32Array {
  const { data } = imageData
  const gray = new Float32Array(imageData.width * imageData.height)
  for (let i = 0; i < gray.length; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b
  }
  return gray
}

function ditherImage(imageData: ImageData, method: DitherMethod): Uint8Array {
  switch (method) {
    case 'threshold':
      return ditherThreshold(imageData)
    case 'ordered':
      return ditherOrdered(imageData)
    case 'atkinson':
      return ditherAtkinson(imageData)
    case 'floyd-steinberg':
    default:
      return ditherFloydSteinberg(imageData)
  }
}

function ditherThreshold(imageData: ImageData): Uint8Array {
  const gray = toGrayscaleFloat(imageData)
  const result = new Uint8Array(gray.length)
  for (let i = 0; i < gray.length; i++) {
    result[i] = gray[i] < 128 ? 1 : 0
  }
  return result
}

function ditherOrdered(imageData: ImageData): Uint8Array {
  const { width, height } = imageData
  const gray = toGrayscaleFloat(imageData)
  const result = new Uint8Array(gray.length)
  const bayer4x4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const threshold = (bayer4x4[y % 4][x % 4] + 0.5) * (255 / 16)
      result[idx] = gray[idx] < threshold ? 1 : 0
    }
  }

  return result
}

function ditherAtkinson(imageData: ImageData): Uint8Array {
  const { width, height } = imageData
  const gray = toGrayscaleFloat(imageData)
  const result = new Uint8Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const oldPixel = gray[idx]
      const newPixel = oldPixel < 128 ? 0 : 255
      result[idx] = newPixel === 0 ? 1 : 0
      const error = (oldPixel - newPixel) / 8

      if (x + 1 < width) gray[idx + 1] += error
      if (x + 2 < width) gray[idx + 2] += error
      if (y + 1 < height) {
        if (x - 1 >= 0) gray[(y + 1) * width + (x - 1)] += error
        gray[(y + 1) * width + x] += error
        if (x + 1 < width) gray[(y + 1) * width + (x + 1)] += error
      }
      if (y + 2 < height) {
        gray[(y + 2) * width + x] += error
      }
    }
  }

  return result
}

/**
 * Floyd-Steinberg dithering: converts RGBA ImageData to a 1-bit array.
 * Returns a flat array where each value is 0 (white) or 1 (black).
 */
function ditherFloydSteinberg(imageData: ImageData): Uint8Array {
  const { width, height } = imageData
  const gray = toGrayscaleFloat(imageData)

  const result = new Uint8Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const oldPixel = gray[idx]
      const newPixel = oldPixel < 128 ? 0 : 255
      result[idx] = newPixel === 0 ? 1 : 0 // 1 = black dot, 0 = white
      const error = oldPixel - newPixel

      if (x + 1 < width) gray[idx + 1] += error * 7 / 16
      if (y + 1 < height) {
        if (x - 1 >= 0) gray[(y + 1) * width + (x - 1)] += error * 3 / 16
        gray[(y + 1) * width + x] += error * 5 / 16
        if (x + 1 < width) gray[(y + 1) * width + (x + 1)] += error * 1 / 16
      }
    }
  }

  return result
}

/**
 * Build an ESC/POS binary buffer using GS v 0 (raster bit image).
 *
 * Command format: GS v 0 m xL xH yL yH [data]
 *   - m = 0 (normal mode)
 *   - xL/xH = bytes per line (width / 8) as little-endian 16-bit
 *   - yL/yH = number of lines as little-endian 16-bit
 *   - data = packed 1-bit pixels, MSB first, 1 = black
 */
function buildEscPosBuffer(mono: Uint8Array, width: number, height: number): Uint8Array {
  const bytesPerLine = Math.ceil(width / 8)
  const chunkHeight = 48

  // Pack 1-bit pixels into bytes (MSB = leftmost pixel)
  const bitmapData = new Uint8Array(bytesPerLine * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mono[y * width + x]) {
        const byteIdx = y * bytesPerLine + Math.floor(x / 8)
        const bitIdx = 7 - (x % 8)
        bitmapData[byteIdx] |= (1 << bitIdx)
      }
    }
  }

  // ESC @ — initialize printer
  const init = new Uint8Array([0x1B, 0x40])

  // Many thermal printers are more stable when raster data is sent in smaller vertical chunks.
  const chunks: Uint8Array[] = []
  for (let startY = 0; startY < height; startY += chunkHeight) {
    const thisChunkHeight = Math.min(chunkHeight, height - startY)
    const gsv0 = new Uint8Array([
      0x1D, 0x76, 0x30, // GS v 0
      0x00, // m = 0 (normal)
      bytesPerLine & 0xFF,
      (bytesPerLine >> 8) & 0xFF,
      thisChunkHeight & 0xFF,
      (thisChunkHeight >> 8) & 0xFF,
    ])

    const chunkBytes = new Uint8Array(bytesPerLine * thisChunkHeight)
    const from = startY * bytesPerLine
    const to = from + chunkBytes.length
    chunkBytes.set(bitmapData.subarray(from, to))

    chunks.push(gsv0, chunkBytes)
  }

  // Feed + partial cut
  const feed = new Uint8Array([0x1B, 0x64, 0x04]) // ESC d 4 — feed 4 lines
  const cut = new Uint8Array([0x1D, 0x56, 0x42, 0x00]) // GS V B 0 — partial cut

  // Concatenate all parts
  const chunkTotal = chunks.reduce((sum, part) => sum + part.length, 0)
  const total = init.length + chunkTotal + feed.length + cut.length
  const buffer = new Uint8Array(total)
  let offset = 0
  for (const part of [init, ...chunks, feed, cut]) {
    buffer.set(part, offset)
    offset += part.length
  }

  return buffer
}

/**
 * Convert the print buffer to a base64 string for sending via Supabase.
 */
export function bufferToBase64(buffer: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  return btoa(binary)
}
