export interface ImageAdjustments {
  brightness: number // -100 to 100
  contrast: number // -100 to 100
  dithering: 'floyd-steinberg' | 'ordered' | 'threshold'
  // Dithering parameters
  thresholdValue: number // 0-255, default 128
  orderedScale: number // 0.5-2.0, affects pattern intensity
  fsStrength: number // 0.5-1.5, affects error diffusion
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  dithering: 'floyd-steinberg',
  thresholdValue: 128,
  orderedScale: 1.0,
  fsStrength: 1.0,
}

export async function applyImageAdjustments(
  dataUrl: string,
  adjustments: ImageAdjustments
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Draw with adjustments and grayscale
      ctx.filter = buildFilter(adjustments)
      ctx.drawImage(img, 0, 0)

      // Always apply dithering to convert to black and white
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      applyDithering(imageData, adjustments.dithering, adjustments)
      ctx.putImageData(imageData, 0, 0)

      resolve(canvas.toDataURL())
    }
    img.src = dataUrl
  })
}

function buildFilter(adjustments: ImageAdjustments): string {
  const brightness = 100 + adjustments.brightness
  const contrast = 100 + adjustments.contrast

  return `brightness(${brightness}%) contrast(${contrast}%) grayscale(100%)`
}

function applyDithering(imageData: ImageData, method: string, adjustments?: ImageAdjustments) {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  if (method === 'threshold') {
    applyThresholdDither(data, adjustments?.thresholdValue ?? 128)
  } else if (method === 'ordered') {
    applyOrderedDither(data, width, height, adjustments?.orderedScale ?? 1.0)
  } else if (method === 'floyd-steinberg') {
    applyFloydSteinbergDither(data, width, height, adjustments?.fsStrength ?? 1.0)
  }
}

function applyThresholdDither(data: Uint8ClampedArray, threshold: number = 128) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    const value = gray > threshold ? 255 : 0
    data[i] = value     // R
    data[i + 1] = value // G
    data[i + 2] = value // B
  }
}

function applyOrderedDither(data: Uint8ClampedArray, width: number, _height: number, scale: number = 1.0) {
  const bayerMatrix = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ]

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)
    const matrixVal = bayerMatrix[y % 4][x % 4] / 16

    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    const threshold = 128 + ((matrixVal - 0.5) * 256 * scale)
    const value = gray > threshold ? 255 : 0

    data[i] = value     // R
    data[i + 1] = value // G
    data[i + 2] = value // B
  }
}

function applyFloydSteinbergDither(data: Uint8ClampedArray, width: number, height: number, strength: number = 1.0) {
  // Convert to grayscale for dithering
  const gray = new Float32Array(width * height)
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    gray[pixelIndex] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
  }

  // Floyd-Steinberg dithering with adjustable strength
  const threshold = 128 / strength // Higher strength = lower threshold
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const oldVal = gray[idx]
      const newVal = oldVal > threshold ? 255 : 0
      const error = (oldVal - newVal) * strength

      // Apply error to neighboring pixels
      if (x + 1 < width) gray[idx + 1] += error * 0.4375
      if (y + 1 < height) {
        if (x > 0) gray[idx + width - 1] += error * 0.1875
        gray[idx + width] += error * 0.3125
        if (x + 1 < width) gray[idx + width + 1] += error * 0.0625
      }

      // Write to output
      data[idx * 4] = newVal
      data[idx * 4 + 1] = newVal
      data[idx * 4 + 2] = newVal
    }
  }
}
