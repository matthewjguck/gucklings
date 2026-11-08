interface BlockToolbarProps {
  onAddText: () => void
  onAddImage: () => void
  onAddSticker: () => void
}

export default function BlockToolbar({ onAddText, onAddImage, onAddSticker }: BlockToolbarProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <button
        onClick={onAddText}
        className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 3h10M8 3v10M5 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Text
      </button>
      <button
        onClick={onAddImage}
        className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
          <path d="M2 11l3.5-3.5L8 10l2-2 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        Image
      </button>
      <button
        onClick={onAddSticker}
        className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1l2 4.5H15l-3.5 3 1.5 5L8 10.5 3 13.5l1.5-5L1 5.5h5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        Sticker
      </button>
    </div>
  )
}
