import { useRef, useState, useEffect } from 'react'
import type { ImageAdjustments } from '@/lib/imageProcessing'
import { DEFAULT_ADJUSTMENTS, applyImageAdjustments } from '@/lib/imageProcessing'

// Compress a file to a JPEG data URL with the longest edge clamped to maxEdge.
// Keeps localStorage drafts and edge-function bodies within reasonable size.
async function compressToDataUrl(file: File, maxEdge = 1200, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const ratio = Math.min(1, maxEdge / Math.max(img.width, img.height))
    const w = Math.round(img.width * ratio)
    const h = Math.round(img.height * ratio)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

interface ImageBlockProps {
  dataUrl: string
  adjustments?: ImageAdjustments
  isActive: boolean
  onImageChange: (dataUrl: string) => void
  onFocus: () => void
  onDelete: () => void
}

export default function ImageBlock({
  dataUrl,
  adjustments = DEFAULT_ADJUSTMENTS,
  isActive,
  onImageChange,
  onFocus,
  onDelete,
}: ImageBlockProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [displayUrl, setDisplayUrl] = useState(dataUrl)

  useEffect(() => {
    if (!dataUrl) return
    const apply = async () => {
      const url = await applyImageAdjustments(dataUrl, adjustments)
      setDisplayUrl(url)
    }
    apply()
  }, [dataUrl, adjustments])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    compressToDataUrl(file, 1200, 0.82).then(onImageChange).catch((err) => {
      console.warn('Image compression failed, falling back to raw read:', err)
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') onImageChange(reader.result)
      }
      reader.readAsDataURL(file)
    })
  }

  if (!dataUrl) {
    return (
      <button
        onClick={() => {
          onFocus()
          inputRef.current?.click()
        }}
        className="w-full py-8 border-2 border-dashed border-gray-300 rounded flex flex-col items-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <span className="text-sm" style={{ fontFamily: 'var(--font-printvetica), Inter, sans-serif' }}>Add Photo</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </button>
    )
  }

  return (
    <div
      className={`group relative ${isActive ? 'ring-1 ring-fill-tertiary ring-offset-1 rounded' : ''}`}
      onClick={onFocus}
    >
      {displayUrl && (
        <img
          src={displayUrl}
          alt=""
          className="w-full h-auto rounded"
        />
      )}
      {isActive && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow"
          aria-label="Delete block"
        >
          &times;
        </button>
      )}
    </div>
  )
}
