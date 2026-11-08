interface StickerBlockProps {
  previewUrl: string
  fullUrl: string
  ditheredDataUrl?: string
  isActive: boolean
  onFocus: () => void
  onDelete: () => void
}

export default function StickerBlock({
  previewUrl,
  ditheredDataUrl,
  isActive,
  onFocus,
  onDelete,
}: StickerBlockProps) {
  return (
    <div
      className={`group relative w-full py-2 ${isActive ? 'ring-1 ring-fill-tertiary ring-offset-1 rounded-md' : ''}`}
      onClick={onFocus}
    >
      <img
        src={ditheredDataUrl ?? previewUrl}
        alt="Sticker"
        style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
      />

      {isActive && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute -right-3 -top-3 w-6 h-6 rounded-md bg-red-500 text-white text-xs flex items-center justify-center shadow"
          aria-label="Delete block"
        >
          &times;
        </button>
      )}
    </div>
  )
}
