import type { CornerSticker } from '@/types/canvas'
import { applyImageAdjustments } from '@/lib/imageProcessing'

const API_KEY = import.meta.env.VITE_GIPHY_API_KEY

if (!API_KEY) {
  console.warn('VITE_GIPHY_API_KEY is not set. GIPHY sticker search will not work.')
}

interface GiphySearchResponse {
  data: Array<{
    id: string
    images: {
      fixed_height_still?: { url: string }
      original_still?: { url: string }
    }
  }>
}

export async function searchGiphyStickers(query: string, limit = 20): Promise<CornerSticker[]> {
  if (!API_KEY) {
    throw new Error('GIPHY API key not configured')
  }

  const url = new URL('https://api.giphy.com/v1/stickers/search')
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', limit.toString())
  url.searchParams.set('rating', 'g')

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`GIPHY API error: ${response.statusText}`)
  }

  const data: GiphySearchResponse = await response.json()
  return data.data.map(item => ({
    id: item.id,
    previewUrl: item.images.fixed_height_still?.url || '',
    fullUrl: item.images.original_still?.url || '',
  }))
}

export async function ditherStickerImage(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')

      try {
        const dithered = await applyImageAdjustments(dataUrl, {
          brightness: 0,
          contrast: 0,
          dithering: 'floyd-steinberg',
          thresholdValue: 128,
          orderedScale: 1,
          fsStrength: 1,
        })
        resolve(dithered)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageUrl
  })
}
