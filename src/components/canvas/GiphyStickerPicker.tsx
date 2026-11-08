import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { searchGiphyStickers, ditherStickerImage } from '@/lib/giphy'
import type { CornerSticker } from '@/types/canvas'

interface GiphyStickerPickerProps {
  onSelect: (sticker: CornerSticker) => void
  onClose: () => void
}

export default function GiphyStickerPicker({ onSelect, onClose }: GiphyStickerPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CornerSticker[]>([])
  const [loading, setLoading] = useState(false)
  const [ditherLoading, setDitherLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const stickers = await searchGiphyStickers(searchQuery)
      setResults(stickers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => handleSearch(newQuery), 400)
  }

  const handleSelectSticker = async (sticker: CornerSticker) => {
    setDitherLoading(sticker.id)
    try {
      try {
        const dithered = await ditherStickerImage(sticker.fullUrl)
        onSelect({ ...sticker, ditheredDataUrl: dithered })
      } catch (ditherErr) {
        console.warn('Dithering failed, using original URL:', ditherErr)
        // Fall back to using the original URL if dithering fails
        onSelect(sticker)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select sticker')
    } finally {
      setDitherLoading(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm p-6 shadow-xl border border-fill-tertiary bg-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Search for a sticker</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1 w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder="e.g. 'happy', 'celebration', 'star'..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fill-primary mb-3"
          autoFocus
        />

        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

        {loading && <p className="text-xs text-gray-500 text-center py-4">Searching...</p>}

        {results.length === 0 && !loading && query && !error && (
          <p className="text-xs text-gray-500 text-center py-4">No results found</p>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
            {results.map(sticker => (
              <button
                key={sticker.id}
                onClick={() => handleSelectSticker(sticker)}
                disabled={ditherLoading === sticker.id}
                className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {ditherLoading === sticker.id ? (
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-fill-primary rounded-full animate-spin" />
                ) : (
                  <img
                    src={sticker.previewUrl}
                    alt=""
                    className="w-12 h-12 object-contain"
                    style={{ filter: 'grayscale(100%)' }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {!query && (
          <>
            <p className="text-xs text-gray-400 text-center py-4 italic">
              Try searching for stickers like 'heart', 'star', 'gift', etc.
            </p>
            <p className="text-xs text-gray-400 text-center py-2 italic">
              Powered by GIPHY
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
